const Pawn = require('../pieces/pawn');
const Knight = require('../pieces/knight');
const Bishop = require('../pieces/bishop');
const Rook = require('../pieces/rook');
const Queen = require('../pieces/queen');
const King = require('../pieces/king');
const Piece = require('../pieces/piece');
const Position = require('./position');
const Board = require('./board');
const { WHITE, BLACK, DEBUG, getColorName } = require("../public/constants");
const assert = require("assert");

module.exports = class Game {
    constructor() {
        this.turn = WHITE;
        this.selected = null; // Selected piece.
        this.board = new Board();
        this.legalMoves = null; // Either Array of Moves or null.

        // Signals whether to send a fresh board state to players.
        this.boardUpdated = true;

        // Tic-tac-toe center.
        this.tttCenter = new Position(this.randomInteger(3, 4),
                                      this.randomInteger(1, 6));

        this.lastMove = null; // Either a Move or null;
        this.promotion = null; // Either a Piece to be promoted or null.

        // Either a color code for who won, or 0 for draw. Null means not ended.
        this.result = null; 
        this.resultReason = null; // The string indicating why the game ended.
    }

    // Public API: Returns the data that will be transmitted to the client.
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
        if (DEBUG) this.board.check();

        const ret = {};
        if (this.boardUpdated) {
            ret.board = this.board.data();
        }
        ret.tttCenter = this.tttCenter.data();
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

    // Public API: rhe main user input handling method. Every time the user
    // clicks anywhere, this should called.
    handleInput(r, c, color, choice) {
        assert(color === WHITE || color === BLACK, "Invalid color");

        if (DEBUG) this.board.check();

        // Game is over, don't handle any more inputs.
        if (this.result !== null) return;

        // If it's not the current player's turn, we don't do anything.
        if (this.turn !== color) return;

        const colorName = getColorName(color);

        // Check to see if we need to finish promoting a piece.
        if (this.promotion) {
            // If the move does not contain a promotion choice, return and keep
            // waiting.
            if (!choice) return;
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
            this.board.delete(pos.row, pos.col);
            this.board.set(pos.row, pos.col, promotedPiece);
            this.boardUpdated = true;
            this.promotion = null;
            this.turn = this.opposite(this.turn);
            this.checkChessResult();
            this.checkOthelloResult();
            this.checkTicTacToeResult();
            return;
        }

        // This case is where legal moves are already highlighted on the board.
        if (this.legalMoves) {
            this.boardUpdated = this.movePiece(r, c);
            const piece = this.board.get(r, c);
            // This is when the user clicked on nothing.
            if (!piece) {
                this.legalMoves = null;
                this.selected = null;
            } else {
                // This is when the user clicked on something other than the
                // current selected piece.
                if (piece.getColor() !== this.turn) return;
                this.selected = piece;
                this.legalMoves = this.selected.legalMoves();
            }
        } else {
            // This is where no legal moves are highlighted on the board yet.
            let piece = this.board.get(r, c);
            if (piece && piece.getColor() !== this.turn) return;
            this.selected = piece;

            this.legalMoves = this.selected ? this.selected.legalMoves() : null;
            this.boardUpdated = false;
        }

        // Some legal moves cause the king to be in check. Trim away those moves.
        if (this.legalMoves) {
            this.trimLegalMoves();
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
            this.board.pieces(this.turn).forEach(piece => piece.onPassTurn(this.turn));
            this.promotion = this.checkForPromotion(this.turn);

            // If we are promoting, the player needs to move again.
            // Otherwise give the turn to the other player.
            this.turn = this.promotion ? this.turn : this.opposite(this.turn);
            
            // Check whether the game is over.
            this.checkChessResult();
            this.checkOthelloResult();
            this.checkTicTacToeResult();
            return true;
        }
        return false;
    }

    // This trims away the legal moves that causes the own king to be in check.
    trimLegalMoves() {
        const isChecked = this.checkForCheck(this.turn);
        for (let i = this.legalMoves.length - 1; i >= 0; i--) {
            const move = this.legalMoves[i];
            assert.equal(move.piece.getColor(), this.turn);

            // Don't allow castling if the player is in check.
            if (isChecked && move.childMove) {
                this.legalMoves.splice(i, 1);
                continue;
            }

            // We "make" the move and check if we are in check. If so then we
            // cannot allow this move. Then undo the move.
            move.apply();
            if (this.checkForCheck(this.turn)) {
                this.legalMoves.splice(i, 1);
            }
            move.undo();
        }
    }

    // Determine if the game is over by Chess rules.
    checkChessResult() {
        const isChecked = this.checkForCheck(this.turn);
        const noMoves = this.hasNoMoves();
        if (noMoves) {
            this.result = isChecked ? this.opposite(this.turn) : 0;
            this.resultReason = isChecked ? "Checkmate" : "Stalemate";
        }
    }

    // Determine if the game is over by Othello rules.
    checkOthelloResult() {
        let kingCount = this.board.pieces(WHITE).filter(piece => piece instanceof King).length;

        // White has no kings - black won.
        if (kingCount === 0) {
            this.result = BLACK;
            this.resultReason = "White's king got flipped by Othello rules";
        }
        // White has 2 kings - white won.
        if (kingCount === 2) {
            this.result = WHITE;
            this.resultReason = "Black's king got flipped by Othello rules";
        }
    }

    // Determine if the game is over by Tic-Tac-Toe rules
    checkTicTacToeResult() {
        const r = this.tttCenter.row;
        const c = this.tttCenter.col;
        // Horizontals
        let lines = [[[r-1,c-1], [r-1,c], [r-1,c+1]],
                     [[r,c-1], [r,c], [r,c+1]],
                     [[r+1,c-1], [r+1,c], [r+1,c+1]]];
        // Verticals
        lines = lines.concat([[[r-1,c-1], [r,c-1], [r+1,c-1]],
                             [[r-1,c], [r,c], [r+1,c]],
                             [[r-1,c+1], [r,c+1], [r+1,c+1]]]);

        // Diagonals
        lines = lines.concat([[[r-1,c-1], [r,c], [r+1,c+1]],
                             [[r-1,c+1], [r,c], [r+1,c-1]]]);

        for (const line of lines) {
            const p = line.map(pos => this.board.get(pos[0], pos[1]));

            if (p[0] && p[1] && p[2] && p[0].isTicTacToe() && p[1].isTicTacToe()
                && p[2].isTicTacToe() && p[0].getColor() === p[1].getColor()
                && p[1].getColor() === p[2].getColor()) {
                this.result = p[0].getColor();
                this.resultReason = getColorName(this.result) +
                    " wins by Tic-Tac-Toe";
                break;
            }
        }
    }

    // Returns if the current player has no more legal moves.
    hasNoMoves() {
        const pieces = this.board.pieces(this.turn);
        for (let piece of pieces) {
            if (this.trimMoves(piece).length > 0) return false;
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

    // Checks whether the given color's king is in check.
    checkForCheck(color) {
        const pieces = this.board.pieces(this.opposite(color));
        for (let piece of pieces) {
            if (piece.legalMoves().some(move => move.capturesKing())) return true;
        }
        return false;
    }

    // Checks whether a piece can promote. If so, return the piece, otherwise
    // return null.
    checkForPromotion(color) {
        const pieces = this.board.pieces(color);
        for (let piece of pieces) {
            if (!piece || !(piece instanceof Pawn)) continue;
            if (piece.position.row === (color === WHITE ? 0 : 7))
                return piece;
        }
        return null;
    }

    /********************************************
     * Basic utils. These should rarely change. *
     ********************************************/

    // Returns a random integer between min and max inclusive.
    randomInteger(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Returns the opposite color to the given color int.
    opposite(color) {
        return color === WHITE ? BLACK : WHITE;
    }
}
