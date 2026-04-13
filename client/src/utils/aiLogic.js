import { GRID_SIZE, canPlaceShape, placeShape, checkAndClearLines } from './gameLogic';

// Đếm số lượng ô đơn bị bao quanh (lỗ hổng)
function countHoles(board) {
  let holes = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c] === 0) {
        // Simple hole check: it's a hole if the top cell is blocked
        if (r > 0 && board[r - 1][c] > 0) {
          holes++;
        }
      }
    }
  }
  return holes;
}

export function getBestMove(board, shapes) {
  if (!shapes || shapes.length === 0) return null;

  let bestMove = null;
  let maxScore = -Infinity;

  // We only evaluate the first shape or all 3 shapes? 
  // Good AI considers all available shapes and picks the best one.
  for (let sIndex = 0; sIndex < shapes.length; sIndex++) {
    const shape = shapes[sIndex];
    const matrix = shape.matrix || shape;

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (canPlaceShape(board, matrix, r, c)) {
          // Play it in a simulation
          const tempBoard = placeShape(board, matrix, shape.colorId || 1, r, c);
          
          // Clear lines
          const { newBoard, linesCleared } = checkAndClearLines(tempBoard);

          // Evaluate
          const holes = countHoles(newBoard);
          
          // Heuristic score
          // AI wants to clear lines (+1000), avoid holes (-10)
          let evalScore = (linesCleared * 1000) - (holes * 10);
          
          // Randomness to make it pick different equally good spots
          evalScore += Math.random() * 5;

          if (evalScore > maxScore) {
            maxScore = evalScore;
            bestMove = {
              shapeIndex: sIndex,
              matrix: matrix,
              row: r,
              col: c
            };
          }
        }
      }
    }
  }

  return bestMove;
}
