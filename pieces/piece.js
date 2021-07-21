const Position = require("../game/position.js");
const Move = require("../game/move.js");
const assert = require("assert");

module.exports = class Piece {
    constructor(color, r, c, board) {
        assert(r >= 0 && r <= 7 && c >= 0 && c <= 7, "Piece placed out of bounds");
        this.mycolor = color;
        // r is for row, c is column.
        this.position = new Position(r, c);
        this.selected = false;
        this.pieceBoard = board;
        this.moved = false;
        this.visited = Array.from(Array(8), () => new Array(8));
    }

    data() {
        return this.code() + "," + this.getColor();
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
        const piece = this.pieceBoard[r][c];
        assert(!piece || piece instanceof Piece, "getPiece returned a non-null and non-Piece");
        return piece;
    }

    isEnemy(piece) {
        if (!piece) return false;
        assert(piece instanceof Piece, "isEnemy called on non-Piece");
        return piece.getColor() !== this.getColor();
    }

    getMove(dR, dC) {
        assert(this instanceof Piece, "This is not a piece");
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

    checkCheckers(r, c) {
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                this.visited[i][j] = false;
            }
        }
        return this.checkCheckersMoves(r, c);
    }

    checkCheckersMoves(r, c) {
        const dirs = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
        let moves = [];
        for (let i = 0; i < 4; i++) {
            let nr = r + dirs[i][0];
            let nc = c + dirs[i][1];
            if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
            if (!this.pieceBoard[nr][nc]) continue;
            if (this.pieceBoard[nr][nc].getColor() === this.mycolor) continue;
            nr = nr + dirs[i][0];
            nc = nc + dirs[i][1];
            if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
            if (this.visited[nr][nc]) continue;
            this.visited[r][c] = true;
            if (!this.pieceBoard[nr][nc]) {
                let checkersMoves = this.checkCheckersMoves(nr, nc)
                if (checkersMoves.length !== 0) {
                    for (let move of checkersMoves) {
                        moves.push(move);
                        this.visited[nr][nc] = true;
                    }
                } else {
                    moves.push(new Move(new Position(nr, nc), this));
                }
            }
        }
        return moves;
    }

    // An on-wire single number representation of this piece.
    code() {
        return null;
    }

    // Unique human-readable name for this piece type.
    name() {
        return null;
    }

    // The color of this piece. Either white or black.
    getColor() {
        return this.mycolor;
    }

    // The current legal moves for this piece.
    legalMoves() {
        return null;
    }
}