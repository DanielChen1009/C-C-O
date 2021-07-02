const express = require('express');
const socketio = require('socket.io');

const app = express();
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log("Listening on port " + PORT + "!");
});
const io = socketio(server);

// SocketID -> Player
let players = new Map();

// Match Name -> Match
let matches = new Map();
let game;

function rooms(socket) {
    if (!socket) return io.sockets.adapter.rooms;
    return Array.from(socket.rooms).filter(r => r !== socket.id)[0];
}
function emitMatches() {
    let result = [];
    for (let [key, value] of io.sockets.adapter.rooms) {
        if (value.has(key)) continue;
        result.push(key);
    }
    io.sockets.emit("matches", result);
}

io.on("connection", (socket) => {
    if (!game) game = new Game();
    socket.emit("state", game.data());
    socket.on("input", (input) => {
        game.handleInput(input.row, input.col);
        io.sockets.emit("state", game.data());
    });
    socket.on("new match", (input) => {
        console.log("Creating new match for player " + input.playerName + ": " + input.matchName);
        players[socket.id] = new Player(socket, input.playerName);
        let r = socket.rooms;
        if (r.has(input.matchName) ||
            !r.has(input.matchName) && r.size === 2) {
            socket.emit('error', 'Already joined ' + rooms(socket));
            return;
        }
        socket.join(input.matchName);
        matches[input.matchName] = new Match();
        emitMatches();
    });

    socket.on("get matches", () => emitMatches());

    socket.on("disconnecting", () => {
        console.log("Disconnecting " + socket.id);
        if (!players[socket.id]) return;
        console.log("Found player to disconnect: " + players[socket.id].name);
        for (let room of socket.rooms) {
            if (matches[room]) {
                console.log("Deleted match: " + room);
                matches.delete(room);
            }
        }
        players.delete(socket.id);
    });

    socket.on("disconnect", () => {
        emitMatches();
    });

    socket.on("join room", (match) => {
        if (!matches.has(match))
            socket.emit("error", "Match does not exist.");
    });
});

const WHITE = 1;
const BLACK = -1;

class Player {
    constructor(socket, name) {
        this.socket = socket;
        this.name = name;
    }
}

class Match {
    constructor() {
        this.game = new Game();
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

class Piece {
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

    data() {
        return {
            toPos: this.toPos,
            fromPos: this.fromPos
        }
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