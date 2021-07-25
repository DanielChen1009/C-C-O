const Piece = require("./piece.js");

module.exports = class Rook extends Piece {

    name() { return "rook"; }
    code() { return 4; }
    isTicTacToe() { return true; }

    legalMoves() {
        const moves = super.legalMoves();
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        return moves.concat(this.getStraightMoves(dirs));
    }
}
