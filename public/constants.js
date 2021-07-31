// Shared constants between client and server.
(function(exports) {
    const WHITE = 1;
    const BLACK = -1;
    const DEBUG = false;

    // Returns the word corresponding to a color int.
    function getColorName(color) {
        return parseInt(color) === WHITE ? "white" : "black";
    }

    // Get the piece name given the piece code.
    function getPieceName(pieceCode) {
        switch (parseInt(pieceCode)) {
            case 1:
                return "pawn";
            case 2:
                return "knight";
            case 3:
                return "bishop";
            case 4:
                return "rook";
            case 5:
                return "queen";
            case 6:
                return "king";
            default:
                return null;
        }
    }

    // Get the piece code given the piece name.
    function getPieceCode(pieceName) {
        switch (pieceName) {
            case "pawn":
                return 1;
            case "knight":
                return 2;
            case "bishop":
                return 3;
            case "rook":
                return 4;
            case "queen":
                return 5;
            case "king":
                return 6;
            default:
                return -1;
        }
    }

    exports.WHITE = WHITE;
    exports.BLACK = BLACK;
    exports.DEBUG = DEBUG;
    exports.getColorName = getColorName;
    exports.getPieceName = getPieceName;
    exports.getPieceCode = getPieceCode;

})(typeof exports === 'undefined'? 
            this['shared']={}: exports);
