const Position = require("../game/position.js");
const assert = require("assert");

module.exports = class Move {
    constructor(pos, piece) {
        assert(pos instanceof Position, "Move ctor called with a non-Position");
        this.toPos = pos;
        this.piece = piece;
        this.fromPos = this.piece.position;
        this.capturedPieces = [];
        this.board = this.piece.pieceBoard;
    }

    data() {
        return this.toPos.data();
    }

    apply() {
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
        return piece && (piece.name() === "king" && piece.getColor() !== this.piece.getColor()

        );
    }
}