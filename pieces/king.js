const Piece = require("./piece.js");
const Move = require("../game/move.js");

module.exports = class King extends Piece {

    name() { return "king"; }
    code() { return 6; }
    isTicTacToe() { return true; }

    legalMoves() {
        const moves = super.legalMoves();
        const dirs = [
            [1, 0], [-1, 0], [0, 1], [0, -1],
            [1, 1], [1, -1], [-1, 1], [-1, -1]
        ];
        for (const [dR, dC] of dirs) {
            if (this.isEmptySquare(dR, dC) ||
                this.isEnemy(this.getPiece(dR, dC))) {
                moves.push(this.createMove(dR, dC));
            }
        }

        const kingSideCastle = this.getCastleKingsideMove();
        const queenSideCastle = this.getCastleQueensideMove();

        if (kingSideCastle) moves.push(kingSideCastle);
        if (queenSideCastle) moves.push(queenSideCastle);

        return moves;
    }

    // Returns null if can't castle king-side, or the castle move if can.
    getCastleKingsideMove() {
        if (this.moved) return null;
        if (!this.isEmptySquare(0, 1) || !this.isEmptySquare(0, 2)) return null;
        const rook = this.pieceBoard[this.position.row][this.position.col + 3];
        if (!rook || rook.moved) return null;
        const move = new Move(this.position.add(0, 2), this);
        move.childMove = new Move(this.position.add(0, 1), rook);
        return move;
    }

    // Returns null if can't castle queen-side, or the castle move if can.
    getCastleQueensideMove() {
        if (this.moved) return null;
        if (!this.isEmptySquare(0, -1) || 
            !this.isEmptySquare(0, -2) || 
            !this.isEmptySquare(0, -3)) return null;
        const rook = this.pieceBoard[this.position.row][this.position.col - 4];
        if (!rook || rook.moved) return null;
        const move = new Move(this.position.add(0, -2), this);
        move.childMove = new Move(this.position.add(0, -1), rook);
        return move;
    }
}
