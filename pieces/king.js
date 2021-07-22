const Piece = require("./piece.js");

module.exports = class King extends Piece {

    name() { return "king"; }
    code() { return 6; }

    legalMoves() {
        const moves = [];
        const dirs = [
            [1, 0], [-1, 0], [0, 1], [0, -1],
            [1, 1], [1, -1], [-1, 1], [-1, -1]
        ];
        for (const [dR, dC] of dirs) {
            if (this.isEmptySquare(dR, dC) || this.isEnemy(this.getPiece(dR, dC))) {
                moves.push(this.createMove(dR, dC));
            }
        }

        return moves;
    }
}
