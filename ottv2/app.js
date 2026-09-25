import { playhtml } from "https://unpkg.com/playhtml";

// ==================== CONSTANTS ====================
const BOARD_SIZE = 9;
const COLS = 'abcdefghi';
const PIECE_TYPES = {
  dam: { icon: '🥊', name: 'Đấm', beats: 'keo' },
  la: { icon: '🍃', name: 'Lá', beats: 'dam' },
  keo: { icon: '✂️', name: 'Kéo', beats: 'la' }
};

// ==================== GLOBAL STATE ====================
let gameData = null;
let myPlayerId = null;
let myPlayerNumber = null;
let selectedPieceId = null;
let validMoves = [];
let currentRoomId = '';

// ==================== INITIAL STATE ====================
function generateRoomId() {
  return 'room-' + Math.random().toString(36).substring(2, 8);
}

function createInitialState(roomId) {
  const pieces = {};
  const board = Array.from({length: BOARD_SIZE}, () => Array(BOARD_SIZE).fill(null));

      const p1Setup = [
        {type: 'dam', row: 0, col: 2}, {type: 'dam', row: 1, col: 6}, {type: 'dam', row: 2, col: 7},
        {type: 'la', row: 0, col: 5}, {type: 'la', row: 1, col: 8}, {type: 'la', row: 2, col: 1},
        {type: 'keo', row: 0, col: 8}, {type: 'keo', row: 1, col: 3}, {type: 'keo', row: 2, col: 4}
      ];

      const p2Setup = [
        {type: 'dam', row: 8, col: 6}, {type: 'dam', row: 7, col: 2}, {type: 'dam', row: 6, col: 1},
        {type: 'la', row: 8, col: 3}, {type: 'la', row: 7, col: 0}, {type: 'la', row: 6, col: 7},
        {type: 'keo', row: 8, col: 0}, {type: 'keo', row: 7, col: 5}, {type: 'keo', row: 6, col: 4}
      ];

    const p1Counters = {dam: 0, la: 0, keo: 0};
  p1Setup.forEach(pos => {
    p1Counters[pos.type]++;
    const id = `p1-${pos.type}-${p1Counters[pos.type]}`;
    pieces[id] = { id, player: 1, type: pos.type, row: pos.row, col: pos.col };
    board[pos.row][pos.col] = id;
  });

  const p2Counters = {dam: 0, la: 0, keo: 0};
  p2Setup.forEach(pos => {
    p2Counters[pos.type]++;
    const id = `p2-${pos.type}-${p2Counters[pos.type]}`;
    pieces[id] = { id, player: 2, type: pos.type, row: pos.row, col: pos.col };
    board[pos.row][pos.col] = id;
  });

  return {
    room: roomId,
    players: [],
    board,
    pieces,
    currentPlayer: 1,
    gameStatus: "waiting",
    winner: null,
    winnerReason: null,
    turnNumber: 0
  };
}

// ==================== GAME LOGIC ====================
function isInsideBoard(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function canCapture(attackerType, defenderType) {
  if (attackerType === defenderType) return false;
  return PIECE_TYPES[attackerType].beats === defenderType;
}

function getLegalMovesForPiece(state, pieceId) {
  const piece = state.pieces[pieceId];
  if (!piece) return [];

  const moves = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = piece.row + dr;
      const nc = piece.col + dc;
      if (!isInsideBoard(nr, nc)) continue;

      const targetId = state.board[nr][nc];
      if (!targetId) {
        moves.push({row: nr, col: nc});
      } else {
        const target = state.pieces[targetId];
        if (target.player !== piece.player && target.type !== piece.type && canCapture(piece.type, target.type)) {
          moves.push({row: nr, col: nc});
        }
      }
    }
  }
  return moves;
}

