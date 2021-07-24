const Position = require("../game/position.js");
const Move = require("../game/move.js");
const assert = require("assert");

module.exports = class Piece {
    constructor(color, r, c, board) {
        assert(r >= 0 && r <= 7 && c >= 0 && c <= 7,
            "Piece placed out of bounds");
        this.color = color;
        // r is for row, c is column.
        this.position = new Position(r, c);
        this.selected = false;
        this.pieceBoard = board;
        this.moved = false;
    }

    // Returns the socket.io wire-format data for this piece.
    data() {
        return this.code() + "," + this.getColor();
    }

    // Returns whether a square dR rows and dC columns away is an empty square.
    isEmptySquare(dR, dC) {
        let r = this.position.row + dR;
        let c = this.position.col + dC;

        if (r > 7 || r < 0) return false;
        if (c > 7 || c < 0) return false;
        return !this.pieceBoard[r][c];
    }

    // Returns the piece at a position dR rows and dC columns away, or null if
    // no piece or out of bounds.
    getPiece(dR, dC) {
        let r = this.position.row + dR;
        let c = this.position.col + dC;

        if (r > 7 || r < 0) return null;
        if (c > 7 || c < 0) return null;
        const piece = this.pieceBoard[r][c];
        assert(!piece || piece instanceof Piece,
               "getPiece returned a non-null and non-Piece");
        return piece;
    }

    // Returns whether the given piece is an enemy piece.
    isEnemy(piece) {
        if (!piece) return false;
        assert(piece instanceof Piece, "isEnemy called on non-Piece");
        return piece.getColor() !== this.getColor();
    }

    // Create a move representing moving dR rows and dC columns away from
    // current position.
    createMove(dR, dC) {
        return new Move(this.position.add(dR, dC), this);
    }

    getStraightMoves(dirs) {
        let moves = [];
        for (let dir of dirs) {
            for (let i = 1; i < 8; ++i) {
                const dR = i * dir[0];
                const dC = i * dir[1];
                const hitEnemy = this.isEnemy(this.getPiece(dR, dC));
                if (this.isEmptySquare(dR, dC) || hitEnemy) {
                    moves.push(this.createMove(dR, dC));
                    if (hitEnemy) break;
                } else break;
            }
        }
        return moves;
    }

    // Returns all legal checkers move for this piece at position r, c. visited
    // should be undefined on the first call.
    getCheckersMoves(r, c, visited) {
        const d = this.getColor() == 1 && this.name() == "pawn";
        const vdir = -1 * this.getColor();
        const hdirs = [-1, 1];
        const moves = [];
        if (!visited) visited = new Map();
        for (const hdir of hdirs) {
            let nr = r + vdir;
            let nc = c + hdir;
            if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
            const piece = this.pieceBoard[nr][nc];
            if (!this.isEnemy(piece)) continue;
            nr += vdir;
            nc += hdir;
            if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
            if (visited.get({nr, nc})) continue;
            visited.set({r, c}, true);
            if (!this.pieceBoard[nr][nc]) {
                let checkersMoves = this.getCheckersMoves(nr, nc, visited)
                if (checkersMoves.length > 0) {
                    for (let move of checkersMoves) {
                        move.capturedPieces.set(piece.position.copy(), piece);
                        move.checkpoints.push(new Position(nr, nc));
                        moves.push(move);
                        visited.set({nr, nc}, true);
                    }
                } else {
                    const move = new Move(new Position(nr, nc), this);
                    move.capturedPieces.set(piece.position.copy(), piece);
                    moves.push(move);
                }
            }
        }
        return moves;
    }

    // An on-wire single number representation of this piece.
    code() { assert.fail("Not implemented"); }

    // Unique human-readable name for this piece type.
    name() { assert.fail("Not implemented"); }

    // The color of this piece. Either white or black.
    getColor() {
        return this.color;
    }

    // The color of the enemy of this piece. Either white or black.
    getEnemyColor() {
        return -1 * this.color;
    }

    // The current legal moves for this piece.
    legalMoves() {
        return this.getCheckersMoves(this.position.row, this.position.col);
    }

    // Callbacks after a certain move has been applied or undid. Each piece
    // can have piece-specific logic to have side effects after moves.
    onApplyMove(move) {}
    onUndoMove(move) {}

    // Callback after a turn (a color value, WHITE or BLACK) is passed.
    onPassTurn(turn) {}
}