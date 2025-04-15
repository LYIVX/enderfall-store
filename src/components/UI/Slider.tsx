"use client";

import React, { useRef, useEffect, useState } from 'react';
import styles from './Slider.module.css';

interface SliderProps {
  min: number;
  max: number;
  value?: number;
  values?: number[];
  onChange?: (value: number) => void;
  onChangeMultiple?: (values: number[], index: number) => void;
  step?: number;
  label?: string;
  showValue?: boolean;
  disabled?: boolean;
  marks?: number[];
  tooltip?: boolean;
  className?: string;
  activeThumbIndex?: number;
  orientation?: 'horizontal' | 'vertical';
}

const Slider: React.FC<SliderProps> = ({
  min,
  max,
  value,
  values,
  onChange,
  onChangeMultiple,
  step = 1,
  label,
  showValue = false,
  disabled = false,
  marks = [],
  tooltip = true,
  className = '',
  activeThumbIndex = 0,
  orientation = 'horizontal'
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [activeIndex, setActiveIndex] = useState(activeThumbIndex);
  const [mouseDownPosition, setMouseDownPosition] = useState<{x: number, y: number} | null>(null);
  
  const isVertical = orientation === 'vertical';
  
  // Normalize inputs to always work with arrays internally
  const handleValues = values || (value !== undefined ? [value] : [0]);
  
  // Calculate the percentage position for the thumb
  const getThumbPosition = (val: number) => {
    return ((val - min) / (max - min)) * 100;
  };
  
  // Handle mouse/touch interactions for dragging the thumb
  const handleDown = (e: React.MouseEvent | React.TouchEvent, index: number) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setActiveIndex(index);
    setIsDragging(true);
    
    // Store mouse position for the drag threshold detection
    if ('clientX' in e) {
      setMouseDownPosition({x: e.clientX, y: e.clientY});
    } else if (e.touches.length > 0) {
      setMouseDownPosition({x: e.touches[0].clientX, y: e.touches[0].clientY});
    }
  };
  
  const updateValue = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent, index?: number) => {
    if (!sliderRef.current) return;
    
    const targetIndex = index !== undefined ? index : activeIndex;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const clientX = 'touches' in e 
      ? e.touches[0].clientX 
      : 'clientX' in e 
        ? e.clientX 
        : 0;
    const clientY = 'touches' in e 
      ? e.touches[0].clientY 
      : 'clientY' in e 
        ? e.clientY 
        : 0;
    
    // Calculate position as percentage (0-100)
    let percentage;
    if (isVertical) {
      // For vertical: 0% at bottom, 100% at top (reversed from coordinate system)
      percentage = 100 - ((clientY - rect.top) / rect.height) * 100;
    } else {
      // For horizontal: 0% at left, 100% at right
      percentage = ((clientX - rect.left) / rect.width) * 100;
    }
    
    percentage = Math.max(0, Math.min(100, percentage));
    
    // Convert percentage to value within min-max range
    let newValue = min + (percentage / 100) * (max - min);
    
    // Apply step if specified
    if (step > 0) {
      newValue = Math.round(newValue / step) * step;
    }
    
    // Ensure the value is within bounds
    newValue = Math.max(min, Math.min(max, newValue));
    
    // Update the value based on which mode we're in (single or multiple)
    if (onChangeMultiple) {
      const newValues = [...handleValues];
      newValues[targetIndex] = newValue;
      onChangeMultiple(newValues, targetIndex);
    } else if (onChange && targetIndex === 0) {
      onChange(newValue);
    }
  };
  
  const handleMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging || disabled) return;
    updateValue(e);
  };
  
  const handleUp = () => {
    setIsDragging(false);
    setMouseDownPosition(null);
  };
  
  const handleSliderClick = (e: React.MouseEvent) => {
    if (disabled) return;
    
    // Store mouse position for potential drag operation
    setMouseDownPosition({x: e.clientX, y: e.clientY});
    
    if (handleValues.length === 1) {
      // Single thumb mode - update the value and start potential drag
      updateValue(e, 0);
      setActiveIndex(0);
      setIsDragging(true);
    } else {
      // Multi-thumb mode - find the closest thumb and make it active
      const rect = sliderRef.current!.getBoundingClientRect();
      
      let clickPosition;
      if (isVertical) {
        // For vertical sliders, calculate position as inverted percentage
        clickPosition = 100 - ((e.clientY - rect.top) / rect.height) * 100;
      } else {
        // For horizontal sliders, calculate position as percentage from left
        clickPosition = ((e.clientX - rect.left) / rect.width) * 100;
      }
      
      const clickValue = min + (clickPosition / 100) * (max - min);
      
      // Find closest thumb
      let closestIndex = 0;
      let closestDistance = Math.abs(handleValues[0] - clickValue);
      
      handleValues.forEach((val, index) => {
        const distance = Math.abs(val - clickValue);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });
      
      setActiveIndex(closestIndex);
      updateValue(e, closestIndex);
      setIsDragging(true);
    }
  };
  
  const handleTrackMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    
    // Handle click on track to update value and initiate drag
    handleSliderClick(e);
  };
  
  const handleMouseEnter = () => {
    if (tooltip) setShowTooltip(true);
  };
  
  const handleMouseLeave = () => {
    if (!isDragging) setShowTooltip(false);
  };
  
  // Set up event listeners for mouse/touch events
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchend', handleUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging, activeIndex]);
  
  return (
    <div className={`${styles.sliderContainer} ${isVertical ? styles.vertical : ''} ${className}`}>
      {label && (
        <div className={styles.sliderLabel}>
          <span>{label}</span>
          {showValue && <span className={styles.valueDisplay}>
            {handleValues.length === 1 ? handleValues[0] : `${handleValues[activeIndex]} (${activeIndex + 1}/${handleValues.length})`}
          </span>}
        </div>
      )}
      
      <div 
        ref={sliderRef}
        className={`${styles.slider} ${isVertical ? styles.vertical : ''} ${disabled ? styles.disabled : ''}`}
        onMouseDown={handleTrackMouseDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className={styles.sliderTrack}>
          {handleValues.length === 1 ? (
            <div 
              className={styles.sliderProgress}
              style={isVertical 
                ? { height: `${getThumbPosition(handleValues[0])}%`, bottom: 0 } 
                : { width: `${getThumbPosition(handleValues[0])}%` }
              }
            />
          ) : (
            // For multi-thumb, we'll show range highlights between each pair of thumbs
            handleValues.sort((a, b) => a - b).map((val, i, arr) => {
              // Skip the first value as we need pairs
              if (i === 0) return null;
              
              const prevVal = arr[i - 1];
              const startPos = getThumbPosition(prevVal);
              const endPos = getThumbPosition(val);
              const size = endPos - startPos;
              
              return (
                <div 
                  key={i}
                  className={styles.sliderProgressMulti}
                  style={isVertical
                    ? { 
                        bottom: `${startPos}%`,
                        height: `${size}%` 
                      }
                    : { 
                        left: `${startPos}%`,
                        width: `${size}%` 
                      }
                  }
                />
              );
            })
          )}
        </div>
        
        {/* Render marks if provided */}
        {marks.length > 0 && marks.map((markValue) => {
          const markPosition = ((markValue - min) / (max - min)) * 100;
          return (
            <div 
              key={markValue}
              className={styles.sliderMark}
              style={isVertical 
                ? { bottom: `${markPosition}%` } 
                : { left: `${markPosition}%` }
              }
            />
          );
        })}
        
        {/* Render thumbs */}
        {handleValues.map((val, index) => (
          <div
            key={index}
            className={`${styles.sliderThumb} ${index === activeIndex ? styles.active : ''}`}
            style={isVertical 
              ? { bottom: `${getThumbPosition(val)}%` } 
              : { left: `${getThumbPosition(val)}%` }
            }
            onMouseDown={(e) => handleDown(e, index)}
            onTouchStart={(e) => handleDown(e, index)}
          >
            {tooltip && showTooltip && index === activeIndex && (
              <div className={styles.tooltip}>
                {val}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Slider; 