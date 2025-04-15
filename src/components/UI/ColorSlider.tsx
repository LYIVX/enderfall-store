"use client";

import React, { useState, useRef, useEffect } from 'react';
import styles from './ColorSlider.module.css';

interface ColorStop {
  color: string;
  position: number;
}

interface ColorSliderProps {
  colors: ColorStop[];
  activeColorIndex: number;
  gradientType: 'linear' | 'radial' | 'none';
  onColorSelect: (index: number) => void;
  onPositionChange: (index: number, position: number) => void;
  onAddColor?: (position: number, color: string) => void;
  onRemoveColor?: (index: number) => void;
  minColors?: number;
  // Additional props from Slider component
  step?: number;
  label?: string;
  showValue?: boolean;
  disabled?: boolean;
  marks?: number[];
  tooltip?: boolean;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

const ColorSlider: React.FC<ColorSliderProps> = ({
  colors,
  activeColorIndex,
  gradientType,
  onColorSelect,
  onPositionChange,
  onAddColor,
  onRemoveColor,
  minColors = 1,
  // Additional props from Slider with defaults
  step = 1,
  label,
  showValue = false,
  disabled = false,
  marks = [],
  tooltip = true,
  className = '',
  orientation = 'horizontal'
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentDragIndex, setCurrentDragIndex] = useState(activeColorIndex);
  const [showTooltip, setShowTooltip] = useState(false);
  
  const isVertical = orientation === 'vertical';

  // Generate the background gradient for the slider
  const getSliderBackground = () => {
    if (colors.length === 0) return 'transparent';
    if (colors.length === 1 || gradientType === 'none') return colors[0].color;
    
    const sortedColors = [...colors].sort((a, b) => a.position - b.position);
    
    if (gradientType === 'linear') {
      const stops = sortedColors.map(c => `${c.color} ${c.position}%`).join(', ');
      return isVertical
        ? `linear-gradient(to top, ${stops})`
        : `linear-gradient(to right, ${stops})`;
    } else if (gradientType === 'radial') {
      const stops = sortedColors.map(c => `${c.color} ${c.position}%`).join(', ');
      return `radial-gradient(circle, ${stops})`;
    }
    
    return colors[0].color;
  };
  
  // Handle starting drag on a color stop
  const handleColorStopMouseDown = (e: React.MouseEvent | React.TouchEvent, index: number) => {
    if (disabled) return;
    
    // Don't start dragging if clicking a button in the tooltip
    if (e.target instanceof HTMLButtonElement) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    onColorSelect(index);
    setCurrentDragIndex(index);
    setIsDragging(true);
  };
  
  // Handle mouse/touch move during dragging
  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || !sliderRef.current || disabled) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    let position;
    
    if (isVertical) {
      // For vertical slider, 0% at bottom, 100% at top
      position = 100 - ((clientY - rect.top) / rect.height) * 100;
    } else {
      // For horizontal slider, 0% at left, 100% at right
      position = ((clientX - rect.left) / rect.width) * 100;
    }
    
    // Clamp position between 0 and 100
    position = Math.max(0, Math.min(100, position));
    
    // Apply stepping if specified
    if (step > 0) {
      // Convert position to value in the range 0-100
      let value = position;
      // Apply step
      value = Math.round(value / step) * step;
      // Ensure value is within the bounds
      value = Math.max(0, Math.min(100, value));
      position = value;
    }
    
