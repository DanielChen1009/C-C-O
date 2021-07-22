# C-C-O

After completing the Asteroids project, I became interested in learning how to code directly in native browser languages. This is the most complex project I have tackled to date, leveraging many technologies such as HTML, Javascript, CSS, JQuery, JQuery UI, Bootstrap, Node.js, and Socket.io.

C-C-O is a game that incorporate elements from four well-known games: Chess, Checkers, Othello, and Tic-Tac-Toe. The board looks mostly like a Chess board, but the following rules apply:

* All regular Chess rules apply. This includes castling, promotion, en passant, 3-fold repetition, 50-move rule, stalemates, etc.
* Checkers jump rules apply. Any piece can jump an opposite color piece forwards and diagonally. If such a jump can be taken you must do so, unlessyou are in check from Chess rules. Multiple jumps can be chained together by one piece, and you must do so when able. If multiple capture options are possible, you can choose any one of them. There is no king promotion if a piece reaches the opposite end, but Pawns will follow Chess promotion rules if it reaches the other end via Checkers captures. Pieces only jump like Checkers pieces, but do not move like them. They move according to Chess rules.
* Othello flip rules apply after every move. Any opponent piece(s) flanked on both ends with no gaps (including diagonally) by the player that just made the move will flip their color and now belong to that player. If a King flips colors in this fashion, the overall game ends in favor of the player who caused it. If a Pawn flips color, it must now move in the direction of the Pawns of that color.
* Tic-tac-toe rules apply in the highlighted 3x3 region on the board. This region is randomized every game but will always be between the 3rd and 6th Chess ranks. Any Rook, Queen, or King piece counts as a tic-tac-toe piece and any player who places 3 such pieces in a row in any direction in the region wins the overall game immediately. Othello rules do not apply in this region, so no pieces can flip there.

Play a Demo [here](https://daniel-chen.net/index.php/cco).

You can either play a friend on the same board or host a multiplayer game over the internet. Simply create a match in the lobby and wait for other players to join. You can also join other players' games that are listed in "Available Matches".
