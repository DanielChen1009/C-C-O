const express = require('express');
const socketio = require('socket.io');
const Match = require('./game/match.js');
const Player = require('./game/player.js');
const {uniqueNamesGenerator, NumberDictionary, adjectives, names} = require('unique-names-generator');
const {WHITE, BLACK} = require("./game/constants.js");

const app = express();
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log("Listening on port " + PORT + "!");
});
const io = socketio(server);

// SocketID -> Player
let players = new Map();

// Match name -> Match
let matches = new Map();

// Player name -> Player.
let nameMap = new Map();

// Emit all the current active matches.
function emitMatches() {
    let result = [];
    for (let match of matches.values()) {
        result.push({
            name: match.name,
            host: match.host.name,
            guest: match.guest ? match.guest.name : null
        });
    }
    io.sockets.emit("matches", result);
}

// Generate a random player name that is not in the current nameMap.
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

// Make the given player leave all its matches.
function leaveMatches(player) {
    if (player.hostedMatch) {
        const guest = player.hostedMatch.guest;
        if (guest) {
            guest.joinedMatch = null;
            guest.socket.emit("host disconnected", player.name);
            guest.personalMatch.emit();
        }
        player.socket.emit("message", "Left hosted match: " + player.hostedMatch.name);
        matches.delete(player.hostedMatch.name);
        console.log("Deleted hosted match: " + player.hostedMatch.name);
        player.hostedMatch = null;
    }
    if (player.joinedMatch) {
        const host = player.joinedMatch.host;
        host.hostedMatch = null;
        host.socket.emit("guest disconnected", player.name);
        host.personalMatch.emit();
        player.socket.emit("message", "Left match: " + player.joinedMatch.name);
        matches.delete(player.joinedMatch.name);
        console.log("Deleted joined match: " + player.joinedMatch.name);
        player.joinedMatch = null;
    }
}

// All event handlers.
io.on("connection", (socket) => {
    const playerName = generateName();
    const newPlayer = new Player(playerName, socket, new Match(null, null));
    newPlayer.personalMatch.host = newPlayer;
    newPlayer.personalMatch.guest = newPlayer;
    players.set(socket.id, newPlayer);
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
        let match = null;
        if (!input.matchName) {
            if (player.joinedMatch) match = player.joinedMatch;
            else if (player.hostedMatch) match = player.hostedMatch;
            else {
                player.personalMatch.game.handleInput(input.row, input.col, player.personalMatch.game.turn);
                player.personalMatch.emit();
                return;
            }
        }
        if (!match) match = matches.get(input.matchName)
        if (!match) {
            socket.emit("error", "Match does not exist. Opponent disconnected.");
            socket.emit("set match", null);
            player.personalMatch.emit();
            return;
        }
        if (!match.guest) {
            socket.emit("error", "You are hosting a match. Still waiting for an opponent!");
            return;
        }
        const color = match.getColor(player);
        if (!color) {
            socket.emit("error", "You are not in the match " + match.name + "! Something went wrong. Please refresh.");
            return;
        }
        match.game.handleInput(input.row, input.col, color);
        match.emit();
    });

    socket.on("new match", (matchName) => {
        if (!matchName) {
            socket.emit('error', 'Must specify match name');
            return;
        }
        const player = players.get(socket.id);
        if (!player) return;
        console.log("Creating new match for player " + player.name + ": " + matchName);
        if (player.hostedMatch) {
            socket.emit('error', 'You are already hosting a match: ' + player.hostedMatch.name);
            return;
        }
        if (player.joinedMatch) {
            socket.emit('error', 'You are already in a match: ' + player.joinedMatch.name);
            return;
        }
        if (matches.has(matchName)) {
            socket.emit('error', 'Match already exists: ' + matchName);
            return;
        }
        const newMatch = new Match(player, matchName);
        matches.set(matchName, newMatch);
        player.hostedMatch = newMatch;
        player.joinedMatch = null;
        socket.emit("set match", matchName);
        socket.emit("message", "Created new match: " + matchName);
        newMatch.emit();
        emitMatches();
    });

    socket.on("get matches", () => emitMatches());
    socket.on("get personal game state", () => {
        players.get(socket.id).personalMatch.emit();
    });
    socket.on("get player info", () => {
        socket.emit("player info", players.get(socket.id).name);
    });

    socket.on("disconnecting", () => {
        if (!players.get(socket.id)) return;
        const player = players.get(socket.id);
        console.log("Disconnecting " + player.name);
        leaveMatches(player);
        nameMap.delete(player.name);
        players.delete(socket.id);
    });

    socket.on("disconnect", () => {
        emitMatches();
    });

    socket.on("join match", (matchName) => {
        const player = players.get(socket.id);
        if (player.hostedMatch) {
            if (matchName === player.hostedMatch.name) {
                socket.emit("error", "Cannot join a match you hosted");
            } else {
                socket.emit("error", "Cannot join another match while you are hosting one.");
            }
            return;
        }
        if (player.joinedMatch) {
            if (matchName === player.joinedMatch.name) {
                socket.emit("error", "You already joined this match");
            } else {
                socket.emit("error", "Cannot join a match while you joined another one.");
            }
            return;
        }
        const match = matches.get(matchName);
        if (!match) {
            socket.emit("error", "Match does not exist: " + matchName);
            emitMatches();
            return;
        }
        if (match.guest && match.guest.name !== player.name) {
            socket.emit("error", "This match has already started");
            return;
        }
        match.guest = player;
        player.joinedMatch = match;
        match.emit();
        socket.emit("message", "Joined match " + match.name + " hosted by " + match.host.name);
        socket.emit("message", "Your color is " + (match.guestColor === 1 ? "WHITE" : "BLACK"));

        match.host.socket.emit("guest joined", player.name);
        match.host.socket.emit("message", "Your color is " + (match.hostColor === 1 ? "WHITE" : "BLACK"));
        emitMatches();
    });

    socket.on("leave match", () => {
        const player = players.get(socket.id);
        if (!player.hostedMatch && !player.joinedMatch) {
            socket.emit("error", "You don't have a match to leave");
            return;
        }
        leaveMatches(player);
        player.personalMatch.emit();
        emitMatches();
    });
});