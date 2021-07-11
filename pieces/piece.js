const Position = require("../position.js");
const Move = require("../move.js");

module.exports = class Piece {
    constructor(color, r, c, board) {
        this.mycolor = color;
        // r is for row, c is column.
        this.position = new Position(r, c);
        this.selected = false;
        this.pieceBoard = board;
        this.moved = false;
    }

    data() {
        return {
            name: this.name(),
            position: this.position,
            color: this.mycolor,
        }
    }

    isValidSquare(dR, dC) {
        let r = this.position.row + dR;
        let c = this.position.col + dC;

        if (r > 7 || r < 0) return false;
        if (c > 7 || c < 0) return false;
        if (!this.pieceBoard[r][c]) return true;
        return this.pieceBoard[r][c].mycolor !== this.mycolor;
    }

    getPiece(dR, dC) {
        return this.pieceBoard[this.position.row + dR][this.position.col + dC];
    }

    isEnemy(piece) {
        return piece && piece.color() !== this.color();
    }

    getMove(dR, dC) {
        return new Move(this.position.add(dR, dC), this);
    }

    getStraightMoves(dirs) {
        let moves = [];
        for (let dir of dirs) {
            for (let i = 1; i < 8; ++i) {
                const dR = i * dir[0];
                const dC = i * dir[1];
                if (this.isValidSquare(dR, dC)) {
                    moves.push(this.getMove(dR, dC));
                    if (this.isEnemy(this.getPiece(dR, dC))) {
                        break;
                    }
                } else break;
            }
        }
        return moves;
    }

    name() {
        return null;
    }

    color() {
        return this.mycolor;
    }

    legalMoves() {
        return null
    };
}