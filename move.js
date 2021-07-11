const Position = require("./position.js");

module.exports = class Move {
    constructor(pos, piece) {
        this.toPos = pos;
        this.piece = piece;
        this.fromPos = this.piece.position;
        this.capturedPieces = null;
        this.board = this.piece.pieceBoard;
    }

    data() {
        return {
            toPos: this.toPos,
            fromPos: this.fromPos
        }
    }

    apply() {
        this.capturedPieces = [this.board[this.toPos.row][this.toPos.col]];
        this.board[this.piece.position.row][this.piece.position.col] = null;
        this.board[this.toPos.row][this.toPos.col] = this.piece;
        this.fromPos = new Position(this.piece.position.row, this.piece.position.col);
        this.piece.position = this.toPos;
    }

    undo() {
        this.board[this.toPos.row][this.toPos.col] = this.capturedPieces[0];
        this.piece.position = this.fromPos;
        this.board[this.piece.position.row][this.piece.position.col] = this.piece;
    }

    capturesKing() {
        let piece = this.board[this.toPos.row][this.toPos.col];
        return piece && (piece.name() === "king" && piece.color() !== this.piece.color());
    }
}