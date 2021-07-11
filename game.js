const Pawn = require('./pieces/pawn.js');
const Knight = require('./pieces/knight.js');
const Bishop = require('./pieces/bishop.js');
const Rook = require('./pieces/rook.js');
const Queen = require('./pieces/queen.js');
const King = require('./pieces/king.js');

const WHITE = 1;
const BLACK = -1;
module.exports = class Game {
    constructor() {
        this.isChecked = false;
        this.turn = WHITE;
        this.selected = null;
        this.board = Array.from(Array(8), () => new Array(8));
        for (let i = 0; i < 8; ++i) {
            this.board[1][i] = new Pawn(BLACK, 1, i, this.board);
            this.board[6][i] = new Pawn(WHITE, 6, i, this.board);
        }
        this.legalMoves = null;

        // Set white pieces.
        this.renderSide(WHITE, 7);

        // Set black pieces.
        this.renderSide(BLACK, 0);
    }

    data() {
        return {
            board: this.board.map(row => row.map(p => p ? p.data() : null)),
            selected: this.selected ? this.selected.data() : null,
            legalMoves: this.legalMoves ? this.legalMoves.map(m => m.data()) : null
        }
    }

    renderSide(color, pos) {
        this.board[pos][0] = new Rook(color, pos, 0, this.board);
        this.board[pos][1] = new Knight(color, pos, 1, this.board);
        this.board[pos][2] = new Bishop(color, pos, 2, this.board);
        this.board[pos][3] = new Queen(color, pos, 3, this.board);
        this.board[pos][4] = new King(color, pos, 4, this.board);
        this.board[pos][5] = new Bishop(color, pos, 5, this.board);
        this.board[pos][6] = new Knight(color, pos, 6, this.board);
        this.board[pos][7] = new Rook(color, pos, 7, this.board);
    }

    handleInput(r, c) {
        // This case is where legal moves are already highlighted on the board.
        if (this.legalMoves) {
            // This case is where the piece actually will move.
            for (let move of this.legalMoves) {
                if (move.toPos.equals(r, c)) {
                    if (!this.selected.moved) this.selected.moved = true;
                    move.apply();
                    this.isChecked = false;
                    this.legalMoves = null;
                    this.selected = null;
                    this.turn = this.opposite(this.turn);
                    return;
                }
            }
            // This is when the user clicked on nothing.
            if (!this.board[r][c]) {
                this.legalMoves = null;
                this.selected = null;
            } else {
                // This is when the user clicked on something other than the current selected piece.
                let piece = this.board[r][c];
                if (piece.color() !== this.turn) return;
                this.selected = this.board[r][c];
                this.legalMoves = this.selected.legalMoves();
            }
        } else {
            // This is where no legal moves are highlighted on the board yet.
            let piece = this.board[r][c];
            if (piece && piece.color() !== this.turn) return;
            this.selected = piece;

            this.legalMoves = this.selected ?
                this.selected.legalMoves() : null;
        }
        // This trims away the legal moves that causes the own king to be in check.
        if (this.legalMoves) {
            for (let i = this.legalMoves.length - 1; i >= 0; i--) {
                let move = this.legalMoves[i];
                move.apply();
                if (this.checkForCheck(this.turn)) {
                    this.legalMoves.splice(i, 1);
                }
                move.undo();
            }
        }
        // This sets whether the opponent is in check.
        this.isChecked = this.checkForCheck(this.opposite(this.turn));
    }

    checkCheckmate() {
        for (let piece of this.pieces(this.turn)) {
            piece.legalMoves = trimLegalMoves(piece.legalMoves);
        }
    }

    trimLegalMoves(legalMoves) {

    }

    opposite(color) {
        return color === WHITE ? BLACK : WHITE;
    }

    * pieces(color) {
        for (let i = 0; i < 8; ++i) {
            for (let j = 0; j < 8; ++j) {
                let piece = this.board[i][j];
                if (piece && piece.color() === color) yield piece;
            }
        }
    }

    // Checks whether the given color's king is in check.
    checkForCheck(color) {
        for (let piece of this.pieces(this.opposite(color))) {
            let moves = piece.legalMoves();
            for (let move of moves) {
                if (move.capturesKing()) return true;
            }
        }
        return false;
    }
}
