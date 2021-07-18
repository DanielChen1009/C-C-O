# C-C-O

After completing the Asteroids project, I became interested in learning how to code directly in native browser languages. This is the most complex project I have tackled to date, leveraging many technologies such as HTML, Javascript, CSS, JQuery, JQuery UI, Bootstrap, Node.js, and Socket.io.

C-C-O is a game that incorporate elements from four well-known games: Chess, Checkers, Othello, and Tic-Tac-Toe. The board looks mostly like a Chess board, but the following rules apply:

* All regular Chess rules apply. This includes castling, promotion, en passant, 3-fold repetition, 50-move rule, stalemates, etc.
* Checkers capture rules apply. Any piece can capture an opposite color piece by jumping over them diagonally. If such a capture can be taken you must do so. Multiple captures can be chained together in one move, and you must chain when able. If multiple capture options are possible, you can choose any one of them. There is no king promotion if a piece reaches the opposite end, but Pawns will follow Chess promotion rules if it reaches the other end via Checkers captures.
* Othello rules apply after a move a made. Any piece(s) sandwiched between opposite color pieces in any direction switch their colors. If a King switches colors in this fashion, the game ends in favor of the player who caused it. If a Pawn switches color, it must now move in the direction of the Pawns of that color.
* Tic-tac-toe rules apply in the highlighted 3x3 region on the board. Any Rook, Queen, or King piece counts as a tic-tac-toe piece and any player who places 3 such pieces in a row in any direction in the region wins the game immediately. Othello rules do not apply in this region, so no pieces will switch colors there.

Play a Demo [here](https://c-c-o.herokuapp.com).

You can either play a friend on the same board or host a multiplayer game over the internet. Simply create a match in the lobby and wait for other players to join. You can also join other players' games that are listed in "Available Matches".
