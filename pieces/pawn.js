const Piece = require("./piece.js");
const assert = require("assert");

module.exports = class Pawn extends Piece {

    name() { return "pawn"; }
    code() { return 1; }

    legalMoves() {
        let moves = [];
        let deltas = this.moved ? [1] : [1, 2];

        for (let delta of deltas) {
            let piece = this.getPiece(-delta * this.getColor(), 0);
            if (this.isValidSquare(-delta * this.getColor(), 0) && !this.isEnemy(piece))
                moves.push(this.getMove(-delta * this.getColor(), 0));
            else break;
        }

        deltas = [1, -1];
        for (let delta of deltas) {
            let piece = this.getPiece(-1 * this.getColor(), delta);
            if (this.isValidSquare(-1 * this.getColor(), delta) && this.isEnemy(piece)) {
                let move = this.getMove(-1 * this.getColor(), delta);
                const capturedPiece = this.getPiece(-1 * this.getColor(), delta);
                assert(capturedPiece, "capturedPiece is null");
                move.capturedPieces.push(capturedPiece);
                moves.push(move);
            }
        }

        for (let move of this.checkCheckers(this.position.row, this.position.col)) {
            moves.push(move);
        }

        return moves;
    }
}