module.exports = class Player {
    constructor(name, socket, personalMatch) {
        this.name = name;
        this.socket = socket;
        this.personalMatch = personalMatch;
        this.hostedMatch = null;
        this.joinedMatch = null;
    }

    sendPersonalMatchState() {
       this.socket.emit("match state", this.personalMatch.data());
    }
}