    onPositionChange(currentDragIndex, position);
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };
  
  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };
  
  // Handle end of dragging
  const handleDragEnd = () => {
    setIsDragging(false);
  };
  
  // Handle click on the slider track
  const handleTrackClick = (e: React.MouseEvent) => {
    if (!sliderRef.current || !onAddColor || disabled) return;
    
    // Get click position
    const rect = sliderRef.current.getBoundingClientRect();
    let clickPosition;
    
    if (isVertical) {
      // For vertical slider, 0% at bottom, 100% at top
      clickPosition = 100 - ((e.clientY - rect.top) / rect.height) * 100;
    } else {
      // For horizontal slider, 0% at left, 100% at right
      clickPosition = ((e.clientX - rect.left) / rect.width) * 100;
    }
    
    // Apply stepping to the click position if needed
    let roundedPosition;
    if (step > 0) {
      // Convert position to value in the range 0-100
      let value = clickPosition;
      // Apply step
      value = Math.round(value / step) * step;
      // Ensure value is within the bounds
      value = Math.max(0, Math.min(100, value));
      roundedPosition = value;
    } else {
      roundedPosition = Math.round(clickPosition);
    }
    
    // Check if there's a color stop close to the click position
    const closeThreshold = 10; // percent
    const isCloseToExisting = colors.some(
      color => Math.abs(color.position - roundedPosition) < closeThreshold
    );
    
    // If it's not close to an existing stop, add a new one
    if (!isCloseToExisting) {
      // Interpolate the color based on the gradient
      let newColor = '#ffffff';
      
      if (colors.length > 0) {
        // Sort colors by position
        const sortedColors = [...colors].sort((a, b) => a.position - b.position);
        
        // Find the colors to interpolate between
        let leftColor = sortedColors[0];
        let rightColor = sortedColors[sortedColors.length - 1];
        
        for (let i = 0; i < sortedColors.length - 1; i++) {
          if (sortedColors[i].position <= roundedPosition && 
              sortedColors[i + 1].position >= roundedPosition) {
            leftColor = sortedColors[i];
            rightColor = sortedColors[i + 1];
            break;
          }
        }
        
        // Simple linear interpolation of colors
        if (leftColor && rightColor) {
          const ratio = (roundedPosition - leftColor.position) / 
                       (rightColor.position - leftColor.position || 1);
          
          // Parse the hex colors
          const leftRGB = hexToRgb(leftColor.color);
          const rightRGB = hexToRgb(rightColor.color);
          
          if (leftRGB && rightRGB) {
            // Interpolate each channel
            const r = Math.round(leftRGB.r + ratio * (rightRGB.r - leftRGB.r));
            const g = Math.round(leftRGB.g + ratio * (rightRGB.g - leftRGB.g));
            const b = Math.round(leftRGB.b + ratio * (rightRGB.b - leftRGB.b));
            
            // Convert back to hex
            newColor = rgbToHex(r, g, b);
          }
        } else {
          // If we can't interpolate, use a neighbor's color
          newColor = leftColor ? leftColor.color : rightColor.color;
        }
      }
      
      // Add the new color
      onAddColor(roundedPosition, newColor);
    } else {
      // If close to existing, select that color stop
      let closestIndex = 0;
      let closestDistance = Infinity;
      
      colors.forEach((color, index) => {
        const distance = Math.abs(color.position - roundedPosition);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });
      
      onColorSelect(closestIndex);
    }
  };
  
  // Handle right-click on a color stop
  const handleColorStopRightClick = (e: React.MouseEvent, index: number) => {
    if (disabled) return false;
    e.preventDefault();
    e.stopPropagation();
    
    if (onRemoveColor && colors.length > minColors) {
      onRemoveColor(index);
    }
    
    return false;
  };
  
  // Utility functions for color interpolation
  const hexToRgb = (hex: string) => {
    // Remove # if present
    hex = hex.replace(/^#/, '');
    
    // Parse the hex values
    const bigint = parseInt(hex, 16);
    
    // Handle different hex formats (3 digits or 6 digits)
    if (hex.length === 3) {
      const r = ((bigint >> 8) & 15) * 17;
      const g = ((bigint >> 4) & 15) * 17;
      const b = (bigint & 15) * 17;
      return { r, g, b };
    } else {
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return { r, g, b };
    }
  };
  
  const rgbToHex = (r: number, g: number, b: number) => {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };
  
  const handleMouseEnter = () => {
    if (tooltip) setShowTooltip(true);
  };
  
  const handleMouseLeave = () => {
    if (!isDragging) setShowTooltip(false);
  };
  
  // Set up mouse/touch event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleDragEnd);
      window.addEventListener('touchcancel', handleDragEnd);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
      window.removeEventListener('touchcancel', handleDragEnd);
    };
  }, [isDragging, currentDragIndex]);
  
  return (
    <div className={`${styles.colorSliderContainer} ${isVertical ? styles.vertical : ''} ${className}`}>
      {label && (
        <div className={styles.sliderLabel}>
          <span>{label}</span>
          {showValue && activeColorIndex >= 0 && activeColorIndex < colors.length && (
            <span className={styles.valueDisplay}>
              {`${colors[activeColorIndex].position}%`}
            </span>
          )}
        </div>
      )}
      
      <div 
        ref={sliderRef}
        className={`${styles.colorSliderWrapper} ${isVertical ? styles.vertical : ''} ${disabled ? styles.disabled : ''}`}
        onClick={handleTrackClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Background gradient */}
        <div 
          className={styles.colorSlider}
          style={{ background: getSliderBackground() }}
        />
        
        {/* Render marks if provided */}
        {marks.length > 0 && marks.map((markValue) => {
          const markPosition = markValue; // Marks are already in 0-100 range
          return (
            <div 
              key={markValue}
              className={styles.sliderMark}
              style={isVertical ? { bottom: `${markPosition}%` } : { left: `${markPosition}%` }}
            />
          );
        })}
        
        {/* Color stops */}
        {colors.map((color, index) => (
          <div
            key={index}
            className={`${styles.colorStop} ${index === activeColorIndex ? styles.active : ''}`}
            style={isVertical 
              ? {
                  bottom: `${color.position}%`,
                  backgroundColor: color.color
                }
              : { 
                  left: `${color.position}%`,
                  backgroundColor: color.color
                }
            }
            onMouseDown={(e) => handleColorStopMouseDown(e, index)}
            onTouchStart={(e) => handleColorStopMouseDown(e, index)}
            onContextMenu={(e) => handleColorStopRightClick(e, index)}
          >
            {tooltip && showTooltip && index === activeColorIndex && (
              <div className={styles.tooltip}>
                <span>{color.position}%</span>
                {onRemoveColor && colors.length > minColors && (
                  <button 
                    className={styles.removeButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveColor(index);
                    }}
                    aria-label="Remove color stop"
                  >
                    ✖
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ColorSlider; 