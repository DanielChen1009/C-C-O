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
}