# C-C-O

After completing the Asteroids project, I became interested in learning how to code directly in native browser languages. This is the most complex project I have tackled to date, leveraging many technologies such as HTML, Javascript, CSS, JQuery, JQuery UI, Bootstrap, Node.js, and Socket.io.

C-C-O is a game that incorporate elements from four well-known games: Chess, Checkers, Othello, and Tic-Tac-Toe. The board looks mostly like a Chess board, but the following rules apply:

* All regular Chess rules apply. This includes castling, promotion, en passant, 3-fold repetition, 50-move rule, and stalemates.
* Checkers jump rules mostly apply. Any piece can jump an opposite color piece forwards and diagonally, not backwards. Multiple jumps can be chained together in a single move, and you must jump all the way to the end when possible. If multiple jump paths are possible, you can choose any one of them. Unlike in Checkers, jumps are not forced when available, but only add to Chess move options. There is no Checkers-style promotion, but Pawns will follow Chess promotion rules if they reach the opposite end via Checkers captures. Checkers regular movement rules do not apply.
* Othello flip rules apply after every move. Any opponent piece(s) flanked on both ends with no gaps (including diagonally) by the player that just made the move will flip colors and now belong to that player. If a King flips colors in this fashion, the overall game ends in favor of the player who caused it. If a Pawn flips color, it must now move in the direction of the Pawns of the new color. Flipped pieces can immediately cause checkmates or stalemates against the opposing king.
* Tic-tac-toe rules apply in the highlighted 3x3 region on the board. This region is randomized every game but will always be between the 3rd and 6th Chess ranks. Any Rook, Queen, or King piece counts as a tic-tac-toe piece and any player who places 3 such pieces in a row in any direction in the region wins the overall game immediately. Othello rules do not apply in this region, so no pieces can flip there. Chess rules and Checkers jump rules still apply in the region.

Play a Demo [here](https://daniel-chen.net/index.php/cco).

You can either play a friend on the same board or host a multiplayer game over the internet. Simply create a match in the lobby and wait for other players to join. You can also join other players' games that are listed in "Available Matches".
