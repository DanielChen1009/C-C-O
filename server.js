const express = require('express');
const socketio = require('socket.io');
const Match = require('./match.js');
const Player = require('./player.js');
const app = express();
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log("Listening on port " + PORT + "!");
});
const io = socketio(server);

const {uniqueNamesGenerator, NumberDictionary, adjectives, names} = require('unique-names-generator');

// SocketID -> Player
let players = new Map();

// Match Name -> Match
let matches = new Map();

// Player name -> Player.
let nameMap = new Map();

// Return all rooms the socket belongs to. If socket is not specified, return all rooms.
function rooms(socket) {
    if (!socket) return io.sockets.adapter.rooms;
    return Array.from(socket.rooms).filter(r => r !== socket.id)[0];
}

// Emit all the current available matches to join.
function emitMatches() {
    let result = [];
    for (let match of matches.values()) {
        // Match has already started. Don't list it.
        if (match.host && match.guest) continue;
        result.push({
            name: match.name,
            host: match.host.name
        });
    }
    io.sockets.emit("matches", result);
}

// Generate a random player name.
function generateName() {
    const numberDictionary = NumberDictionary.generate({ min: 100, max: 999 });
    let name = "";
    do {
        name = uniqueNamesGenerator({
            dictionaries: [adjectives, names, numberDictionary],
            length: 3,
            separator: '',
            style: 'capital'
        });
    } while (nameMap.has(name))
    return name;
}

// All event handlers.
io.on("connection", (socket) => {
    const playerName = generateName();
    const newPlayer = new Player(playerName, socket, new Match(null, null));
    newPlayer.personalMatch.host = newPlayer;
    players.set(socket.id, newPlayer);
    players.get(socket.id).personalMatch.guest = newPlayer;
    nameMap.set(newPlayer.name, newPlayer);
    socket.emit("player info", newPlayer.name);

    socket.on("update name", (newName) => {
        if (nameMap.has(newName)) {
            socket.emit("error", newName + " is already taken.");
            socket.emit("player info", players.get(socket.id).name);
            return;
        }
        const player = players.get(socket.id);
        nameMap.delete(player.name);
        player.name = newName;
        nameMap.set(player.name, player);
        socket.emit("message", "Updated name to " + newName);
        emitMatches();
    });
    socket.on("input", (input) => {
        const player = players.get(socket.id);
        if (!input.matchName) {
            player.personalMatch.game.handleInput(input.row, input.col);
            player.sendPersonalMatchState();
            return;
        }
        const match = matches.get(input.matchName)
        if (!match) {
            socket.emit("error", "Match does not exist. Opponent disconnected.");
            socket.emit("exit match");
            player.sendPersonalMatchState();
            return;
        }
        if (!match.guest) {
            socket.emit("error", "You are hosting a match. Still waiting for an opponent!");
            return;
        }
        match.game.handleInput(input.row, input.col);
        io.to(input.matchName).emit("match state", match.data());
    });

    socket.on("new match", (input) => {
        if (!input.matchName) {
            socket.emit('error', 'Must specify match name');
            return;
        }
        console.log("Creating new match for player " + input.playerName + ": " + input.matchName);
        const player = players.get(socket.id);
        if (player.hostedMatch) {
            socket.emit('error', 'You are already hosting a match: ' + player.hostedMatch.name);
            return;
        }
        if (player.joinedMatch) {
            socket.emit('error', 'You are already in a match: ' + player.joinedMatch.name);
            return;
        }
        if (matches.has(input.matchName)) {
            socket.emit('error', 'Match already exists: ' + input.matchName);
            return;
        }
        socket.join(input.matchName);
        const newMatch = new Match(player, input.matchName);
        matches.set(input.matchName, newMatch);
        player.hostedMatch = newMatch;
        player.joinedMatch = null;
        emitMatches();
    });

    socket.on("get matches", () => emitMatches());
    socket.on("get personal game state", () => {
        players.get(socket.id).sendPersonalMatchState();
    });
    socket.on("get player info", () => {
        socket.emit("player info", players.get(socket.id).name);
    });

    socket.on("disconnecting", () => {
        if (!players.get(socket.id)) return;
        const player = players.get(socket.id);
        console.log("Disconnecting " + player.name);
        if (player.hostedMatch) {
            const guest = player.hostedMatch.guest;
            if (guest) {
                guest.joinedMatch = null;
                guest.socket.emit("host disconnected", player.name);
                guest.sendPersonalMatchState();
            }
            matches.delete(player.hostedMatch.name);
            console.log("Deleted hosted match: " + player.hostedMatch.name);
        }
        if (player.joinedMatch) {
            const host = player.joinedMatch.host;
            host.hostedMatch = null;
            host.socket.emit("guest disconnected", player.name);
            host.sendPersonalMatchState();
            matches.delete(player.joinedMatch.name);
            console.log("Deleted joined match: " + player.joinedMatch.name);
        }
        nameMap.delete(player.name);
        players.delete(socket.id);
    });

    socket.on("disconnect", () => {
        emitMatches();
    });

    socket.on("join match", (matchName) => {
        const player = players.get(socket.id);
        if (player.hostedMatch) {
            if (matchName == player.hostedMatch.name) {
                socket.emit("error", "Cannot join a match you hosted");
            } else {
                socket.emit("error", "Cannot join another match while you are hosting one.");
            }
            return;
        }
        if (player.joinedMatch) {
            if (matchName == player.joinedMatch.name) {
                socket.emit("error", "You already joined this match");
            } else {
                socket.emit("error", "Cannot join a match while you joined another one.");
            }
            return;
        }
        const match = matches.get(matchName);
        if (!match) {
            socket.emit("error", "Match " + matchName + " does not exist.");
            emitMatches();
            return;
        }
        if (match.guest && match.guest.name !== player.name) {
            socket.emit("error", "This match has already started");
            return;
        }
        match.guest = player;
        player.joinedMatch = match;
        socket.join(matchName);
        io.to(matchName).emit("match state", match.data());
        socket.emit("message", "Joined match " + match.name + " hosted by " + match.host.name);
        match.host.socket.emit("guest joined", player.name);
        emitMatches();
    });
});