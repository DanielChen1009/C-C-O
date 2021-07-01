$(document).ready(init);

let session;
const WHITE = 1;
const BLACK = -1;

function init() {
    session = new Session("content");
    session.start();
}

class Session {
    constructor(contentId) {
        this.container = $("#" + contentId);
        this.socket = io();
        this.socket.on('state', (state) => {
            console.log(state);
            this.render(state);
        });
    }

    start() {
        this.buildBoard();
    }

    handleClick(id) {
        let r = Math.floor(id / 8);
        let c = id % 8;

        this.socket.emit('input', {row: r, col: c});
    }

    toID(pos) {
        return pos.row * 8 + pos.col;
    }

    render(state) {
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
                button.click(() => session.handleClick(i * 8 + j));
                cell.append(button);
                row.append(cell);
            }
            content.append(row);
        }

        this.container.append(content);
    }
}
