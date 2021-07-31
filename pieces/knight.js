const Piece = require("./piece");
const Move = require("../game/move");

module.exports = class Knight extends Piece {

    name() { return "knight"; }

    legalMoves() {
        const moves = super.legalMoves();

        const deltas = [
            [2, 1], [-2, 1],
            [2, -1], [-2, -1],
            [1, 2], [-1, 2],
            [1, -2], [-1, -2]
        ]

        for (const [dR, dC] of deltas) {
            if (this.isEmptySquare(dR, dC) ||
                this.isEnemy(this.getPiece(dR, dC))) {
                moves.push(this.createMove(dR, dC));
            }
        }

        return moves;
    }
}