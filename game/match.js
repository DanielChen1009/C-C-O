const Game = require("../game/game");
const { WHITE, BLACK } = require("../public/constants");

module.exports = class Match {
    constructor(host, matchName) {
        this.game = new Game();
        this.name = matchName;
        this.host = host;
        this.guest = null;
        this.hostColor = Math.random() < 0.5 || !host ? WHITE : BLACK;
        this.guestColor = this.hostColor === WHITE ? BLACK : WHITE;
    }

    getColor(player) {
        return player === this.host ? this.hostColor : player === this.guest ?
            this.guestColor : null;
    }

    // Returns data of this match, from the perspective of the given player.
    data(colors) {
        let gameData = this.game.data(colors);
        gameData.matchName = this.name;
        gameData.hostName = this.host.name;
        if (this.guest) gameData.guestName = this.guest.name;
        gameData.yourColor = colors[0];
        return gameData;
    }

    // Emit the match state to the players.
    emit() {
        if (this.guest.name === this.host.name) {
            this.host.socket.emit("match state", this.data([WHITE, BLACK]));
        } else {
            this.host.socket.emit("match state", this.data([this
                .getColor(this.host)
            ]));
            if (this.guest) this.guest.socket.emit("match state", this
                .data([this.getColor(this.guest)]));
        }
    }
}