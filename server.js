const express = require('express');
const socketio = require('socket.io');
const Game = require('./game.js');
const Match = require('./match.js');
const Player = require('./player.js');
const app = express();
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log("Listening on port " + PORT + "!");
});
const io = socketio(server);

// SocketID -> Player
let players = new Map();

// Match Name -> Match
let matches = new Map();
let globalMatch;

function rooms(socket) {
    if (!socket) return io.sockets.adapter.rooms;
    return Array.from(socket.rooms).filter(r => r !== socket.id)[0];
}
function emitMatches() {
    let result = [];
    for (let [key, value] of io.sockets.adapter.rooms) {
        if (value.has(key) || !matches[key]) continue;
        result.push(key);
    }
    io.sockets.emit("matches", result);
}

io.on("connection", (socket) => {
    players[socket.id] = new Player(socket.id, new Match(socket.id, null));
    players[socket.id].personalMatch.guest = players[socket.id];
    socket.emit("state", players[socket.id].personalMatch.data());
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

    socket.on("join room", (matchName) => {
        const player = players[socket.id];
        const match = matches[matchName];
        if (!match) {
            socket.emit("error", "Match does not exist.");
            return;
        }
        if (match.host.name === player.name) {
            socket.emit("error", "Cannot join own match");
            return;
        }
        match.guest = player;
        socket.join(matchName);
        io.to(matchName).emit("state", match.data());
    });
});