const Game = require("../game/game.js");
const {WHITE, BLACK} = require("../game/constants.js");

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
        return player === this.host ? this.hostColor : player === this.guest ? this.guestColor : null;
    }

    // Returns data of this match, from the perspective of the given player.
    data(player) {
        let gameData = this.game.data();
        gameData.matchName = this.name;
        gameData.hostName = this.host.name;
        if (this.guest) gameData.guestName = this.guest.name;
        gameData.yourColor = this.getColor(player);
        return gameData;
    }

    // Emit the match state to the players.
    emit() {
        this.host.socket.emit("match state", this.data(this.host));
        if (this.guest && this.guest.name != this.host.name) {
            this.guest.socket.emit("match state", this.data(this.guest));
        }
    }
}