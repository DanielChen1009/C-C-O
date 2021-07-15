// Sessions is a global object that knows everything about the current user
// session including Socket.IO connection, UI events, and DOM management.
class Session {
    constructor(config) {
        this.config = config;
        this.sessionMatchName = null;
        this.playerName = null;
        this.socket = io(this.config.backend);
        this.socket.on("connect", () => this.initSocketHandlers());

        // Create the DOM structure for the game board.
        this.buildBoard();        
    }

    // Sets up all socket.io event handlers.
    initSocketHandlers() {
        this.socket.on("set match", (matchName) => {
            this.sessionMatchName = matchName;
        });
        this.socket.on("match state", (state) => {
            this.renderMatchState(state);
        });
        this.socket.on("error", (msg) => {
            this.showEvent(msg, "Error");
        });
        this.socket.on("message", (msg) => {
            this.showEvent(msg, "Info");
        });
        this.socket.on("player info", (name) => {
            this.playerName = name;
            $("#playername").val(this.playerName);
        });
        this.socket.on("guest joined", (name) => {
            this.showEvent("Guest " + name + " joined your match", "Info");
        });
        this.socket.on("host disconnected", (name) => {
            this.showEvent("Host " + name + " disconnected from the match", "Info");
            this.sessionMatchName = null;
        });
        this.socket.on("guest disconnected", (name) => {
            this.showEvent("Guest " + name + " disconnected from the match", "Info");
            this.sessionMatchName = null;
        });
        this.socket.on("matches", (matches) => this.renderMatchList(matches));
        this.socket.emit("get matches");
        this.socket.emit("get personal game state");
        this.socket.emit("get player info");

        // Show a nice welcome message.
        this.showEvent("Welcome to C-C-O! Play against yourself or create/join matches against others above.");
        this.initButtonHandlers();
    }

    // Sets up all button events.
    initButtonHandlers() {
        $("#creatematch").on("click", "#createbutton", () => this.createMatch());
        $("#playerinfo").on("click", "#updatename", () => {
            this.socket.emit("update name", $("#playername").val());
        });
    }

    // Returns the DOM element for the square at position pos (0 - 63).
    square(pos) {
        return $("#" + pos);
    }

    // Shows one entry in the event log.
    showEvent(msg, prefix) {
        let eventLog = $("#event-log");
        let message = eventLog.val() + (prefix ? (prefix + ": ") : "") + msg + '\n';
        eventLog.scrollTop(eventLog[0].scrollHeight);
        eventLog.val(message);
    }

    // Shows a title string on the top of the board.
    showBoardTitle(msg) {
        $("#boardtitle").text(msg);
    }

    // Renders the match list in the lobby based on server-sent data.
    renderMatchList(matches) {
        let table = $("#matchlist");
        table.empty();

        let tableHead = $("<thead>");
        let row = $("<tr>")
            .append($("<th>").text("Match Name"))
            .append($("<th>").text("Match Host"))
            .append($("<th>").text("Action"));
        tableHead.append(row);
        table.append(tableHead);

        let tableBody = $("<tbody>");
        if (matches.length === 0) {
            let row = $("<tr>").append($("<td>").append($("p"))
                .text("No matches available. Create one!").attr("colspan", 3)
                .addClass("text-info").addClass("text-center"));
            tableBody.append(row);
        }
        for (let match of matches) {
            let row = $("<tr>");
            let cell1 = $("<td>");
            let cell2 = $("<td>");
            let cell3 = $("<td>");
            let actionButton = $("<button>").addClass("btn").addClass("btn-primary");;
            if (match.host === this.playerName || match.guest === this.playerName) {
                actionButton.html("Leave");
                actionButton.on("click", () => this.leaveMatch());
            } else {
                actionButton.html("Join");
                actionButton.on("click", () => this.joinMatch(match.name));
                if (this.sessionMatchName) {
                    actionButton.prop("disabled", true);
                }
            }
            cell1.append($("<p>").addClass("text-info").addClass("text-center").text(match.name));
            cell2.append($("<p>").addClass("text-info").addClass("text-center").text(match.host));
            cell3.append(actionButton);
            row.append(cell1).append(cell2).append(cell3);
            tableBody.append(row);
        }
        table.append(tableBody);
    }

    joinMatch(matchName) {
        this.socket.emit("join match", matchName);
    }

    leaveMatch() {
        this.socket.emit("leave match");
    }

