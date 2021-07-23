const Piece = require("./piece.js");
const Move = require("../game/move.js");

module.exports = class Knight extends Piece {

    name() { return "knight"; }
    code() { return 2; }

    legalMoves() {
        const moves = super.legalMoves();

        const deltas = [
            [2, 1], [-2, 1],
            [2, -1], [-2, -1],
            [1, 2], [-1, 2],
            [1, -2], [-1, -2]
        ]

        for (const [dR, dC] of deltas) {
            if (this.isEmptySquare(dR, dC) || this.isEnemy(this.getPiece(dR, dC))) {
                moves.push(this.createMove(dR, dC));
            }
        }

        return moves;
    }
}