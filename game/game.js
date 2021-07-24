const Pawn = require('../pieces/pawn.js');
const Knight = require('../pieces/knight.js');
const Bishop = require('../pieces/bishop.js');
const Rook = require('../pieces/rook.js');
const Queen = require('../pieces/queen.js');
const King = require('../pieces/king.js');
const Piece = require('../pieces/piece.js');
const { WHITE, BLACK, DEBUG } = require("../game/constants.js");
const assert = require("assert");

module.exports = class Game {
    constructor() {
        this.turn = WHITE;
        this.selected = null;
        this.board = new Array(8).fill(null).map(() => new Array(8).fill(null));
        this.legalMoves = null; // Either Array of Moves or null.
        this.boardUpdated = true;
        this.lastMove = null; // Either a Move or null;
        this.promotion = null; // Either a Piece to be promoted or null.
        // Either a color code for who won, or 0 for draw. Null means not ended.
        this.result = null; 
        this.resultReason = null; // The string indicating why the game ended.

        if (DEBUG) {
            this.board[0][0] = new King(BLACK, 0, 0, this.board);
            this.board[4][4] = new Pawn(BLACK, 4, 4, this.board);
            this.board[5][5] = new Pawn(WHITE, 5, 5, this.board);
            this.board[2][4] = new Pawn(BLACK, 2, 4, this.board);
            this.board[7][7] = new King(WHITE, 7, 7, this.board);
            this.board[1][4] = new Pawn(WHITE, 1, 4, this.board);
        } else {
            // Set white pieces.
            this.placePieces(WHITE, 7);

            // Set black pieces.
            this.placePieces(BLACK, 0);
        }
    }

    // Returns the data that will be transmitted to the client for rendering.
    // This should be as small as possible while conveying the necessary
    // information. Most fields should be undefined whenever possible since
    // those will not be sent over the wire.
    //
    // colors is an Array of color ints corresponding to which side's data to
    // send. For personal matches, both sides can see all info and
    // [WHITE, BLACK] will be used. For online matches the respective sides
    // cannot see the other side's full information like selected pieces and
    // highlighted legal moves.
    data(colors) {
        for (const color of colors) assert(color === WHITE || color ===
            BLACK, "Invalid color: " + color);
        if (DEBUG) console.log("data(" + colors + ")");

        const ret = {};
        if (this.boardUpdated) {
            ret.board = this.board.map(
                row => row.map(p => p ? p.data() : null));
        }
        if (this.selected && colors.includes(this.selected.getColor())) {
            ret.selected = this.selected.position.data();
        }
        if (this.legalMoves && colors.includes(this.turn)) {
            ret.legalMoves = this.legalMoves.map(m => m.data());
        }
        if (this.lastMove) {
            ret.lastMove = this.lastMove.allPos().map(pos => pos.data());
        }
        if (this.promotion && colors.includes(this.promotion.getColor())) {
            ret.promotion = this.promotion.position.data();
        }
        if (this.result != null) {
            ret.result = this.result;
            ret.resultReason = this.resultReason;
        }
        return ret;
    }

    // Returns the word corresponding to a color int.
    getColorName(color) {
        return parseInt(color) === 1 ? "white" : "black";
    }

    // Places all pieces in initial position for the given color.
    placePieces(color, pos) {
        this.board[pos][0] = new Rook(color, pos, 0, this.board);
        this.board[pos][1] = new Knight(color, pos, 1, this.board);
        this.board[pos][2] = new Bishop(color, pos, 2, this.board);
        this.board[pos][3] = new Queen(color, pos, 3, this.board);
        this.board[pos][4] = new King(color, pos, 4, this.board);
        this.board[pos][5] = new Bishop(color, pos, 5, this.board);
        this.board[pos][6] = new Knight(color, pos, 6, this.board);
        this.board[pos][7] = new Rook(color, pos, 7, this.board);
        for (let i = 0; i < 8; ++i) {
            this.board[pos - color][i] = new Pawn(color, pos - color, i,
                this.board);
        }
    }

    // Checks whether the piece can move to r,c. If so, apply the move and
    // return true, else false.
    movePiece(r, c) {
        for (let move of this.legalMoves) {
            if (!move.toPos.equals(r, c)) continue;
            this.selected.moved = true;
            move.apply();
            this.lastMove = move;
            this.legalMoves = null;
            this.selected = null;
            // Give pieces a chance to execute some piece-specific logic
            // before passing the turn.
            for (const piece of this.pieces()) piece.onPassTurn(this.turn);
            this.promotion = this.checkForPromotion(this.turn);
            this.checkOthello(move);
            this.turn = this.promotion ? this.turn : this.opposite(this.turn);
            this.checkChessResult();
            return true;
        }
        return false;
    }

    // This trims away the legal moves that causes the own king to be in check.
    trimLegalMoves() {
        for (let i = this.legalMoves.length - 1; i >= 0; i--) {
            let move = this.legalMoves[i];
            move.apply();
            if (this.checkForCheck(this.turn)) {
                this.legalMoves.splice(i, 1);
            }
            move.undo();
        }
    }

    // The main user input handling method. Every time the user clicks anywhere,
    // this is called.
    handleInput(r, c, color, choice) {
        assert(color === WHITE || color === BLACK, "Invalid color");

        // Game is over, don't handle any more inputs.
        if (this.result !== null) return;

        // If it's not the current player's turn, we don't do anything.
        if (this.turn !== color) {
            return;
        }
        const colorName = this.getColorName(color);
        if (DEBUG) console.log("handleInput(" + r + ", " + c + ", " + colorName
            + ", " + choice + ") promotion: " + (this.promotion != null) +
            ", turn: " + this.getColorName(this.turn));

        // Check to see if we need to finish promoting a piece.
        if (this.promotion) {
            // If the move does not contain a promotion choice, return and keep
            // waiting.
            if (!choice) return;
            if (DEBUG) console.log("handleInput(" + colorName +
                "): handling promotion to " + choice);
            assert(r === this.promotion.position.row && c ===
                this.promotion.position.col, "Invalid promotion");
            const pos = this.promotion.position;
            color = this.promotion.getColor();
            let promotedPiece;
            switch (choice) {
                case "queen":
                    promotedPiece = new Queen(color, pos.row, pos.col,
                        this.board);
                    break;
                case "rook":
                    promotedPiece = new Rook(color, pos.row, pos.col,
                        this.board);
                    break;
                case "bishop":
                    promotedPiece = new Bishop(color, pos.row, pos.col,
                        this.board);
                    break;
                case "knight":
                    promotedPiece = new Knight(color, pos.row, pos.col,
                        this.board);
                    break;
                default:
                    assert.fail("Invalid promotion piece name: " +
                        choice);
            }
            this.board[pos.row][pos.col] = promotedPiece;
            this.boardUpdated = true;
            this.promotion = null;
            this.turn = this.opposite(this.turn);
            this.checkChessResult();
            return;
        }

        // This case is where legal moves are already highlighted on the board.
        if (this.legalMoves) {
            if (DEBUG) console.log("handleInput(" + colorName +
                "): handling move selection");
            this.boardUpdated = this.movePiece(r, c);
            // This is when the user clicked on nothing.
            if (!this.board[r][c]) {
                this.legalMoves = null;
                this.selected = null;
            } else {
                // This is when the user clicked on something other than the
                // current selected piece.
                let piece = this.board[r][c];
                if (piece.getColor() !== this.turn) return;
                this.selected = this.board[r][c];
                this.legalMoves = this.selected.legalMoves();
            }
        } else {
            if (DEBUG) console.log("handleInput(" + colorName +
                "): handling legal move display");
            // This is where no legal moves are highlighted on the board yet.
            let piece = this.board[r][c];
            if (piece && piece.getColor() !== this.turn) return;
            this.selected = piece;

            this.legalMoves = this.selected ? this.selected.legalMoves() : null;
            this.boardUpdated = false;
        }

        if (this.legalMoves) {
            this.trimLegalMoves();
        }
    }

    // Determine if the game is over by Chess rules.
    checkChessResult() {
        const isChecked = this.checkForCheck(this.turn);
        const noMoves = this.hasNoMoves();
        if (noMoves) {
            this.result = isChecked ? this.opposite(this.turn) : 0;
            this.resultReason = isChecked ? "checkmate" : "stalemate";
        }
    }

    // Returns if the current player has no more legal moves.
    hasNoMoves() {
        for (let piece of this.pieces(this.turn)) {
            let moves = this.trimMoves(piece);
            if (moves.length > 0) return false;
        }
        return true;
    }

    // Trims the given piece's legal moves to remove moves that would cause the
    // own king to be in check.
    trimMoves(piece) {
        let moves = piece.legalMoves();
        for (let i = moves.length - 1; i >= 0; i--) {
            let move = moves[i];
            move.apply();
            if (this.checkForCheck(this.turn)) moves.splice(i, 1);
            move.undo();
        }
        return moves;
    }

    // Returns the opposite color to the given color int.
    opposite(color) {
        return color === WHITE ? BLACK : WHITE;
    }

    // A generator that runs over all pieces of the given color.
    * pieces(color) {
        for (let i = 0; i < 8; ++i) {
            for (let j = 0; j < 8; ++j) {
                let piece = this.board[i][j];
                if (piece && (!color || piece.getColor() === color))
                    yield piece;
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

    // Checks whether a piece can promote. If so, return the piece, otherwise
    // return null.
    checkForPromotion(color) {
        for (let piece of this.pieces(color)) {
            if (!piece || !(piece instanceof Pawn)) continue;
            if (piece.position.row === (color === WHITE ? 0 : 7))
                return piece;
        }
        return null;
    }

    // Checks for and performs othello flips that would be caused by the given
    // move.
    checkOthello(move) {
        const dirs = [
            [1, 0], [-1, 0], [0, 1], [0, -1],
            [1, 1], [1, -1], [-1, 1], [-1, -1]
        ];
        for (const dir of dirs) {
            let newPos = move.toPos;
            const flips = [];
            while (true) {
                newPos = newPos.add(dir[0], dir[1]);
                if (newPos.outOfBound()) break;
                const piece = this.board[newPos.row][newPos.col];
                if (!piece) break;
                if (piece.isEnemy(move.piece)) flips.push(piece);
                else {
                    for (const flip of flips) {
                        flip.color = move.piece.getColor();
                        // If we flipped a king, the game immediately ends.
                        if (flip instanceof King) {
                            this.result = flip.color;
                            this.resultReason = "othello - king was flipped";
                        }
                    }
                    break;
                }
            }
        }
    }
}