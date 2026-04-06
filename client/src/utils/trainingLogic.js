import { createEmptyBoard, SHAPES, GRID_SIZE } from './gameLogic';

const createFilledBoardWithHole = () => {
  const b = createEmptyBoard();
  // Fill the bottom row completely EXCEPT the first cell
  for (let c = 1; c < GRID_SIZE; c++) {
    b[GRID_SIZE - 1][c] = 1;
  }
  return b;
};

const createCrossComboBoard = () => {
  const b = createEmptyBoard();
  // We want to leave a 2x2 hole in the middle, and fill the rows/cols aligned to it
  // Actually a simpler combo: Fill row 6 leaving cols 3,4. Fill row 7 leaving cols 3,4.
  // The player gets a 2x2 shape to clear 2 rows at once.
  for (let c = 0; c < GRID_SIZE; c++) {
    if (c !== 3 && c !== 4) {
      b[6][c] = 1;
      b[7][c] = 1;
    }
  }
  return b;
};

export const TRAINING_STEPS = [
  {
    stepIndex: 1,
    message: 'Chào mừng bạn! Hãy thử nắm kéo khối gạch bên dưới và thả vào bất cứ đâu trên lưới.',
    board: createEmptyBoard(),
    shapes: [SHAPES[0]], // 1x1 dot
    goal: 'DROP_ANY'
  },
  {
    stepIndex: 2,
    message: 'Ngon lắm! Giờ hãy lấp đầy đoạn khuyết này để ăn sạch một hàng ngang!',
    board: createFilledBoardWithHole(),
    shapes: [SHAPES[0]], // 1x1 dot
    goal: 'CLEAR_LINE'
  },
  {
    stepIndex: 3,
    message: 'Ghi nhớ: Xóa từ 2 hàng trở lên cùng lúc (Combo) sẽ được x100 Điểm! Lấy khối 2x2 thả vào rãnh nào.',
    board: createCrossComboBoard(),
    shapes: [SHAPES[1]], // 2x2 square
    goal: 'CLEAR_LINE'
  },
  {
    stepIndex: 4,
    message: '🎉 Bài huấn luyện kết thúc! Bạn đã sẵn sàng để tranh hạng cùng hàng triệu người chơi khác! Hãy dọn sạch bàn nếu muốn lấy điểm cao nhé.',
    board: null, // Keep the board from previous
    shapes: null, // Triggers standard mode inside Game.jsx
    goal: 'GRADUATE'
  }
];
