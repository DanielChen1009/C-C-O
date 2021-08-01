const Piece = require("./piece");
const {WHITE, BLACK} = require("../public/constants");
const assert = require("assert");

module.exports = class Pawn extends Piece {

    constructor(color, r, c, board) {
        super(color, r, c, board);
        // Greater than 0 means this pawn is capturable en-passant.
        this.enpassantable = 0;
    }

    name() { return "pawn"; }

    legalMoves() {
        const moves = super.legalMoves();

        // Whether this pawn is at the home position.
        const atHome = this.position.row === (this.getColor() === WHITE ? 6 : 1);
        // Vertical distance to travel.
        const vdists = (this.moved || !atHome) ? [1] : [1, 2];
        // Vertical direction (up or down).
        const vdir = -1 * this.getColor();

        for (const vdist of vdists) {
            const d = vdist * vdir;
            if (this.isEmptySquare(d, 0)) {
                const move = this.createMove(d, 0);
                move.enpassantable = vdist;
                moves.push(move);
            }
            else break;
        }

        // Horizontal direction for captures (left or right).
        const hdirs = [1, -1];
        for (const hdir of hdirs) {
            // Check if diagonals have enemy pieces.
            if (this.isEnemy(this.getPiece(vdir, hdir))) {
                moves.push(this.createMove(vdir, hdir));
            }
            // Check if en passant is possible.
            if (this.isEmptySquare(vdir, hdir)) {
                const piece = this.getPiece(0, hdir);
                if (piece && piece instanceof Pawn && piece.enpassantable > 0) {
                    const move = this.createMove(vdir, hdir);
                    move.capturedPieces.set(piece.position.data(), piece);
                    moves.push(move);
                }
            }
        }

        return moves;
    }

    onApplyMove(move) {
        this.enpassantable = move.enpassantable;
    }

    onUndoMove(move) {
        this.enpassantable = 0;
    }

    onPassTurn(turn) {
        // Every turn ticks down the en passant timer.
        this.enpassantable--;
    }
}