    createMatch() {
        this.socket.emit("new match", $("#matchname").val());
    }

    handleClick(id) {
        let r = Math.floor(id / 8);
        let c = id % 8;
        this.socket.emit('input', {row: r, col: c, matchName: this.sessionMatchName});
    }

    // Get the piece name given the piece code received from the server.
    getPieceName(pieceCode) {
        switch (parseInt(pieceCode)) {
            case 1: return "pawn";
            case 2: return "knight";
            case 3: return "bishop";
            case 4: return "rook";
            case 5: return "queen";
            case 6: return "king";
            default: return null;
        }
    }

    // Renders pieces and other misc state onto the board.
    renderMatchState(state) {
        if (state.matchName !== undefined) this.sessionMatchName = state.matchName;
        if (state.checkmate) this.showEvent("Checkmate!", "Game End");
        if (state.stalemate) this.showEvent("Stalemate!", "Game End");

        if (state.hostName === state.guestName) this.showBoardTitle("Play yourself here or join match");
        else if (state.hostName === this.playerName && !state.guestName)
            this.showBoardTitle("Waiting for opponent");
        else this.showBoardTitle(state.hostName + " vs " + state.guestName);

        if (state.board) {
            for (let i = 0; i < 8; i++) {
                for (let j = 0; j < 8; j++) {
                    const squareID = i * 8 + j;
                    const square = this.square(squareID);
                    square.empty();
                    square.width(this.config.boardSize / 8);
                    square.height(this.config.boardSize / 8);
                    
                    const pieceCode = state.board[i][j];
                    if (!pieceCode) continue;

                    // A piece is a semi-transparent object that sits on top
                    // of a square and has JQuery draggable features enabled.
                    const piece = $("<div>").appendTo(square);
                    piece.on("click", () => session.handleClick(squareID));
                    piece.draggable({
                        cursor: "move",
                        start: () => session.handleClick(squareID),
                        revertDuration: 50,
                        stack: ".piece",
                    });

                    // Figure out what piece it is from the server data and
                    // assign the appropriate CSS classes.
                    const pieceData = pieceCode.split(",");
                    piece.addClass("piece");
                    piece.addClass(this.getPieceName(pieceData[0]) + (pieceData[1] === "1" ? "white" : "black"));
                    // Scale the sprite sheet according to our board size.
                    piece.css("background-size", (this.config.boardSize * 0.75) + "px " + 
                                                  (this.config.boardSize * 0.25) + "px");
                }
            }
        }
        // Clear any previous highlights. New ones will be created as needed right after.
        for (let i = 0; i < 64; i++) {
            this.square(i).children(".legalmove").remove();
            this.square(i).children(".selected").remove();
        }
        if (state.legalMoves) {
            for (let move of state.legalMoves) {
                this.square(move).append($("<div>").addClass("legalmove"));
            }
        }
        if (state.selected) {
            this.square(state.selected).append($("<div>").addClass("selected"));
        }
    }

    // Builds the basic board backbone for pieces to be placed on.
    buildBoard() {
        let content = $("<table>");
        content.addClass("board");
        content.width(this.config.boardSize);
        content.height(this.config.boardSize);
        for (let i = 0; i < 8; i++) {
            let row = $("<tr>");
            for (let j = 0; j < 8; j++) {
                const squareID = i * 8 + j;
                const cell = $("<td>");
                const square = $("<div>").addClass("square").attr("id", squareID);
                square.on("click", () => session.handleClick(squareID));
                // Each square is a JQuery UI "droppable" which are legal targets for pieces which are
                // "draggable" onto them.
                square.droppable({
                    hoverClass: "hover",
                    drop: (event, ui) => {
                        // Only have the piece revert back to original position if the legal move
                        // highlight is not present on the square the piece got dropped onto.
                        // Otherwise, attach it to the dropped-on square.
                        if (ui.draggable.hasClass("ui-draggable")) {
                            const legal = square.children(".legalmove").length > 0;
                            ui.draggable.draggable("option", "revert", !legal);
                            if (legal) ui.draggable.detach().appendTo(square).css({top: 0,left: 0, position: "absolute"});
                        }
                        session.handleClick(squareID);
                    }
                })
                if ((i + j) % 2 !== 0) square.addClass("dark");
                cell.append(square);
                row.append(cell);
            }
            content.append(row);
        }

        $("#" + this.config.boardContainerId).append(content);
    }
}