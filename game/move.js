const Position = require("../game/position.js");
const assert = require("assert");

module.exports = class Move {
    constructor(pos, piece) {
        assert(pos instanceof Position, "Move ctor called with a non-Position");
        this.toPos = pos;
        this.piece = piece;
        this.fromPos = this.piece.position;
        this.capturedPieces = new Map();
        this.board = this.piece.pieceBoard;
    }

    data() {
        return this.toPos.data();
    }

    apply() {
        this.capturedPieces.set(this.toPos, this.board[this.toPos.row][this.toPos.col]);
        for (const [pos, piece] of this.capturedPieces) {
            this.board[pos.row][pos.col] = null;
        }
        this.board[this.toPos.row][this.toPos.col] = this.piece;
        this.board[this.piece.position.row][this.piece.position.col] = null;
        this.fromPos = this.piece.position.copy();
        this.piece.position = this.toPos.copy();
        this.piece.onApplyMove(this);
    }

    undo() {
        for (const [pos, piece] of this.capturedPieces) {
            this.board[pos.row][pos.col] = piece;
        }
        this.capturedPieces.delete(this.toPos);
        this.piece.position = this.fromPos.copy();
        this.board[this.piece.position.row][this.piece.position.col] = this.piece;
        this.piece.onUndoMove(this);
    }

    capturesKing() {
        let piece = this.board[this.toPos.row][this.toPos.col];
        return piece && (piece.name() === "king" && piece.getColor() !== this.piece.getColor());
    }
}
