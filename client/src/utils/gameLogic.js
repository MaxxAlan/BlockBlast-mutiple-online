export const GRID_SIZE = 8;

export const SHAPES = [
  { matrix: [[1]], colorId: 1 },
  { matrix: [[1, 1], [1, 1]], colorId: 2 },
  { matrix: [[1, 1, 1]], colorId: 3 },
  { matrix: [[1], [1], [1]], colorId: 4 },
  { matrix: [[1, 1, 1, 1]], colorId: 5 },
  { matrix: [[1], [1], [1], [1]], colorId: 6 },
  { matrix: [[1, 0], [1, 0], [1, 1]], colorId: 7 },
  { matrix: [[0, 1], [0, 1], [1, 1]], colorId: 8 },
  { matrix: [[1, 1, 1], [0, 1, 0]], colorId: 9 },
  { matrix: [[1, 0], [0, 1]], colorId: 10 },
  { matrix: [[0, 1], [1, 0]], colorId: 11 },
  { matrix: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], colorId: 12 },
  { matrix: [[0, 0, 1], [0, 1, 0], [1, 0, 0]], colorId: 13 },
  { matrix: [[1, 1, 1], [1, 1, 1]], colorId: 14 },
  { matrix: [[1, 1], [1, 1], [1, 1]], colorId: 15 },
  { matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], colorId: 16 },
  { matrix: [[1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1]], colorId: 17 },
  { matrix: [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1]], colorId: 18 }
];

export const createEmptyBoard = () => {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
};

export const getRandomShapes = (count = 3, currentScore = 0) => {
  let pool = [0, 1, 2, 3, 6, 7]; // Starter: dot, 2x2, 3-line, L-shapes

  if (currentScore >= 100) {
    // Phase 2: Add 4-lines, T shape, small diagonals (2x2 diag)
    pool.push(4, 5, 8, 9, 10);
  }
  if (currentScore >= 300) {
    // Phase 3: Add more weight to big shapes and add 2x3 blocks + large diagonals
    pool.push(1, 4, 5, 6, 7, 8, 11, 12, 13, 14);
  }
  if (currentScore >= 600) {
    // Phase 4: Even more weight to big shapes, add 3x3 block and massive 2x6 blocks
    pool.push(1, 4, 4, 5, 5, 6, 7, 8, 13, 14, 15, 16, 17);
  }

  return Array.from({ length: count }, () => {
    const shapeIndex = pool[Math.floor(Math.random() * pool.length)];
    return SHAPES[shapeIndex];
  });
};

export const canPlaceShape = (board, shape, row, col) => {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c] === 1) {
        if (row + r < 0 || row + r >= GRID_SIZE || col + c < 0 || col + c >= GRID_SIZE) {
          return false; // Out of bounds
        }
        if (board[row + r][col + c] > 0) {
          return false; // Overlapping existing block
        }
      }
    }
  }
  return true;
};

export const placeShape = (board, shape, colorId, row, col) => {
  const newBoard = board.map(row => [...row]);
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c] === 1) {
        newBoard[row + r][col + c] = colorId || 1;
      }
    }
  }
  return newBoard;
};

export const checkAndClearLines = (board) => {
  let linesCleared = 0;
  const rowsToClear = [];
  const colsToClear = [];

  // Check rows
  for (let r = 0; r < GRID_SIZE; r++) {
    if (board[r].every(cell => cell > 0)) {
      rowsToClear.push(r);
    }
  }

  // Check cols
  for (let c = 0; c < GRID_SIZE; c++) {
    let fullCol = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (board[r][c] === 0) {
        fullCol = false;
        break;
      }
    }
    if (fullCol) colsToClear.push(c);
  }

  linesCleared = rowsToClear.length + colsToClear.length;
  
  if (linesCleared === 0) {
    return { newBoard: board, linesCleared: 0 };
  }

  const newBoard = board.map(row => [...row]);
  
  // Clear them
  rowsToClear.forEach(r => {
    for (let c = 0; c < GRID_SIZE; c++) {
      newBoard[r][c] = 0;
    }
  });

  colsToClear.forEach(c => {
    for (let r = 0; r < GRID_SIZE; r++) {
      newBoard[r][c] = 0;
    }
  });

  return { newBoard, linesCleared };
};

export const checkGameOver = (board, currentShapes) => {
  if (currentShapes.length === 0) return false;
  
  for (const shape of currentShapes) {
    // Handle both raw matrix arrays and {matrix} objects
    const matrix = shape?.matrix ?? shape;
    if (!matrix) continue;
    let canPlaceThisShape = false;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (canPlaceShape(board, matrix, r, c)) {
          canPlaceThisShape = true;
          break;
        }
      }
      if (canPlaceThisShape) break;
    }
    if (canPlaceThisShape) return false; // Thể loại này vẫn đặt được
  }
  
  return true; // Không còn shape nào đặt được
};
