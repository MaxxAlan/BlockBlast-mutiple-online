import { createEmptyBoard, SHAPES, GRID_SIZE } from './gameLogic';

const createFilledBoardWithHole = () => {
  const b = createEmptyBoard();
  for (let c = 1; c < GRID_SIZE; c++) {
    b[GRID_SIZE - 1][c] = 1;
  }
  return b;
};

const createCrossComboBoard = () => {
  const b = createEmptyBoard();
  for (let c = 0; c < GRID_SIZE; c++) {
    if (c !== 3 && c !== 4) {
      b[6][c] = 1;
      b[7][c] = 1;
    }
  }
  return b;
};

const createRotateBoard = () => {
  const b = createEmptyBoard();
  for (var c = 0; c < GRID_SIZE; c++) {
    if (c < 2 || c > 5) {
      b[GRID_SIZE - 1][c] = 1; // Leave 4 horizontal spaces at the bottom center: cols 2,3,4,5
    }
  }
  return b;
}

const createIntersectingClearBoard = () => {
  const b = createEmptyBoard();
  // Fill everything except row 4 and col 4 to create a satisfying master clear
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      b[r][c] = 1;
    }
  }
  for (let r = 0; r < GRID_SIZE; r++) { b[r][4] = 0; }
  for (let c = 0; c < GRID_SIZE; c++) { b[4][c] = 0; }
  // Provide a T-shape or a Cross, wait, the intersection hole is a cross?
  // Row 4 is completely empty, Col 4 is completely empty.
  // Actually, that requires putting a lot of blocks, let's just make a simple cross gap.
  // Fill row 5, leave a 3-block gap.
  const b2 = createEmptyBoard();
  for (let c = 0; c < GRID_SIZE; c++) { if (c < 2 || c > 4) b2[5][c] = 1; }
  for (let r = 2; r < GRID_SIZE; r++) { if (r !== 5) b2[r][3] = 1; }
  // Now there is a horizontal gap of 3 at row 5 (cols 2,3,4) and vertical gap at col 3
  return b2;
};

export const TRAINING_STEPS = [
  {
    stepIndex: 1,
    message: 'Chào mừng bạn! Hãy thử nắm khối gạch bên dưới và thả vào bất cứ đâu trên lưới.',
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
    message: 'Ghi nhớ: Xóa từ 2 hàng trở lên cùng lúc (Combo) sẽ được x100 Điểm! Thả khối vuông vào đây.',
    board: createCrossComboBoard(),
    shapes: [SHAPES[1]], // 2x2 square
    goal: 'CLEAR_LINE'
  },
  {
    stepIndex: 4,
    message: 'Kỹ năng Xoay khối: Bạn có thể Click Chuột Phải hoặc nhấn Phím Space để xoay khối trước khi đặt! Hãy xoay khối ngang ra để lọt khe này.',
    board: createRotateBoard(),
    shapes: [SHAPES[5]], // 4x1 vertical stick (id: 6) -> needs rotation
    goal: 'CLEAR_LINE'
  },
  {
    stepIndex: 5,
    message: 'Kỹ năng Vét cạn (Cross-clear): Hãy đặt khối vào Điểm Giao Cắt để phá hủy đồng thời cả Hàng dọc và Hàng ngang!',
    board: createIntersectingClearBoard(),
    shapes: [SHAPES[2]], // 3x1 horizontal
    goal: 'CLEAR_LINE'
  },
  {
    stepIndex: 6,
    message: '🎉 Bài huấn luyện kết thúc! Bạn đã sẵn sàng để tranh tài cùng hàng triệu người chơi khác! Hãy dọn sạch bàn nếu muốn lấy điểm cao nhé.',
    board: null, 
    shapes: null, 
    goal: 'GRADUATE'
  }
];
