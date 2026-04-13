import React from 'react';

/**
 * Shapes component.
 * - isMobile=false (default): renders as a horizontal tray inside the player section
 * - isMobile=true          : renders as a fixed-bottom touch-friendly tray
 */
export default function Shapes({ shapes, onDragStart, draggedIndex, isMobile = false }) {
  const containerClass = isMobile ? 'shapes-tray--mobile' : 'shapes-container';

  const renderShape = (shape, index) => {
    const isDragging = draggedIndex === index;
    const matrix = shape.matrix ? shape.matrix : shape;

    return (
      <div
        key={index}
        className={`shape ${isDragging ? 'dragging' : ''}`}
        onPointerDown={(e) => {
          if (isDragging) return;
          onDragStart(e, shape, index);
        }}
      >
        {matrix.map((row, rIdx) => (
          <div key={rIdx} className="shape-row">
            {row.map((cell, cIdx) => (
              <div
                key={cIdx}
                className={`shape-cell ${cell === 0 ? 'empty' : `color-${shape.colorId || 1}`}`}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={containerClass}>
      {shapes.map((shape, index) => renderShape(shape, index))}
    </div>
  );
}
