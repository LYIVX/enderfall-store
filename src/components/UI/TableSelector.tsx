"use client";

import React, { useState, forwardRef } from 'react';
import styles from './TableSelector.module.css';
import Button from './Button';

interface TableSelectorProps {
  onSelect: (rows: number, cols: number) => void;
  onCancel: () => void;
}

const TableSelector = forwardRef<HTMLDivElement, TableSelectorProps>(
  ({ onSelect, onCancel }, ref) => {
    const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
    const maxRows = 8;
    const maxCols = 8;

    const handleMouseEnter = (row: number, col: number) => {
      setHoveredCell({ row, col });
    };

    const handleMouseLeave = () => {
      setHoveredCell(null);
    };

    const handleClick = () => {
      if (hoveredCell) {
        onSelect(hoveredCell.row + 1, hoveredCell.col + 1);
      }
    };

    return (
      <div 
        ref={ref}
        className={styles.tableSelectorContainer} 
        onMouseLeave={handleMouseLeave}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.tableSelectorHeader}>
          {hoveredCell ? `${hoveredCell.row + 1} × ${hoveredCell.col + 1} Table` : 'Select Table Size'}
        </div>
        
        <div className={styles.tableSelectorGrid}>
          {Array.from({ length: maxRows }).map((_, rowIndex) => (
            <div key={`row-${rowIndex}`} className={styles.tableSelectorRow}>
              {Array.from({ length: maxCols }).map((_, colIndex) => (
                <div
                  key={`cell-${rowIndex}-${colIndex}`}
                  className={`${styles.tableSelectorCell} ${
                    hoveredCell &&
                    rowIndex <= hoveredCell.row &&
                    colIndex <= hoveredCell.col
                      ? styles.selected
                      : ''
                  }`}
                  onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                  onClick={handleClick}
                />
              ))}
            </div>
          ))}
        </div>
        
        <div className={styles.tableSelectorFooter}>
          <Button 
            variant="secondary"
            size="small"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }
);

TableSelector.displayName = 'TableSelector';

export default TableSelector; 