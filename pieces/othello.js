const Piece = require("./piece");

module.exports = class Othello extends Piece {

    name() { return "othello"; }

    legalMoves() {
        // Othello pieces cannot move.
        return [];
    }
}
