const Game = require("./game.js");

module.exports = class Match {
    constructor(host, matchName) {
        this.game = new Game();
        this.name = matchName;
        this.host = host;
        this.guest = null;
        const rand = Math.random();
        this.hostColor = rand < 0.5 ? 1 : -1;
        this.guestColor = rand < 0.5 ? -1 : 1;
    }

    data() {
        let gameData = this.game.data();
        gameData.matchName = this.name;
        gameData.hostName = this.host.name;
        if (this.guest) {
            gameData.guestName = this.guest.name;
        }
        return gameData;
    }
}
