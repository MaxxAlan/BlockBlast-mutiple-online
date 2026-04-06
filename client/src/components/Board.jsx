import React from 'react';
import { GRID_SIZE } from '../utils/gameLogic';

export default function Board({ board, isOpponent, previewState, clearingCells = new Set() }) {
  // Ghost preview is now rendered as exact block shapes below
  return (
    <div className={`grid-container ${isOpponent ? 'opponent-grid' : ''}`}>
      {board.map((rowArr, rowIndex) =>
        rowArr.map((cellValue, colIndex) => {
          const clearing = clearingCells.has(`${rowIndex}-${colIndex}`);
          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={[
                'grid-cell',
                cellValue === 1 ? 'filled'        : '',
                clearing        ? 'clearing'      : '',
              ].filter(Boolean).join(' ')}
              data-row={rowIndex}
              data-col={colIndex}
              style={{
                gridRowStart: rowIndex + 1,
                gridColumnStart: colIndex + 1
              }}
            />
          );
        })
      )}

      {/* BLOCK-LEVEL GHOST PREVIEW */}
      {!isOpponent && previewState && previewState.matrix && previewState.matrix.map((rowArr, rIdx) => 
        rowArr.map((cellValue, cIdx) => {
          if (cellValue === 1) {
             return (
               <div
                 key={`preview-${rIdx}-${cIdx}`}
                 className="preview-shape-cell"
                 style={{
                    gridRowStart: previewState.row + rIdx + 1,
                    gridColumnStart: previewState.col + cIdx + 1,
                 }}
               />
             );
          }
          return null;
        })
      )}
    </div>
  );
}
