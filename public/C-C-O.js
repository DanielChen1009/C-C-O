$(document).ready(init);

let session;
const WHITE = 1;

function init() {
    session = new Session("content");
    session.start();
}

class Session {
    constructor(contentId) {
        this.container = $("#" + contentId);
        this.socket = io();
        this.socket.on("exit match", () => {
            this.sessionMatchName = null;
        });
        this.socket.on("state", (state) => {
            console.log(state);
            this.render(state);
        });
        this.socket.on("error", (msg) => {
           let alerts = $("#alerts");
           console.log("Error: " + msg);
           let message = alerts.val() + "Error: " + msg + '\n';
           alerts.scrollTop(alerts[0].scrollHeight);
           alerts.val(message);
        });
        this.socket.on("message", (msg) => {
            let alerts = $("#alerts");
            console.log("Alert: " + msg);
            let message = alerts.val() + "Alert: " + msg + '\n';
            alerts.scrollTop(alerts[0].scrollHeight);
            alerts.val(message);
        });
        this.socket.on("matches", (matches) => this.renderMatchList(matches));
        this.socket.emit("get matches");
        this.sessionMatchName= null;
        this.initLobby();
    }

    renderMatchList(matches) {
        let table = $("#matchlist");
        table.empty();
        for (let matchName of matches) {
            let row = $("<tr>");
            let cell1 = $("<td>");
            let cell2 = $("<td>");
            let cell3 = $("<td>");
            let joinButton = $("<button>");
            joinButton.html("Join");
            joinButton.on("click", () => this.joinRoom(matchName));
            cell1.append(matchName);
            cell2.append('&nbsp;&nbsp;&nbsp;');
            cell3.append(joinButton);
            row.append(cell1);
            row.append(cell2)
            row.append(cell3)
            table.append(row);
        }
    }

    joinRoom(matchName) {
        this.socket.emit("join room", matchName);
    }

    initLobby() {
        let createButton = $("#create");
        createButton.on("click", () => this.createMatch());
    }

    createMatch() {
        let playerName = $("#playername").val();
        let matchName = $("#matchname").val();
        this.socket.emit("new match", {playerName: playerName, matchName: matchName});
        this.sessionMatchName = matchName;
    }

    start() {
        this.buildBoard();
        this.buildTextArea();
    }

    handleClick(id) {
        let r = Math.floor(id / 8);
        let c = id % 8;

        this.socket.emit('input', {row: r, col: c, matchName: this.sessionMatchName});
    }

    toID(pos) {
        return pos.row * 8 + pos.col;
    }

    render(state) {
        if (state.matchName) this.sessionMatchName = state.matchName;
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                let squareID = i * 8 + j;
                let piece = state.board[i][j];
                let square = $("#" + squareID);
                square.removeClass();
                square.addClass("square");
                if ((i + j) % 2 !== 0) square.addClass("dark");
                if (!piece) continue;
                square.addClass("piece");
                square.addClass(piece.name + (piece.color === WHITE ? "white" : "black"));
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

    buildTextArea() {
        let alerts = $("<textarea>");
        alerts.attr("id", "alerts");
        alerts.addClass("mytextarea");
        $("#textarea").append(alerts);
    }

    buildBoard() {
        let content = $("<table>");
        content.addClass("board");
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

        this.container.append(content);
    }
}