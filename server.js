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

const numberDictionary = NumberDictionary.generate({ min: 100, max: 999 });
const playerName = uniqueNamesGenerator({
    dictionaries: [adjectives, names, numberDictionary],
    length: 3,
    separator: '',
    style: 'capital'
});

// SocketID -> Player
let players = new Map();

// Match Name -> Match
let matches = new Map();

function rooms(socket) {
    if (!socket) return io.sockets.adapter.rooms;
    return Array.from(socket.rooms).filter(r => r !== socket.id)[0];
}

function emitMatches() {
    let result = [];
    for (let [key, value] of io.sockets.adapter.rooms) {
        if (value.has(key) || !matches[key]) continue;
        const match = matches[key];
        // Match has already started. Don't list it.
        if (match.host && match.guest) continue;
        result.push({
            name: match.name,
            host: match.host.name
        });
    }
    io.sockets.emit("matches", result);
}

function generateName() {
    const numberDictionary = NumberDictionary.generate({ min: 100, max: 999 });
    return uniqueNamesGenerator({
        dictionaries: [adjectives, names, numberDictionary],
        length: 3,
        separator: '',
        style: 'capital'
    });
}

io.on("connection", (socket) => {
    players[socket.id] = new Player(generateName(), new Match(socket.id, null));
    players[socket.id].personalMatch.guest = players[socket.id];

    socket.on("input", (input) => {
        if (!input.matchName) {
            players[socket.id].personalMatch.game.handleInput(input.row, input.col);
            socket.emit("state", players[socket.id].personalMatch.data());
            return;
        }
        const match = matches[input.matchName]
        if (!match) {
            socket.emit("error", "Opponent disconnected");
            socket.emit("exit match");
            socket.emit("state", players[socket.id].personalMatch.data());
            return;
        }
        if (!match.guest) {
            socket.emit("error", "You need an opponent!");
            return;
        }
        match.game.handleInput(input.row, input.col);
        io.to(input.matchName).emit("state", match.data());
    });
    socket.on("new match", (input) => {
        if (!input.matchName) {
            socket.emit('error', 'Must specify match name');
        }
        console.log("Creating new match for player " + input.playerName + ": " + input.matchName);
        players[socket.id] = new Player(input.playerName, players[socket.id].game);
        let r = socket.rooms;
        if (r.has(input.matchName) ||
            !r.has(input.matchName) && r.size === 2) {
            socket.emit('error', 'Already joined ' + rooms(socket));
            return;
        }
        socket.join(input.matchName);
        matches[input.matchName] = new Match(players[socket.id], input.matchName);
        emitMatches();
    });

    socket.on("get matches", () => emitMatches());
    socket.on("get personal game state", () => {
        socket.emit("state", players[socket.id].personalMatch.data());
    });
    socket.on("get player info", () => {
        socket.emit("player info", players[socket.id].name);
    });

    socket.on("disconnecting", () => {
        console.log("Disconnecting " + socket.id);
        if (!players[socket.id]) return;
        console.log("Found player to disconnect: " + players[socket.id].name);
        for (let room of socket.rooms) {
            if (matches[room]) {
                console.log("Deleted match: " + room);
                delete matches[room];
            }
        }
        delete players[socket.id];
    });

    socket.on("disconnect", () => {
        emitMatches();
    });

    socket.on("join match", (matchName) => {
        const player = players[socket.id];
        const match = matches[matchName];
        if (!match) {
            socket.emit("error", "Match " + matchName + " does not exist.");
            emitMatches();
            return;
        }
        if (match.host.name === player.name) {
            socket.emit("error", "Cannot join a match you hosted");
            return;
        }
        if (match.guest && match.guest.name === player.name) {
            socket.emit("error", "You already joined this match");
            return;
        }
        if (match.guest && match.guest.name !== player.name) {
            socket.emit("error", "This match has already started");
            return;
        }
        match.guest = player;
        socket.join(matchName);
        io.to(matchName).emit("state", match.data());
        socket.emit("message", "Joined match " + match.name + " hosted by " + match.host.name);
        emitMatches();
    });
});