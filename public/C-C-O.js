const WHITE = 1;

class Session {
    constructor(config) {
        this.config = config;
        this.sessionMatchName = null;
        this.playerName = null;
        this.socket = io(this.config.backend);

        // Set up all button events.
        $("#creatematch").on("click", "#createbutton", () => this.createMatch());
        $("#playerinfo").on("click", "#updatename", () => {
            this.socket.emit("update name", $("#playername").val());
        });

        // Set up all socket.io event handlers.
        this.socket.on("exit match", () => {
            this.showEvent("Exited match " + this.sessionMatchName, "Info");
            this.sessionMatchName = null;
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

        // Create the DOM structure for the game board.
        this.buildBoard();

        // Show a nice welcome message.
        this.showEvent("Welcome to C-C-O! Play against yourself or create/join matches against others above.");
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
            let joinButton = $("<button>");
            if (match.host === this.playerName) {
                joinButton.html("Waiting");
                joinButton.prop("disabled", true);
            } else {
                joinButton.html("Join");
                if (this.sessionMatchName) {
                    joinButton.prop("disabled", true);
                }
            }
            joinButton.addClass("btn").addClass("btn-primary");
            joinButton.on("click", () => this.joinMatch(match.name));
            cell1.append($("<p>").addClass("text-info").addClass("text-center").text(match.name));
            cell2.append($("<p>").addClass("text-info").addClass("text-center").text(match.host));
            cell3.append(joinButton);
            row.append(cell1).append(cell2).append(cell3);
            tableBody.append(row);
        }
        table.append(tableBody);
    }

    joinMatch(matchName) {
        this.socket.emit("join match", matchName);
    }

    createMatch() {
        let playerName = $("#playername").val();
        let matchName = $("#matchname").val();
        this.socket.emit("new match", {playerName: playerName, matchName: matchName});
    }

    handleClick(id) {
        let r = Math.floor(id / 8);
        let c = id % 8;

        this.socket.emit('input', {row: r, col: c, matchName: this.sessionMatchName});
    }

    toID(pos) {
        return pos.row * 8 + pos.col;
    }

    renderMatchState(state) {
        if (state.matchName) this.sessionMatchName = state.matchName;
        if (state.checkmate) this.showEvent("Checkmate!", "Game End");
        if (state.stalemate) this.showEvent("Stalemate!", "Game End");

        if (state.hostName === state.guestName) this.showBoardTitle("Play yourself here or join match");
        else if (state.hostName === this.playerName && !state.guestName)
            this.showBoardTitle("Waiting for opponent");
        else this.showBoardTitle(state.hostName + " vs " + state.guestName);

        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                let squareID = i * 8 + j;
                let piece = state.board[i][j];
                let square = $("#" + squareID);
                square.removeClass();
                square.addClass("square");
                square.width(this.config.boardSize / 8);
                square.height(this.config.boardSize / 8);
                if ((i + j) % 2 !== 0) square.addClass("dark");
                if (!piece) continue;
                square.addClass("piece");
                square.addClass(piece.name + (piece.color === WHITE ? "white" : "black"));
                // Scale the sprite sheet according to our board size.
                square.css("background-size", (this.config.boardSize * 0.75) + "px " + 
                                              (this.config.boardSize * 0.25) + "px");
            }
        }
        if (state.selected) {
            let squareID = this.toID(state.selected.position);
            let square = $("#" + squareID);
            square.addClass("select");
        }
        if (state.legalMoves) {
            let moves = state.legalMoves;
            for (let move of moves) {
                let position = move.toPos;
                let validSquare = $("#" + this.toID(position));
                validSquare.addClass("select");
            }
        }
    }

    buildBoard() {
        let content = $("<table>");
        content.addClass("board");
        content.width(this.config.boardSize);
        content.height(this.config.boardSize);
        for (let i = 0; i < 8; i++) {
            let row = $("<tr>");
            for (let j = 0; j < 8; j++) {
                let cell = $("<td>");
                let button = $("<button>");
                button.addClass("square");
                button.attr("type", "button");
                button.attr("id", i * 8 + j);
                button.on("click", () => session.handleClick(i * 8 + j));
                cell.append(button);
                row.append(cell);
            }
            content.append(row);
        }

        $("#" + this.config.boardContainerId).append(content);
    }
}