function validateMove(state, pieceId, toRow, toCol) {
  const piece = state.pieces[pieceId];
  if (!piece) return {valid: false, reason: "Quân không tồn tại"};
  if (state.gameStatus !== "playing") return {valid: false, reason: "Game chưa bắt đầu"};

  const myPlayer = state.players.find(p => p.id === myPlayerId);
  if (!myPlayer || myPlayer.playerNumber !== state.currentPlayer) {
    return {valid: false, reason: "Không phải lượt của bạn"};
  }
  if (piece.player !== myPlayer.playerNumber) {
    return {valid: false, reason: "Đây không phải quân của bạn"};
  }

  if (!isInsideBoard(toRow, toCol)) return {valid: false, reason: "Nằm ngoài bàn cờ"};

  const dr = Math.abs(toRow - piece.row);
  const dc = Math.abs(toCol - piece.col);
  if (dr > 1 || dc > 1 || (dr === 0 && dc === 0)) {
    return {valid: false, reason: "Quân chỉ được di chuyển đúng 1 ô theo 8 hướng"};
  }

  const targetId = state.board[toRow][toCol];
  if (targetId) {
    const target = state.pieces[targetId];
    if (target.player === piece.player) {
      return {valid: false, reason: "Không thể ăn quân của mình"};
    }
    if (target.type === piece.type) {
      return {valid: false, reason: "Hai quân cùng loại không thể ăn nhau"};
    }
    if (!canCapture(piece.type, target.type)) {
      return {valid: false, reason: "Quân của bạn yếu hơn"};
    }
  }

  return {valid: true};
}

function executeMove(draft, pieceId, toRow, toCol) {
  const piece = draft.pieces[pieceId];
  const fromRow = piece.row;
  const fromCol = piece.col;

  draft.board[fromRow][fromCol] = null;

  const targetId = draft.board[toRow][toCol];
  let captured = null;
  if (targetId) {
    captured = draft.pieces[targetId];
    delete draft.pieces[targetId];
  }

  piece.row = toRow;
  piece.col = toCol;
  draft.board[toRow][toCol] = pieceId;

  const opponent = piece.player === 1 ? 2 : 1;
  const opponentPieces = Object.values(draft.pieces).filter(p => p.player === opponent);
  const typesPresent = new Set(opponentPieces.map(p => p.type));
  const missingType = ['dam', 'la', 'keo'].find(t => !typesPresent.has(t));

  if (missingType) {
    draft.gameStatus = "finished";
    draft.winner = piece.player;
    const typeNames = {dam: 'Đấm', la: 'Lá', keo: 'Kéo'};
    draft.winnerReason = `Bạn đã ăn hết toàn bộ quân ${typeNames[missingType]} của đối phương!`;
  }

  if (draft.gameStatus !== "finished") {
    if ((toRow === 0 && toCol === 0) || (toRow === 8 && toCol === 8)) {
      draft.gameStatus = "finished";
      draft.winner = piece.player;
      const goalName = (toRow === 0 && toCol === 0) ? 'a1' : 'i9';
      draft.winnerReason = `Bạn đã đưa quân vào ô ${goalName}!`;
    }
  }

  if (draft.gameStatus === "playing") {
    draft.currentPlayer = opponent;
    draft.turnNumber++;
  }

  return {success: true, captured};
}

// ==================== UI RENDERING ====================
function renderBoard() {
  const boardEl = document.getElementById('board');
  const state = gameData.getData();

  boardEl.innerHTML = '';

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = row;
      cell.dataset.col = col;

      const pieceId = state.board[row][col];
      if (pieceId && state.pieces[pieceId]) {
        const piece = state.pieces[pieceId];
        const pieceEl = document.createElement('span');
        pieceEl.className = `piece player${piece.player}`;
        pieceEl.textContent = PIECE_TYPES[piece.type].icon;
        pieceEl.dataset.pieceId = pieceId;
        cell.appendChild(pieceEl);
      }

      if ((row === 0 && col === 0) || (row === 8 && col === 8)) {
        cell.classList.add('goal');
        const flag = document.createElement('span');
        flag.className = 'goal-flag';
        flag.textContent = '🏁';
        cell.appendChild(flag);
      }

      if (selectedPieceId === pieceId) {
        cell.classList.add('selected');
      }

      if (validMoves.some(m => m.row === row && m.col === col)) {
        cell.classList.add('valid-move');
      }

      cell.addEventListener('click', () => onCellClick(row, col));
      boardEl.appendChild(cell);
    }
  }
}

function renderCoordinates() {
  const header = document.getElementById('coord-header');
  const side = document.getElementById('coord-side');
  header.innerHTML = '<div class="corner"></div>' + COLS.split('').map(c => `<div class="coord">${c}</div>`).join('');
  side.innerHTML = '';
  for (let i = 1; i <= BOARD_SIZE; i++) {
    const div = document.createElement('div');
    div.className = 'coord';
    div.textContent = i;
    side.appendChild(div);
  }
}

