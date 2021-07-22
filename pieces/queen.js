const Piece = require("./piece.js");

module.exports = class Queen extends Piece {

    name() { return "queen"; }
    code() { return 5; }

    legalMoves() {
        const moves = super.legalMoves();
        if (moves.length > 0) return moves;

        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1],
            [1, 1], [1, -1], [-1, 1], [-1, -1]
        ];
        return this.getStraightMoves(dirs);
    }
}