const Game = require("./game.js");

module.exports = class Match {
    constructor(host, matchName) {
        this.game = new Game();
        this.name = matchName;
        this.host = host;
        this.guest = null;
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
