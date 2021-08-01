const Piece = require("./piece");

module.exports = class Bishop extends Piece {

    name() { return "bishop"; }

    legalMoves() {
        const moves = super.legalMoves();
        const dirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        return moves.concat(this.getStraightMoves(dirs));
    }
}