const Piece = require("./piece.js");

module.exports = class Queen extends Piece {
    name() {
        return "queen";
    }

    legalMoves() {
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1],
            [1, 1], [1, -1], [-1, 1], [-1, -1]
        ];
        return this.getStraightMoves(dirs);
    }
}