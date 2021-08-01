// Run tests using "npm test"
//
// To add new tests, don't edit this file. Add the cases to cases.txt.

const Game = require("../game/game");
const Board = require("../game/board");
const Pawn = require("../pieces/pawn");
const Knight = require("../pieces/knight");
const Bishop = require("../pieces/bishop");
const Rook = require("../pieces/rook");
const Queen = require("../pieces/queen");
const King = require("../pieces/king");
const Piece = require("../pieces/piece");
const Position = require("../game/Position");
const { WHITE, BLACK, rowcol } = require("../public/constants");
const assert = require("assert");
const fs = require("fs");

function parseTestCase(testCaseStr) {
    const sections = testCaseStr.split("> ");
    const testCase = {
        game: new Game(),
        expectedData: new Map(), // Color (int) -> Map<Name (string), Object>
    };
    for (const section of sections) {
        if (!section.trim()) continue;
        const lines = section.trim().split("\n");
        const sectionName = lines[0];
        const sectionBody = lines.splice(1);
        switch (sectionName) {
            case "TEST NAME":
                assert.strictEqual(sectionBody.length, 1);
                testCase.name = sectionBody[0];
                break;
            case "BOARD":
                assert.strictEqual(sectionBody.length, 8);
                testCase.game.board = parseBoard(sectionBody);
                break;
            case "TICTACTOE":
                assert.strictEqual(sectionBody.length, 1);
                const [r, c] = sectionBody[0].split(",").map(s => parseInt(s));
                testCase.game.tttCenter = new Position(r, c);
                break;
            case "TURN":
                assert.strictEqual(sectionBody.length, 1);
                assert.match(sectionBody[0], /(white|black)/);
                testCase.game.turn = (sectionBody[0] === "white" ? WHITE : BLACK);
                break;
            case "INPUTS":
                assert(sectionBody.length > 0, "Need at least one input");
                for (const input of sectionBody) {
                    if (!input) continue;
                    const inputs = input.split(",");
                    assert(inputs.length >= 2 && inputs.length <= 3);
                    testCase.game.handleInput(parseInt(inputs[0]), parseInt(inputs[1]),
                        testCase.game.turn, inputs.length === 3 ? inputs[2] : undefined);
                }
                break;
            case "EXPECTED BOARD":
                if (sectionBody.length === 1) {
                    assert.strictEqual(sectionBody[0], "unchanged");
                    testCase.expectedBoard = testCase.board;
                }
                else {
                    assert.strictEqual(sectionBody.length, 8);
                    testCase.expectedBoard = sectionBody.join("\n");
                }
                break;
            case "EXPECTED DATA SENT TO WHITE":
                assert(sectionBody.length > 0);
                testCase.expectedData.set(WHITE, new Map());
                for (const dataItem of sectionBody) {
                    const [field, value] = dataItem.split("=");
                    if (!field) continue;
                    testCase.expectedData.get(WHITE).set(field, JSON.parse(value));
                }
                break;
            case "EXPECTED DATA SENT TO BLACK":
                assert(sectionBody.length > 0);
                testCase.expectedData.set(BLACK, new Map());
                for (const dataItem of sectionBody) {
                    const [field, value] = dataItem.split("=");
                    if (!field) continue;
                    testCase.expectedData.get(BLACK).set(field, JSON.parse(value));
                }
                break;
            default: assert.fail("Unrecognized section name: " + sectionName);
        }
    }
    return testCase;
}

function parsePiece(pieceChar, row, col, board) {
    switch (pieceChar) {
        case 'K': return new King(WHITE, row, col, board);
        case 'Q': return new Queen(WHITE, row, col, board);
        case 'R': return new Rook(WHITE, row, col, board);
        case 'B': return new Bishop(WHITE, row, col, board);
        case 'N': return new Knight(WHITE, row, col, board);
        case 'P': return new Pawn(WHITE, row, col, board);
        case 'k': return new King(BLACK, row, col, board);
        case 'q': return new Queen(BLACK, row, col, board);
        case 'r': return new Rook(BLACK, row, col, board);
        case 'b': return new Bishop(BLACK, row, col, board);
        case 'n': return new Knight(BLACK, row, col, board);
        case 'p': return new Pawn(BLACK, row, col, board);
        case '.': return null;
        default: assert.fail("Unrecognized piece char: " + pieceChar);
    }
}

function printPiece(piece) {
    if (!piece) return '.';
    const [code, color] = piece.split(",").map(s => parseInt(s));
    switch (code) {
        case 6: return color === WHITE ? 'K' : 'k';
        case 5: return color === WHITE ? 'Q' : 'q';
        case 4: return color === WHITE ? 'R' : 'r';
        case 3: return color === WHITE ? 'B' : 'b';
        case 2: return color === WHITE ? 'N' : 'n';
        case 1: return color === WHITE ? 'P' : 'p';
        default: assert.fail("Unrecognized piece name: " + piece.name());
    }
}

function parseBoard(boardLines) {
    const board = new Board();
    board.reset();
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const char = boardLines[row].charAt(col);
            const piece = parsePiece(char, row, col, board);
            if (piece) board.set(row, col, piece);
        }
    }
    return board;
}

function printBoard(board) {
    let boardStr = "";
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            boardStr += printPiece(board[row][col]);
        }
        boardStr += "\n";
    }
    return boardStr.trim();
}

function toRC(pos) {
    return [rowcol(pos).row, rowcol(pos).col];
}

describe("C-C-O tests", () => {
    const tests = fs.readFileSync("test/cases.txt", "utf8").split(
        "=======================\n=======================");
  
    for (const test of tests) {
        const testCase = parseTestCase(test);
        it(testCase.name, () => {
            for (const color of [WHITE, BLACK]) {
                let data = testCase.game.data([color]);

                // If a board state expectation is set, check it against the real returned data.
                if (testCase.expectedBoard) {
                    assert(data.board, "No board found in data!");
                    assert.strictEqual(printBoard(data.board), testCase.expectedBoard, "Board not equal!");
                }
                const expectedData = testCase.expectedData.get(color);
                if (!expectedData) continue;

                // If present, check expected data fields.
                if (data.board) data.board = "<REDACTED FOR READABILITY>"; // Dominates stdout if kept.
                for (const [key, value] of expectedData) {
                    assert.notStrictEqual(data[key], undefined,
                        "data has no field [" + key + "]:\n" + JSON.stringify(data, null, 2));
                    switch (key) {
                        case "legalMoves":
                            assert.deepStrictEqual(data.legalMoves.map(m => toRC(m)), value);
                            break;
                        case "selected":
                            assert.deepStrictEqual(toRC(data.selected), value);
                            break;
                        default:
                            assert.deepStrictEqual(data[key], value);
                    }
                }
            }
        });
    } 
});