function renderPlayerPanels() {
  const state = gameData.getData();

  ['p1', 'p2'].forEach((p, idx) => {
    const playerNum = idx + 1;
    const panel = document.getElementById(`${p}-panel`);
    const nameEl = document.getElementById(`${p}-name`);

    const player = state.players.find(pl => pl.playerNumber === playerNum);
    nameEl.textContent = player ? player.name : 'Đang chờ...';

    ['dam', 'la', 'keo'].forEach(type => {
      const count = Object.values(state.pieces).filter(p => p.player === playerNum && p.type === type).length;
      document.getElementById(`${p}-${type}`).textContent = count;
    });

    panel.classList.toggle('active', state.gameStatus === 'playing' && state.currentPlayer === playerNum);
  });

  document.getElementById('player-count').textContent = state.players.length;
  document.getElementById('turn-count').textContent = state.turnNumber;
}

function renderTurnIndicator() {
  const state = gameData.getData();
  const indicator = document.getElementById('turn-indicator');

  if (state.gameStatus === 'waiting') {
    indicator.textContent = 'ĐANG CHỜ NGƯỜI CHƠI THỨ 2...';
    indicator.className = 'turn-indicator waiting';
  } else if (state.gameStatus === 'finished') {
    indicator.textContent = `🏆 PLAYER ${state.winner} THẮNG!`;
    indicator.className = 'turn-indicator winner';
  } else {
    if (myPlayerNumber === null) {
      indicator.textContent = '👀 BẠNG QUAN SÁT';
      indicator.className = 'turn-indicator waiting';
    } else if (state.currentPlayer === myPlayerNumber) {
      indicator.textContent = '🎯 ĐẾN LƯỢT BẠN';
      indicator.className = 'turn-indicator my-turn';
    } else {
      indicator.textContent = '⏳ ĐANG CHỜ ĐỐI THỦ...';
      indicator.className = 'turn-indicator opponent-turn';
    }
  }
}

function renderAll() {
  renderBoard();
  renderPlayerPanels();
  renderTurnIndicator();

  const state = gameData.getData();
  const resetBtn = document.getElementById('reset-btn');
  const showReset = state.gameStatus === 'finished';
  resetBtn.style.display = showReset ? 'inline-block' : 'none';

  document.getElementById('room-display').textContent = currentRoomId;
  document.getElementById('room-display-footer').textContent = currentRoomId;
}

function showError(msg) {
  const indicator = document.getElementById('turn-indicator');
  indicator.textContent = `❌ ${msg}`;
  indicator.className = 'turn-indicator error';
  setTimeout(() => {
    renderTurnIndicator();
  }, 2000);
}

// ==================== EVENT HANDLERS ====================
function onCellClick(row, col) {
  const state = gameData.getData();
  if (state.gameStatus !== 'playing') return;

  const clickedPieceId = state.board[row][col];

  if (selectedPieceId) {
    if (validMoves.some(m => m.row === row && m.col === col)) {
      makeMove(selectedPieceId, row, col);
      selectedPieceId = null;
      validMoves = [];
      renderAll();
      return;
    }

    if (clickedPieceId && state.pieces[clickedPieceId]) {
      const piece = state.pieces[clickedPieceId];
      const myPlayer = state.players.find(p => p.id === myPlayerId);
      if (myPlayer && piece.player === myPlayer.playerNumber && state.currentPlayer === piece.player) {
        selectedPieceId = clickedPieceId;
        validMoves = getLegalMovesForPiece(state, clickedPieceId);
        renderAll();
        return;
      }
    }

    selectedPieceId = null;
    validMoves = [];
    renderAll();
    return;
  }

  if (clickedPieceId && state.pieces[clickedPieceId]) {
    const piece = state.pieces[clickedPieceId];
    const myPlayer = state.players.find(p => p.id === myPlayerId);
    if (myPlayer && piece.player === myPlayer.playerNumber && state.currentPlayer === piece.player) {
      selectedPieceId = clickedPieceId;
      validMoves = getLegalMovesForPiece(state, clickedPieceId);
      renderAll();
    }
  }
}

