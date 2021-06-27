$(document).ready(init);

let session;
const WHITE = 1;
const BLACK = -1;

function init() {
    session = new Session("content");
    session.start();
}

class Session {
    constructor(contentId) {
        this.container = $("#" + contentId);
        this.game = new Game();
    }

    start() {
        this.buildBoard();
        this.render();
    }

    handleClick(id) {
        let r = Math.floor(id / 8);
        let c = id % 8;

        this.game.handleInput(r, c);
        this.render();
    }

    render() {
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                let squareID = i * 8 + j;
                let piece = this.game.board[i][j];
                let square = $("#" + squareID);
                square.removeClass();
                square.addClass("square");
                if (!piece) continue;
                square.addClass("piece");
                square.addClass(piece.name() + (piece.color() === WHITE ? "white" : "black"));
            }
        }
        if (this.game.selected) {
            let squareID = this.game.selected.position.toID();
            let square = $("#" + squareID);
            square.addClass("select");
        }
        if (this.game.legalMoves) {
            let moves = this.game.legalMoves;
            for (let move of moves) {
                let position = move.toPos;
                let validSquare = $("#" + position.toID());
                validSquare.addClass("select");
            }
        }
    }

    buildBoard() {
        let content = $("<table>");
        content.addClass("board");
        for (let i = 0; i < 8; i++) {
            let row = $("<tr>");
            for (let j = 0; j < 8; j++) {
                let cell = $("<td>");
                let button = $("<button>");
                button.addClass("square");
                button.attr("type", "button");
                button.attr("id", i * 8 + j);
                button.click(() => session.handleClick(i * 8 + j));
                cell.append(button);
                row.append(cell);
            }
            content.append(row);
        }

        this.container.append(content);
    }
}

class Game {
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
            if (piece.color() !== this.turn) return;
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

    opposite(color) {
        return color === WHITE ? BLACK : WHITE;
    }

    *pieces(color) {
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

class Piece {
    constructor(color, r, c, board) {
        this.mycolor = color;
        // r is for row, c is column.
        this.position = new Position(r, c);
        this.selected = false;
        this.pieceBoard = board;
        this.moved = false;
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

class Pawn extends Piece {

    name() {
        return "pawn";
    }

    legalMoves() {
        let moves = [];
        let deltas = this.moved ? [1] : [1, 2];

        for (let delta of deltas) {
            let piece = this.getPiece(-delta * this.color(), 0);
            if (this.isValidSquare(-delta * this.color(), 0) && !this.isEnemy(piece))
                moves.push(this.getMove(-delta * this.color(), 0));
            else break;
        }

        deltas = [1, -1];
        for (let delta of deltas) {
            let piece = this.getPiece(-1 * this.color(), delta);
            if (this.isValidSquare(-1 * this.color(), delta) && this.isEnemy(piece))
                moves.push(this.getMove(-1 * this.color(), delta));
        }

        return moves;
    }
}

class Knight extends Piece {
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

class Bishop extends Piece {
    name() {
        return "bishop";
    }


    legalMoves() {
        const dirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        return this.getStraightMoves(dirs);
    }
}

class Rook extends Piece {
    name() {
        return "rook";
    }

    legalMoves() {
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        return this.getStraightMoves(dirs);
    }
}

class Queen extends Piece {
    name() {
        return "queen";
    }

    legalMoves() {
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1],
            [1, 1], [1, -1], [-1, 1], [-1, -1]
        ];
        return this.getStraightMoves(dirs);
    }
}

class King extends Piece {
    name() {
        return "king";
    }

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

class Position {
    constructor(r, c) {
        this.row = r;
        this.col = c;
    }

    add(dR, dC) {
        return new Position(this.row + dR, this.col + dC)
    }

    toID() {
        return this.row * 8 + this.col;
    }

    equals(r, c) {
        return this.row === r && this.col === c;
    }
}

class Move {
    constructor(pos, piece) {
        this.toPos = pos;
        this.piece = piece;
        this.fromPos = this.piece.position;
        this.capturedPieces = null;
        this.board = this.piece.pieceBoard;
    }

    apply() {
        this.capturedPieces = [this.board[this.toPos.row][this.toPos.col]];
        this.board[this.piece.position.row][this.piece.position.col] = null;
        this.board[this.toPos.row][this.toPos.col] = this.piece;
        this.fromPos = new Position(this.piece.position.row, this.piece.position.col);
        this.piece.position = this.toPos;
    }

    undo() {
        this.board[this.toPos.row][this.toPos.col] = this.capturedPieces[0];
        this.piece.position = this.fromPos;
        this.board[this.piece.position.row][this.piece.position.col] = this.piece;
    }

    capturesKing() {
        let piece = this.board[this.toPos.row][this.toPos.col]
        return piece instanceof King && piece.color() !== this.piece.color();
    }
}