const Position = require("./position.js");
const { WHITE, BLACK } = require("./constants.js");
const assert = require("assert");

module.exports = class Move {
    constructor(pos, piece) {
        assert(pos instanceof Position,
            "Move ctor called with a non-Position");
        this.toPos = pos;
        this.piece = piece;
        this.fromPos = this.piece.position;
        // Positions between fromPos and toPos the piece moves through.
        this.checkpoints = []; 
        this.board = this.piece.pieceBoard;

        this.capturedPieces = new Map(); // (r,c) => Piece
        this.capturedPieces.set(this.toPos,
            this.board[this.toPos.row][this.toPos.col]);
        this.flippedPieces = []; // Flipped pieces in Othello.

        this.childMove = null; // A child move to this move.
        this.checkOthelloFlips();
    }

    data() {
        return this.toPos.data();
    }

    // Returns the whole sequence of positions including checkpoints.
    allPos() {
        return [this.fromPos].concat(this.checkpoints).concat([this.toPos]);
    }

    apply() {
        for (const [pos, piece] of this.capturedPieces) {
            this.board[pos.row][pos.col] = null;
        }
        for (const piece of this.flippedPieces) {
            piece.color = this.piece.getColor();
        }
        if (this.childMove) this.childMove.apply();
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
        for (const piece of this.flippedPieces) {
            piece.color = piece.getColor() === WHITE ? BLACK : WHITE;
        }
        if (this.childMove) this.childMove.undo();
        this.piece.position = this.fromPos.copy();
        this.board[this.piece.position.row][this.piece.position.col] =
            this.piece;
        this.piece.onUndoMove(this);
    }

    capturesKing() {
        for (const [pos, piece] of this.capturedPieces) {
            if (piece && (piece.name() === "king" && piece .getColor()
                !== this.piece.getColor())) {
                return true;
            }
        }
        return false;
    }

    // Checks for and performs othello flips that would be caused by this move.
    checkOthelloFlips() {
        const dirs = [
            [1, 0], [-1, 0], [0, 1], [0, -1],
            [1, 1], [1, -1], [-1, 1], [-1, -1]
        ];
        for (const dir of dirs) {
            let newPos = this.toPos;
            const flips = [];
            while (true) {
                newPos = newPos.add(dir[0], dir[1]);
                if (newPos.outOfBound()) break;
                const piece = this.board[newPos.row][newPos.col];
                if (!piece) break;
                if (piece.isEnemy(this.piece)) flips.push(piece);
                else {
                    for (const flip of flips) {
                        this.flippedPieces.push(flip);
                    }
                    break;
                }
            }
        }
    }
}