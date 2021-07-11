const Piece = require("./piece.js");

module.exports = class Rook extends Piece {
    name() {
        return "rook";
    }

    legalMoves() {
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        return this.getStraightMoves(dirs);
    }
}