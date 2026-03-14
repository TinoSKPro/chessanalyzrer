// YEAR IN FOOTER
document.addEventListener("DOMContentLoaded", function () {
  var yearSpan = document.getElementById("year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
});

// GLOBALS
var game;
var board;
var heroBoard;

// Simple piece values for material evaluation
var pieceValues = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0
};

// Center squares for basic center control evaluation
var centerSquares = ["d4", "e4", "d5", "e5"];

// Store last material evaluation to detect blunders
var lastMaterialEval = 0;

// INIT
document.addEventListener("DOMContentLoaded", function () {
  game = new Chess();

  board = Chessboard("board", {
    draggable: true,
    position: "start",
    moveSpeed: "fast",
    snapbackSpeed: 150,
    snapSpeed: 100,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd
  });

  heroBoard = Chessboard("hero-board", {
    draggable: false,
    position: "start"
  });

  updateAll();
});

// SCROLL TO SECTION
function scrollToSection(id) {
  var el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth" });
  }
}

// ON DROP
function onDrop(source, target) {
  var move = game.move({
    from: source,
    to: target,
    promotion: "q"
  });

  if (move === null) return "snapback";

  handleMove(move);
}

// AFTER SNAP
function onSnapEnd() {
  board.position(game.fen());
}

// HANDLE MOVE
function handleMove(move) {
  addMoveToHistory();
  analyzeMove(move);
  updateAll();
}

// RESET POSITION
function resetPosition() {
  game.reset();
  board.position("start");
  clearMoveHistory();
  clearAnalysisLog();
  lastMaterialEval = 0;
  updateAll("Position reset. Start a new analysis.");
}

// UNDO MOVE
function undoMove() {
  var move = game.undo();
  if (move) {
    board.position(game.fen());
    addMoveToHistory(); // rebuild history
    logMessage("Move undone: " + move.san);
    updateAll("Last move undone.");
  }
}

// SET START POSITION
function setStartPosition() {
  game.reset();
  board.position("start");
  clearMoveHistory();
  clearAnalysisLog();
  lastMaterialEval = 0;
  updateAll("Standard starting position loaded.");
}

// LOAD FEN FROM INPUT
function loadFenFromInput() {
  var fenInput = document.getElementById("fen-input");
  if (!fenInput) return;

  var fen = fenInput.value.trim();
  if (!fen) {
    logMessage("No FEN provided.");
    return;
  }

  var loaded = game.load(fen);
  if (!loaded) {
    logMessage("Invalid FEN string.");
    updateStatus("Invalid FEN.");
    return;
  }

  board.position(game.fen());
  clearMoveHistory();
  clearAnalysisLog();
  lastMaterialEval = 0;
  updateAll("FEN loaded successfully.");
}

// UPDATE EVERYTHING
function updateAll(customStatus) {
  updateStatus(customStatus);
  updateMaterial();
  updateCenterControl();
  updatePositionComment();
}

// STATUS
function updateStatus(customMessage) {
  var statusEl = document.getElementById("status-indicator");
  var turnEl = document.getElementById("turn-indicator");
  if (!statusEl || !turnEl) return;

  var moveColor = game.turn() === "w" ? "White" : "Black";
  turnEl.textContent = moveColor;

  var status = "Game in progress";

  if (game.in_checkmate()) {
    status = "Checkmate – " + (moveColor === "White" ? "Black" : "White") + " wins.";
    logMessage("Checkmate detected.");
  } else if (game.in_draw()) {
    status = "Draw – stalemate or repetition.";
    logMessage("Draw detected.");
  } else if (game.in_check()) {
    status = "Game in progress – " + moveColor + " is in check.";
    logMessage(moveColor + " is in check.");
  }

  if (customMessage) {
    status = customMessage;
  }

  statusEl.textContent = status;
}

// MATERIAL EVALUATION
function updateMaterial() {
  var whiteEl = document.getElementById("material-white");
  var blackEl = document.getElementById("material-black");
  var evalEl = document.getElementById("material-eval");
  if (!whiteEl || !blackEl || !evalEl) return;

  var boardState = game.board();
  var whiteScore = 0;
  var blackScore = 0;

  for (var r = 0; r < 8; r++) {
    for (var c = 0; c < 8; c++) {
      var piece = boardState[r][c];
      if (piece) {
        var val = pieceValues[piece.type] || 0;
        if (piece.color === "w") whiteScore += val;
        else blackScore += val;
      }
    }
  }

  whiteEl.textContent = whiteScore;
  blackEl.textContent = blackScore;

  var diff = whiteScore - blackScore;
  var evalText = "Equal";

  if (diff > 0) evalText = "White +" + diff;
  else if (diff < 0) evalText = "Black +" + Math.abs(diff);

  evalEl.textContent = evalText;
}

