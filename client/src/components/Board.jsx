import React from 'react';
import { GRID_SIZE } from '../utils/gameLogic';

export default function Board({ board, isOpponent, previewState, clearingCells = new Set() }) {
  const isPreviewed = (r, c) => {
    if (isOpponent || !previewState || !previewState.matrix) return false;
    const { row: pRow, col: pCol, matrix } = previewState;
    if (pRow === null || pCol === null) return false;
    const localR = r - pRow;
    const localC = c - pCol;
    if (localR >= 0 && localR < matrix.length && localC >= 0 && localC < matrix[0].length) {
      return matrix[localR][localC] === 1;
    }
    return false;
  };

  return (
    <div className={`grid-container ${isOpponent ? 'opponent-grid' : ''}`}>
      {board.map((rowArr, rowIndex) =>
        rowArr.map((cellValue, colIndex) => {
          const preview  = isPreviewed(rowIndex, colIndex);
          const clearing = clearingCells.has(`${rowIndex}-${colIndex}`);
          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={[
                'grid-cell',
                cellValue === 1 ? 'filled'        : '',
                preview         ? 'preview-ghost' : '',
                clearing        ? 'clearing'      : '',
              ].filter(Boolean).join(' ')}
              data-row={rowIndex}
              data-col={colIndex}
            />
          );
        })
      )}
    </div>
  );
}
