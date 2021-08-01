const Position = require("./position");
const { WHITE, BLACK, rowcol } = require("../public/constants");
const assert = require("assert");

module.exports = class Move {
    constructor(pos, piece) {
        assert(pos instanceof Position,
            "Move ctor called with a non-Position");
        this.toPos = pos;
        this.piece = piece;
        this.fromPos = this.piece.position.copy();
        // Positions between fromPos and toPos the piece moves through.
        this.checkpoints = []; 
        this.board = this.piece.board;

        this.capturedPieces = new Map(); // (r,c) => Piece

        const directCapture = this.board.get(this.toPos.row, this.toPos.col);
        if (directCapture && directCapture.getColor() !== this.piece.getColor()) {
            this.capturedPieces.set(this.toPos.data(), directCapture);
        }
        this.flippedPieces = []; // Flipped pieces in Othello.
        this.childMove = null; // A child move to this move.
        this.checkOthelloFlips();
    }

    // Returns serialized representation of this move, to be sent to client.
    data() {
        return this.toPos.data();
    }

    // Returns the whole sequence of positions including checkpoints.
    allPos() {
        return [this.fromPos].concat(this.checkpoints).concat([this.toPos]);
    }

    apply() {
        // Flip all flipped pieces to this piece's color.
        for (const piece of this.flippedPieces) {
            this.board.delete(piece.position.row, piece.position.col);
            piece.color = this.piece.getColor();
            this.board.set(piece.position.row, piece.position.col, piece);
        }

        // Delete all captured pieces.
        for (const [idx, piece] of this.capturedPieces) {
            assert(idx >= 0 && idx <= 63, "Invalid index: " + idx);
            const rc = rowcol(idx);
            this.board.delete(rc.row, rc.col);
        }

        // Perform child moves, if any.
        if (this.childMove) this.childMove.apply();

        // Delete this piece from the original location.
        this.board.delete(this.piece.position.row, this.piece.position.col);

        // Put this at the destination location.
        this.piece.position = this.toPos.copy();
        this.board.set(this.toPos.row, this.toPos.col, this.piece);

        // Give the piece a chance to run code after the apply is done.
        this.piece.onApplyMove(this);
    }

    undo() {
        // Delete this piece from the current location.
        this.board.delete(this.piece.position.row, this.piece.position.col);

        // Move the piece back to the original place.
        this.piece.position = this.fromPos.copy();
        this.board.set(this.piece.position.row, this.piece.position.col, this.piece);

        // Undo children moves, if any.
        if (this.childMove) this.childMove.undo();

        // Then put all captured pieces back.
        for (const [idx, piece] of this.capturedPieces) {
            const rc = rowcol(idx);
            this.board.set(rc.row, rc.col, piece);
        }

        // Un-flip all flipped pieces.
        for (const piece of this.flippedPieces) {
            this.board.delete(piece.position.row, piece.position.col);
            piece.color = this.piece.getColor() === WHITE ? BLACK : WHITE;
            this.board.set(piece.position.row, piece.position.col, piece);
        }

        // Give the piece a chance to run code after the undo is done.
        this.piece.onUndoMove(this);
    }

    // Returns whether this move captures the opponents king.
    capturesKing() {
        for (const [pos, piece] of this.capturedPieces) {
            assert(piece);
            if (piece.name() === "king" && piece.getColor() !== this.piece.getColor()) {
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
                const piece = this.board.get(newPos.row, newPos.col);
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