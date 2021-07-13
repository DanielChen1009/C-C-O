const Piece = require("./piece.js");

module.exports = class Pawn extends Piece {

    name() { return "pawn"; }
    code() { return 1; }

    legalMoves() {
        let moves = [];
        let deltas = this.moved ? [1] : [1, 2];

        for (let delta of deltas) {
            let piece = this.getPiece(-delta * this.color(), 0);
            if (this.isValidSquare(-delta * this.color(), 0) && !this.isEnemy(piece))
                moves.push(this.getMove(-delta * this.color(), 0));
            else break;
        }

        deltas = [1, -1];
        for (let delta of deltas) {
            let piece = this.getPiece(-1 * this.color(), delta);
            if (this.isValidSquare(-1 * this.color(), delta) && this.isEnemy(piece))
                moves.push(this.getMove(-1 * this.color(), delta));
        }

        return moves;
    }
}