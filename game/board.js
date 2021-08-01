const Pawn = require('../pieces/pawn');
const Knight = require('../pieces/knight');
const Bishop = require('../pieces/bishop');
const Rook = require('../pieces/rook');
const Queen = require('../pieces/queen');
const King = require('../pieces/king');
const { WHITE, BLACK, DEBUG, index, rowcol } = require("../public/constants");
const assert = require("assert");

module.exports = class Board {
	constructor() {
		this.reset();
		if (DEBUG) {
			this.add(0, 0, King, BLACK);
			this.add(4, 4, Pawn, BLACK);
			this.add(5, 5, Pawn, WHITE);
			this.add(2, 4, Pawn, BLACK);
			this.add(7, 7, King, WHITE);
			this.add(1, 4, Pawn, WHITE);
	    } else {
	        // Set white pieces.
	        this.placePieces(WHITE, 7);

	        // Set black pieces.
	        this.placePieces(BLACK, 0);
	    }
	}

	reset() {
		this.board = new Array(8).fill(null).map(() => new Array(8).fill(null));
		this.pieceMap = new Map();
		this.pieceMap.set(WHITE, new Map());
		this.pieceMap.set(BLACK, new Map());
	}

	// Return data for the board to be returned to the client.
	data() {
		return this.board.map(row => row.map(p => p ? p.data() : null));
	}

	// Returns the indeex 0-63 of the given row, col.
	index(r, c) {
		return r * 8 + c;
	}

    // Places all pieces in initial position for the given color.
    placePieces(color, pos) {
    	this.add(pos, 0, Rook, color);
    	this.add(pos, 1, Knight, color);
    	this.add(pos, 2, Bishop, color);
    	this.add(pos, 3, Queen, color);
    	this.add(pos, 4, King, color);
    	this.add(pos, 5, Bishop, color);
    	this.add(pos, 6, Knight, color);
    	this.add(pos, 7, Rook, color);
        for (let i = 0; i < 8; ++i) {
            this.add(pos - color, i, Pawn, color);
        }
    }

	// Adds a new piece to the board. The square must be empty.
	add(r, c, cls, color) {
		assert.equal(this.board[r][c], null);
		const piece = new cls(color, r, c, this);
		this.set(r, c, piece);
	}

	// Get a piece from the board given row and col.
	get(r, c) {
		return this.board[r][c];
	}

	// Set a piece on the board given row, col, and piece.
	set(r, c, piece) {
		assert.strictEqual(this.board[r][c], null);
		assert.notStrictEqual(piece, null);
		assert.strictEqual(piece.position.row, r);
		assert.strictEqual(piece.position.col, c);
		this.board[r][c] = piece;
		this.pieceMap.get(piece.getColor()).set(this.index(r, c), piece);
	}

	// Delete a piece from the board.
	delete(r, c) {
		assert.notStrictEqual(this.board[r][c], null, "Cannot delete null at " + r + "," + c);
		const piece = this.board[r][c];
		assert(this.pieceMap.get(piece.getColor()).has(piece.position.data()),
			"Cannot delete " + piece.name() + " from " + rowcol(piece.position.data()));
		this.board[r][c] = null;
		this.pieceMap.get(piece.getColor()).delete(piece.position.data());
	}

	// Return an all pieces of a certain color.
	pieces(color) {
		return Array.from(this.pieceMap.get(color).values());
	}

	// Checks that the pieceMap and board states are in sync.
	check() {
		for (let row = 0; row < 8; row++) {
			for (let col = 0; col < 8; col++) {
				const piece = this.board[row][col];
				if (!piece) {
					assert(!this.pieceMap.get(WHITE).has(index(row, col)));
					assert(!this.pieceMap.get(BLACK).has(index(row, col)));
				}
				else assert.strictEqual(this.pieceMap.get(piece.getColor()).get(piece.position.data()), piece);
			}
		}
		for (let [color, pieces] of this.pieceMap) {
			for (const [idx, piece] of pieces) {
				assert.strictEqual(piece.position.data(), idx);
				assert.strictEqual(piece.getColor(), color);
				assert.strictEqual(piece, this.board[rowcol(idx).row][rowcol(idx).col]);
			}
		}
	}
}
