const Piece = require("./piece.js");
const Move = require("../move.js");

module.exports = class Knight extends Piece {
    name() {
        return "knight";
    }

    legalMoves() {
        let moves = [];
        const deltas = [
            [2, 1],
            [-2, 1],
            [2, -1],
            [-2, -1],
            [1, 2],
            [-1, 2],
            [1, -2],
            [-1, -2]
        ]

        for (let delta of deltas) {
            if (this.isValidSquare(delta[0], delta[1])) {
                moves.push(new Move(this.position.add(delta[0], delta[1]), this));
            }
        }

        return moves;
    }
}