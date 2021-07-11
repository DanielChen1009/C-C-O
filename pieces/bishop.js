const Piece = require("./piece.js");

module.exports = class Bishop extends Piece {
    name() {
        return "bishop";
    }


    legalMoves() {
        const dirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        return this.getStraightMoves(dirs);
    }
}