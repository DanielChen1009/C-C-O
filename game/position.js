module.exports = class Position {
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

    data() {
        return this.row * 8 + this.col;
    }

    copy() {
        return new Position(this.row, this.col);
    }

    outOfBound() {
        return this.row < 0 || this.col < 0 || this.row > 7 || this.col > 7;
    }
}