// CENTER CONTROL
function updateCenterControl() {
  var whiteEl = document.getElementById("center-white");
  var blackEl = document.getElementById("center-black");
  var verdictEl = document.getElementById("center-verdict");
  if (!whiteEl || !blackEl || !verdictEl) return;

  var whiteControl = 0;
  var blackControl = 0;

  centerSquares.forEach(function (sq) {
    var attackersWhite = game.moves({ square: sq, verbose: true }).filter(function (m) {
      return m.color === "w";
    }).length;

    var attackersBlack = game.moves({ square: sq, verbose: true }).filter(function (m) {
      return m.color === "b";
    }).length;

    whiteControl += attackersWhite;
    blackControl += attackersBlack;
  });

  whiteEl.textContent = whiteControl;
  blackEl.textContent = blackControl;

  var verdict = "Balanced";
  if (whiteControl > blackControl) verdict = "White controls center";
  else if (blackControl > whiteControl) verdict = "Black controls center";

  verdictEl.textContent = verdict;
}

// POSITION COMMENT
function updatePositionComment() {
  var commentEl = document.getElementById("position-comment");
  if (!commentEl) return;

  var comment = "Explore the position. Material, center control, and basic status are shown above.";

  if (game.in_checkmate()) {
    comment = "The game is over by checkmate. Review the final moves to see how the attack was built.";
  } else if (game.in_draw()) {
    comment = "The game ended in a draw. Look for missed chances or improvements earlier in the game.";
  } else if (game.in_check()) {
    comment = "The side to move is in check. Evaluate defensive resources and counterplay.";
  } else {
    var materialInfo = getMaterialDiffText();
    comment = "Position is ongoing. " + materialInfo + " Check center control and potential tactics.";
  }

  commentEl.textContent = comment;
}

// MATERIAL DIFF TEXT
function getMaterialDiffText() {
  var boardState = game.board();
  var whiteScore = 0;
  var blackScore = 0;

  for (var r = 0; r < 8; r++) {
    for (var c = 0; c < 8; c++) {
      var piece = boardState[r][c];
      if (piece) {
        var val = pieceValues[piece.type] || 0;
        if (piece.color === "w") whiteScore += val;
        else blackScore += val;
      }
    }
  }

  var diff = whiteScore - blackScore;
  if (diff > 0) return "White is up " + diff + " points of material.";
  if (diff < 0) return "Black is up " + Math.abs(diff) + " points of material.";
  return "Material is equal.";
}

// MOVE HISTORY
function addMoveToHistory() {
  var historyEl = document.getElementById("move-history");
  if (!historyEl) return;

  var moves = game.history({ verbose: true });
  historyEl.innerHTML = "";

  for (var i = 0; i < moves.length; i += 2) {
    var li = document.createElement("li");
    var moveNumber = i / 2 + 1;

    var whiteMove = moves[i] ? moves[i].san : "";
    var blackMove = moves[i + 1] ? moves[i + 1].san : "";

    var spanNumber = document.createElement("span");
    spanNumber.textContent = moveNumber + ".";
    spanNumber.style.minWidth = "24px";

    var spanWhite = document.createElement("span");
    spanWhite.textContent = whiteMove;

    var spanBlack = document.createElement("span");
    spanBlack.textContent = blackMove;

    li.appendChild(spanNumber);
    li.appendChild(spanWhite);
    li.appendChild(spanBlack);

    historyEl.appendChild(li);
  }
}

function clearMoveHistory() {
  var historyEl = document.getElementById("move-history");
  if (historyEl) historyEl.innerHTML = "";
}

// ANALYSIS LOG
function logMessage(text) {
  var logEl = document.getElementById("analysis-log");
  if (!logEl) return;

  var entry = document.createElement("div");
  entry.className = "analysis-log-entry";
  entry.textContent = text;

  logEl.appendChild(entry);
  logEl.scrollTop = logEl.scrollHeight;
}

function clearAnalysisLog() {
  var logEl = document.getElementById("analysis-log");
  if (logEl) logEl.innerHTML = "";
}

// MOVE ANALYSIS (SIMPLE BLUNDER CHECK)
function analyzeMove(move) {
  var currentEval = getNumericMaterialEval();
  if (lastMaterialEval !== 0) {
    var diff = currentEval - lastMaterialEval;
    // If evaluation drops by 2 or more points for the side that moved, flag as potential blunder
    var moverColor = move.color === "w" ? "White" : "Black";
    if (moverColor === "White" && diff <= -2) {
      logMessage("Potential blunder by White: material dropped by " + Math.abs(diff) + " points.");
    } else if (moverColor === "Black" && diff >= 2) {
      logMessage("Potential blunder by Black: material dropped by " + Math.abs(diff) + " points.");
    }
  }
  lastMaterialEval = currentEval;
}

// NUMERIC MATERIAL EVAL (WHITE - BLACK)
function getNumericMaterialEval() {
  var boardState = game.board();
  var whiteScore = 0;
  var blackScore = 0;

  for (var r = 0; r < 8; r++) {
    for (var c = 0; c < 8; c++) {
      var piece = boardState[r][c];
      if (piece) {
        var val = pieceValues[piece.type] || 0;
        if (piece.color === "w") whiteScore += val;
        else blackScore += val;
      }
    }
  }

  return whiteScore - blackScore;
}