function makeMove(pieceId, toRow, toCol) {
  const state = gameData.getData();
  const validation = validateMove(state, pieceId, toRow, toCol);
  if (!validation.valid) {
    showError(validation.reason);
    return;
  }

  gameData.setData((draft) => {
    executeMove(draft, pieceId, toRow, toCol);
  });
}

    function joinGame() {
      if (!gameData) return;

      const nameInput = document.getElementById('player-name');
      const name = nameInput.value.trim() || `Player ${gameData.getData().players.length + 1}`;

      gameData.setData((draft) => {
        const existing = draft.players.find(p => p.id === myPlayerId);
        if (existing) return;

        if (draft.players.length >= 2) return;

        draft.players.push({
          id: myPlayerId,
          name: name,
          joinedAt: Date.now()
        });

        draft.players.sort((a, b) => a.joinedAt - b.joinedAt);
        draft.players.forEach((p, i) => {
          p.playerNumber = i + 1;
        });

        if (draft.players.length === 2) {
          draft.gameStatus = "playing";
          draft.currentPlayer = 1;
        }
      });

      const state = gameData.getData();
      myPlayerNumber = state.players.find(p => p.id === myPlayerId)?.playerNumber || null;
      showGameScreen();
      renderAll();
    }

    function resetGame() {
      if (!gameData) return;

      gameData.setData((draft) => {
        draft.players.forEach((p, i) => {
          p.playerNumber = i + 1;
        });

        const newState = createInitialState(draft.room);
        draft.board = newState.board;
        draft.pieces = newState.pieces;
        draft.currentPlayer = 1;
        draft.gameStatus = "playing";
        draft.winner = null;
        draft.winnerReason = null;
        draft.turnNumber = 0;
      });

      selectedPieceId = null;
      validMoves = [];
      renderAll();
    }

// ==================== SCREEN MANAGEMENT ====================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showGameScreen() {
  showScreen('game');
  document.getElementById('room-display').textContent = currentRoomId;
  document.getElementById('room-display-footer').textContent = currentRoomId;
}

// ==================== PLAYHTML INIT ====================
async function initGame() {
  try {
    await playhtml.init({
      room: currentRoomId
    });

    await playhtml.ready;

    const initialState = createInitialState(currentRoomId);
    gameData = playhtml.createPageData("ottv2-game", initialState);

    let state = gameData.getData();
    if (!state || !state.board) {
      gameData.setData(initialState);
      state = initialState;
    }

    gameData.onUpdate(() => {
      selectedPieceId = null;
      validMoves = [];
      renderAll();
    });

    myPlayerId = sessionStorage.getItem('ottv2-player-id');
    if (!myPlayerId) {
      myPlayerId = 'p-' + Math.random().toString(36).substring(2, 11);
      sessionStorage.setItem('ottv2-player-id', myPlayerId);
    }

    const existingPlayer = state.players.find(p => p.id === myPlayerId);
    if (existingPlayer) {
      myPlayerNumber = existingPlayer.playerNumber;
      showGameScreen();
      renderAll();
    } else {
      showScreen('lobby');
    }

  } catch (err) {
    console.error('PlayHTML init failed:', err);
    document.getElementById('lobby-status').textContent = 'Không thể kết nối đến PlayHTML. Vui lòng thử lại.';
    document.getElementById('lobby-status').style.display = 'block';
    showScreen('lobby');
  }
}

// ==================== URL / ROOM MANAGEMENT ====================
function getRoomFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('room');
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', () => {
  const urlRoom = getRoomFromUrl();
  currentRoomId = urlRoom || generateRoomId();

  if (!urlRoom) {
    window.history.replaceState({}, '', `?room=${currentRoomId}`);
  }

  document.getElementById('room-id').value = currentRoomId;

      document.getElementById('generate-room').addEventListener('click', () => {
        currentRoomId = generateRoomId();
        window.location.href = `?room=${currentRoomId}`;
      });

  document.getElementById('copy-link').addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      const status = document.getElementById('lobby-status');
      status.textContent = 'Đã sao chép link phòng!';
      status.style.display = 'block';
      setTimeout(() => { status.style.display = 'none'; }, 2000);
    }).catch(() => {
      alert('Link phòng: ' + window.location.href);
    });
  });

  document.getElementById('join-btn').addEventListener('click', joinGame);
  document.getElementById('reset-btn').addEventListener('click', resetGame);

  document.getElementById('player-name').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinGame();
  });

  renderCoordinates();
  initGame();
});
