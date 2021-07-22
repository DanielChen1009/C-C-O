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
        this.boardOrientation = 1;
        this.progressbar = $("<div>").progressbar({value: false});
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

    // Returns the DOM element for the square at position squareID (0 - 63).
    square(squareID) {
        return $("#" + squareID);
    }

    // Returns row, col (0 - 7 each) in the grid given squareID.
    toRC(squareID) {
        return {
            r: Math.floor(squareID / 8),
            c: squareID % 8
        }
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
        this.progressbar.hide();
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

    handleClick(squareID) {
        const rc = this.toRC(squareID);
        this.socket.emit('input', {row: rc.r, col: rc.c, matchName: this.sessionMatchName});
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

        this.setBoardOrientation(state.yourColor);

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
                        revertDuration: 100,
                        stack: ".piece",
                        revert: true,
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
        if (state.selected !== undefined) {
            this.square(state.selected).append($("<div>").addClass("selected"));
            this.square(state.selected).children(".piece").first().addClass("movable");
        }
        // Draw last move arrows if necessary.
        $(".board").children(".arrow").remove();
        if (state.lastMove) {
            this.drawArrow(state.lastMove[0], state.lastMove[1]);
        }
    }

    // Flips the board vertically.
    setBoardOrientation(color) {
        if (color && this.boardOrientation !== color) {
            $(".board").each(function(elem, index) {
                var arr = $.makeArray($("tr", this).detach());
                arr.reverse();
                $(this).append(arr);
            });
            this.boardOrientation = color;
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
                        if (!ui.draggable.hasClass("movable") || !ui.draggable.hasClass("ui-draggable")) return;

                        // Only have the piece revert back to original position if the legal move
                        // highlight is not present on the square the piece got dropped onto.
                        // Otherwise, attach it to the dropped-on square.
                        const legal = square.children(".legalmove").length > 0;
                        ui.draggable.draggable("option", "revert", !legal);
                        if (legal) ui.draggable.detach().appendTo(square).css({top: 0,left: 0, position: "absolute"});
                        session.handleClick(squareID);
                    }
                })
                if ((i + j) % 2 !== 0) square.addClass("dark");
                cell.append(square);
                row.append(cell);
            }
            content.append(row);
        }

        $("#" + this.config.boardContainerId).append(this.progressbar).append(content);
    }

    // Returns the x, y position of the given element's center.
    getCenter(squareID) {
        const rc = this.toRC(squareID);
        return {
            x: (2 * rc.c + 1) * this.config.boardSize / 16,
            y: (2 * (this.boardOrientation === 1 ? rc.r : 7 - rc.r) + 1) * this.config.boardSize / 16
        };
    }

    // This draws an arrow between square IDs "from" and "to".
    drawArrow(from, to) {
        from = this.getCenter(from);
        to = this.getCenter(to);

        const canvas = $("<canvas>").addClass("arrow")
            .attr("width", this.config.boardSize)
            .attr("height", this.config.boardSize).appendTo($(".board"));
        const ctx = canvas[0].getContext('2d');

        const headlen = this.config.boardSize / 30;   // length of head in pixels.
        const arrowThickness = this.config.boardSize / 40; // Thickness of the arrow line.
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        
        // starting path of the arrow from the start square to the end square and drawing the stroke
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = "#cc0000";
        ctx.lineWidth = arrowThickness;
        ctx.stroke();

        //starting a new path from the head of the arrow to one of the sides of the point
        ctx.beginPath();
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - headlen * Math.cos(angle - Math.PI / 7),
                   to.y - headlen * Math.sin(angle - Math.PI / 7));

        //path from the side point of the arrow, to the other side point
        ctx.lineTo(to.x - headlen * Math.cos(angle + Math.PI / 7), 
                   to.y - headlen * Math.sin(angle + Math.PI / 7));

        //path from the side point back to the tip of the arrow, and then again to the opposite side point
        ctx.lineTo(to.x, to.y);
        ctx.lineTo(to.x - headlen * Math.cos(angle - Math.PI / 7),
                   to.y - headlen * Math.sin(angle - Math.PI / 7));

        //draws the paths created above
        ctx.strokeStyle = "#cc0000";
        ctx.lineWidth = arrowThickness;
        ctx.stroke();
        ctx.fillStyle = "#cc0000";
        ctx.fill();
    }
}