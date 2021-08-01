const Piece = require("./piece");

module.exports = class Queen extends Piece {

    name() { return "queen"; }
    isTicTacToe() { return true; }

    legalMoves() {
        const moves = super.legalMoves();
        const dirs = [
            [1, 0], [-1, 0], [0, 1], [0, -1],
            [1, 1], [1, -1], [-1, 1], [-1, -1]
        ];
        return moves.concat(this.getStraightMoves(dirs));
    }
}
