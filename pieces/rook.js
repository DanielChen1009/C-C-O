const Piece = require("./piece.js");

module.exports = class Rook extends Piece {

    name() { return "rook"; }
    code() { return 4; }

    legalMoves() {
        const moves = super.legalMoves();
        if (moves.length > 0) return moves;

        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        return this.getStraightMoves(dirs);
    }
}