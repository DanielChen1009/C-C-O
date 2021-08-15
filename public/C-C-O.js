// Sessions is a global object that knows everything about the current user
// session including Socket.IO connection, UI events, and DOM management.
class Session {
    constructor(config) {
        this.shared = window.shared;
        this.config = config;
        this.sessionMatchName = null;
        this.playerName = null;
        this.socket = io(this.config.backend);
        this.socket.on("connect", () => this.initSocketHandlers());
        this.socketInitialized = false;

        // Create the DOM structure for the game board and other supporting
        // widgets.
        this.boardOrientation = 1;
        this.promotionDialog = $("<div>");
        this.showingPromotionDialog = false;
        this.progressbar = $("<div>").progressbar({ value: false });
        this.buildBoard();
    }

    // Sets up all socket.io event handlers.
    initSocketHandlers() {
        if (this.socketInitialized) return;

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
            this.showEvent("Host " + name +
                " disconnected from the match", "Info");
            this.sessionMatchName = null;
        });
        this.socket.on("guest disconnected", (name) => {
            this.showEvent("Guest " + name +
                " disconnected from the match", "Info");
            this.sessionMatchName = null;
        });
        this.socket.on("matches", (matches) => this.renderMatchList(matches));
        this.socket.emit("get matches");
        this.socket.emit("get personal game state");
        this.socket.emit("get player info");

        // Show a nice welcome message.
        this.showEvent("Welcome to C-C-O! Play against yourself or " + 
            "create/join matches against others above.");
        this.initButtonHandlers();

        this.socketInitialized = true;
    }

    // Sets up all button events.
    initButtonHandlers() {
        $("#creatematch")
            .on("click", "#createbutton", () => this.createMatch());
        $("#playerinfo")
            .on("click", "#updatename", () => {
                this.socket.emit("update name", $("#playername").val());
            });
    }

    // Returns the DOM element for the square at position squareID (0 - 63).
    square(squareID) {
        return $("#" + squareID);
    }

    // Shows one entry in the event log.
    showEvent(msg, prefix) {
        let eventLog = $("#event-log");
        let message = eventLog.val() + (prefix ? (prefix + ": ") : "") +
            msg + '\n';
        eventLog.scrollTop(eventLog[0].scrollHeight);
        eventLog.val(message);
    }

    // Shows a title string on the top of the board.
    showBoardTitle(msg) {
        $("#boardtitle").text(msg);
    }

    // Shows a status string at the bottom of the board.
    showStatus(msg) {
        $("#status").text(msg);
    }

    // Renders the match list in the lobby based on server-sent data.
    renderMatchList(matches) {
        this.progressbar.hide();
        let table = $("#matchlist");
        table.empty();

        let tableHead = $("<thead>");
        let row = $("<tr>").append($("<th>").text("Match Name"))
            .append($("<th>").text("Match Host"))
            .append($("<th>").text("Action"));
        tableHead.append(row);
        table.append(tableHead);

        let tableBody = $("<tbody>");
        if (matches.length === 0) {
            let row = $("<tr>")
                .append($("<td>")
                    .append($("p"))
                    .text("No matches available. Create one!")
                    .attr("colspan", 3)
                    .addClass("text-info")
                    .addClass("text-center"));
            tableBody.append(row);
        }
        for (let match of matches) {
            let row = $("<tr>");
            let cell1 = $("<td>");
            let cell2 = $("<td>");
            let cell3 = $("<td>");
            let actionButton = $("<button>")
                .addClass("btn").addClass("btn-primary");;
            if (match.host === this.playerName || match.guest === this
                .playerName) {
                actionButton.html("Leave");
                actionButton.on("click", () => this.leaveMatch());
            } else {
                actionButton.html("Join");
                actionButton.on("click", () => this.joinMatch(match.name));
                if (this.sessionMatchName) {
                    actionButton.prop("disabled", true);
                }
            }
            cell1.append($("<p>")
                .addClass("text-info")
                .addClass("text-center")
                .text(match.name));
            cell2.append($("<p>")
                .addClass("text-info")
                .addClass("text-center")
                .text(match.host));
            cell3.append(actionButton);
            row.append(cell1)
                .append(cell2)
                .append(cell3);
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
        const rc = this.shared.rowcol(squareID);
        this.socket.emit('input', { row: rc.row, col: rc.col, matchName: this
                .sessionMatchName });
    }

    // Returns the CSS width and height values that pieces should use.
    getSquareSize() {
        return this.config.boardSize / 8;
    }

    // Returns the CSS background-size value that pieces should use.
    getBackgroundSize() {
        return (this.config.boardSize * 0.75) + "px " + (this.config
            .boardSize * 0.25) + "px";
    }

    // Renders pieces and other misc state onto the board.
    renderMatchState(state) {
        if (state.matchName !== undefined) this.sessionMatchName = state.matchName;

        let singlePlayer = false;
        if (state.hostName === state.guestName) {
            this.showBoardTitle("Play yourself here or join match");
            this.showStatus("Single player mode. You play both sides.");
            singlePlayer = true;
        }
        else if (state.hostName === this.playerName && !state.guestName) {
            this.showBoardTitle("Waiting for opponent");
        }
        else {
            this.showBoardTitle(state.hostName + " vs " + state.guestName);
        }

        if (state.result !== undefined) {
            const winMsg = state.result === state.yourColor ? "win" : "lose";
            this.showEvent(state.resultReason, "You " + winMsg);
            this.showStatus("The game is over! You " + winMsg + ": " + state.resultReason + ". "
                + (singlePlayer ? "Click board to restart." : "Press Leave on right to leave match."));
        }
        else if (!singlePlayer) {
            if (state.yourColor !== state.turn) {
                this.showStatus("Waiting for opponent to move.");
            } else {
                this.showStatus("It is your turn to move.");
            }
        }

        this.setBoardOrientation(state.yourColor);

        if (state.board) {
            for (let i = 0; i < 8; i++) {
                for (let j = 0; j < 8; j++) {
                    const squareID = this.shared.index(i, j);
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
                    piece.addClass(this.shared.getPieceName(pieceData[0]) + this.shared
                        .getColorName(pieceData[1]));
                    // Scale the sprite sheet according to our board size.
                    piece.css("background-size", this.getBackgroundSize());
                }
            }
        }
        // Clear any previous highlights. New ones will be created as needed right after.
        for (let i = 0; i < 64; i++) {
            this.square(i).children(".legalmove").remove();
            this.square(i).children(".selected").remove();
            this.square(i).children(".ttt").remove();
        }
        if (state.tttCenter) {
            const rc = this.shared.rowcol(state.tttCenter);
            for (let r = -1; r <= 1; r++) {
                for (let c = -1; c <= 1; c++) {
                    const squareID = this.shared.index(rc.row + r, rc.col + c);
                    this.square(squareID).append($("<div>").addClass("ttt"));
                }
            }
        }
        if (state.legalMoves) {
            for (let move of state.legalMoves) {
                this.square(move).append($("<div>").addClass("legalmove"));
            }
        }
        if (state.selected !== undefined) {
            this.square(state.selected).append($("<div>").addClass("selected"));
            this.square(state.selected).children(".piece").first()
                .addClass("movable");
        }
        // Draw last move arrows if necessary.
        $(".board").children(".arrow").remove();
        if (state.lastMove) {
            for (let i = 0; i < state.lastMove.length - 1; ++i) {
                this.drawArrow(state.lastMove[i], state.lastMove[i + 1]);
            }
        }
        if (state.promotion !== undefined) {
            this.showPromotionDialog(state.promotion, state.yourColor);
        } else if (this.showingPromotionDialog) {
            this.promotionDialog.dialog("close");
            this.showingPromotionDialog = false;
        }
    }

    // Flips the board vertically.
    setBoardOrientation(color) {
        if (color && this.boardOrientation !== color) {
            $(".board").each(function(elem, index) {
                    const rows = $.makeArray($(this).children("tr").detach());
                    rows.reverse();
                    for (const row of rows) {
                        const cols = $.makeArray($(row).children("td").detach());
                        cols.reverse();
                        $(row).append(cols);
                    }
                    $(this).append(rows);
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
        $(".fixed").width(this.config.boardSize);
        for (let i = 0; i < 8; i++) {
            let row = $("<tr>");
            for (let j = 0; j < 8; j++) {
                const squareID = this.shared.index(i, j);
                const cell = $("<td>");
                const square = $("<div>").addClass("square").attr("id",
                    squareID);
                square.on("click", () => session.handleClick(squareID));
                // Each square is a JQuery UI "droppable" which are legal
                // targets for pieces which are "draggable" onto them.
                square.droppable({
                    hoverClass: "hover",
                    drop: (event, ui) => {
                        if (!ui.draggable.hasClass("movable") ||
                            !ui.draggable.hasClass("ui-draggable")) return;

                        // Only have the piece revert back to original position
                        // if the legal move highlight is not present on the
                        // square the piece got dropped onto. Otherwise, attach
                        // it to the dropped-on square.
                        const legal = square.children(".legalmove").length > 0;
                        ui.draggable.draggable("option", "revert", !legal);
                        if (legal) ui.draggable.detach()
                            .appendTo(square)
                            .css({ top: 0, left: 0, position: "absolute" });
                        session.handleClick(squareID);
                    }
                })
                if ((i + j) % 2 !== 0) square.addClass("dark");
                cell.append(square);
                row.append(cell);
            }
            content.append(row);
        }

        $("#" + this.config.boardContainerId).empty().append(this.progressbar)
            .append(content);
    }

    // Returns the x, y position of the given element's center.
    getCenter(squareID) {
        const rc = this.shared.rowcol(squareID);
        return {
            x: (2 * rc.col + 1) * this.config.boardSize / 16,
            y: (2 * (this.boardOrientation === 1 ? rc.row : 7 - rc.row) + 1) *
                this.config.boardSize / 16
        };
    }

    // Returns the vertically mirrored square id to the given one.
    mirror(squareId) {
        const rc = this.shared.rowcol(squareId);
        return this.shared.index(rc.row, 7 - rc.col);
    }

    // This draws an arrow between square IDs "from" and "to".
    drawArrow(from, to) {
        if (this.boardOrientation === this.shared.BLACK) {
            from = this.mirror(from);
            to = this.mirror(to);
        }
        from = this.getCenter(from);
        to = this.getCenter(to);

        const canvas = $("<canvas>").addClass("arrow")
            .attr("width", this.config.boardSize)
            .attr("height", this.config.boardSize).appendTo($(".board"));
        const ctx = canvas[0].getContext('2d');

        const headlen = this.config.boardSize / 30; // length of head in pixels.
        const arrowThickness = this.config.boardSize / 40; // Arrow thickness.
        const angle = Math.atan2(to.y - from.y, to.x - from.x);

        // Starting path of the arrow from the start square to the end square
        // and drawing the stroke
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = "#cc0000";
        ctx.lineWidth = arrowThickness;
        ctx.stroke();

        // Starting a new path from the head of the arrow to one of the sides of
        // the point
        ctx.beginPath();
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - headlen * Math.cos(angle - Math.PI / 7),
            to.y - headlen * Math.sin(angle - Math.PI / 7));

        // Path from the side point of the arrow, to the other side point
        ctx.lineTo(to.x - headlen * Math.cos(angle + Math.PI / 7),
            to.y - headlen * Math.sin(angle + Math.PI / 7));

        // Path from the side point back to the tip of the arrow, and then again
        // to the opposite side point
        ctx.lineTo(to.x, to.y);
        ctx.lineTo(to.x - headlen * Math.cos(angle - Math.PI / 7),
            to.y - headlen * Math.sin(angle - Math.PI / 7));

        // Draws the paths created above
        ctx.strokeStyle = "#cc0000";
        ctx.lineWidth = arrowThickness;
        ctx.stroke();
        ctx.fillStyle = "#cc0000";
        ctx.fill();
    }

    // Shows the promotion dialog that allows user to pick a piece to promote to
    showPromotionDialog(squareID, color) {
        this.promotionDialog.empty();
        const pieceNames = ["queen", "rook", "bishop", "knight"];
        const rc = this.shared.rowcol(squareID);
        for (const pieceName of pieceNames) {
            const piece = $("<div>")
                .addClass("piece " + pieceName + this.shared.getColorName(color));
            piece.on("click", () => {
                this.socket.emit('input', { row: rc.row, col: rc.col,
                    choice: pieceName, matchName: this.sessionMatchName });
                this.promotionDialog.dialog("close");
                this.showingPromotionDialog = false;
            });
            piece.width(this.getSquareSize());
            piece.height(this.getSquareSize());
            piece.css("background-size", this.getBackgroundSize());
            piece.css("position", "static");
            piece.css("display", "inline-block");
            this.promotionDialog.append(piece);
        }
        this.promotionDialog.dialog({
            dialogClass: "promotion",
            height: this.getSquareSize() * 1.3,
            width: this.getSquareSize() * 4.2,
            position: { my: "center", at: "center", of: this.square(squareID) },
        });
        this.showingPromotionDialog = true;
    }
}