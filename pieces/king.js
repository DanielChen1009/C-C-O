const Piece = require("./piece.js");

module.exports = class King extends Piece {

    name() { return "king"; }
    code() { return 6; }

    legalMoves() {
        let moves = [];
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1],
            [1, 1], [1, -1], [-1, 1], [-1, -1]
        ];
        for (let dir of dirs) {
            if (this.isValidSquare(dir[0], dir[1])) {
                moves.push(this.getMove(dir[0], dir[1]));
            }
        }

        return moves;
    }
}