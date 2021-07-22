const Piece = require("./piece.js");

module.exports = class Bishop extends Piece {

    name() { return "bishop"; }
    code() { return 3; }

    legalMoves() {
        const moves = super.legalMoves();
        if (moves.length > 0) return moves;

        const dirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        return this.getStraightMoves(dirs);
    }
}