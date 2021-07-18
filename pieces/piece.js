const Position = require("../game/position.js");
const Move = require("../game/move.js");

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
        return this.code() + "," + this.color();
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
        let r = this.position.row + dR;
        let c = this.position.col + dC;

        if (r > 7 || r < 0) return null;
        if (c > 7 || c < 0) return null;
        return this.pieceBoard[r][c];
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

    // An on-wire single number representation of this piece.
    code() { return null; }

    // Unique human-readable name for this piece type.
    name() { return null; }

    // The color of this piece. Either white or black.
    color() { return this.mycolor; }

    // The current legal moves for this piece.
    legalMoves() { return null; };
}