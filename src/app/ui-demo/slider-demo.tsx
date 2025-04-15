"use client";

import { useState } from 'react';
import Slider from '@/components/UI/Slider';
import ColorSlider from '@/components/UI/ColorSlider';
import styles from './slider-demo.module.css';

export default function SliderDemo() {
  const [basicValue, setBasicValue] = useState(50);
  const [steppedValue, setSteppedValue] = useState(25);
  const [markedValue, setMarkedValue] = useState(60);
  const [disabledValue] = useState(30);
  const [tooltipValue, setTooltipValue] = useState(75);
  const [rangeValue, setRangeValue] = useState(40);
  const [verticalValue, setVerticalValue] = useState(50);
  
  // ColorSlider state
  const [colors, setColors] = useState([
    { color: '#FF5733', position: 0 },
    { color: '#33FF57', position: 50 },
    { color: '#3357FF', position: 100 }
  ]);
  const [activeColorIndex, setActiveColorIndex] = useState(0);
  const [gradientType, setGradientType] = useState<'linear' | 'radial' | 'none'>('linear');

  // ColorSlider handlers
  const handleColorSelect = (index: number) => {
    setActiveColorIndex(index);
  };

  const handlePositionChange = (index: number, position: number) => {
    const newColors = [...colors];
    newColors[index] = { ...newColors[index], position };
    setColors(newColors);
  };

  const addColor = (position: number, color: string) => {
    const newColors = [...colors, { color, position }];
    setColors(newColors);
    setActiveColorIndex(newColors.length - 1);
  };

  const removeColor = (index: number) => {
    if (colors.length > 1) {
      const newColors = colors.filter((_, i) => i !== index);
      setColors(newColors);
      setActiveColorIndex(Math.min(activeColorIndex, newColors.length - 1));
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Slider Component Demo</h1>
      
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Basic Slider</h2>
        <p className={styles.description}>A simple slider with min (0), max (100), and a current value of {basicValue}</p>
        
        <Slider
          min={0}
          max={100}
          value={basicValue}
          onChange={setBasicValue}
          label="Basic Slider"
        />
      </section>
      
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Stepped Slider</h2>
        <p className={styles.description}>A slider with custom steps (5) and range (0-100), current value: {steppedValue}</p>
        
        <Slider
          min={0}
          max={100}
          value={steppedValue}
          onChange={setSteppedValue}
          step={5}
          label="Stepped Slider (step: 5)"
        />
      </section>
      
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Slider with Marks</h2>
        <p className={styles.description}>A slider with marks at specific positions, current value: {markedValue}</p>
        
        <Slider
          min={0}
          max={100}
          value={markedValue}
          onChange={setMarkedValue}
          marks={[0, 25, 50, 75, 100]}
          label="Slider with Marks"
        />
      </section>
      
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Disabled Slider</h2>
        <p className={styles.description}>A slider that cannot be interacted with, fixed at value: {disabledValue}</p>
        
        <Slider
          min={0}
          max={100}
          value={disabledValue}
          onChange={() => {}}
          disabled={true}
          label="Disabled Slider"
        />
      </section>
      
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Slider with Tooltip</h2>
        <p className={styles.description}>A slider that shows a tooltip on hover/drag, current value: {tooltipValue}</p>
        
        <Slider
          min={0}
          max={100}
          value={tooltipValue}
          onChange={setTooltipValue}
          tooltip={true}
          label="Slider with Tooltip"
        />
      </section>
      
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Custom Range Slider</h2>
        <p className={styles.description}>A slider with a custom range from -50 to 50, current value: {rangeValue}</p>
        
        <Slider
          min={-50}
          max={50}
          value={rangeValue}
          onChange={setRangeValue}
          label="Custom Range (-50 to 50)"
        />
      </section>
      
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Vertical Slider</h2>
        <p className={styles.description}>A vertical slider with orientation set to vertical, current value: {verticalValue}</p>
        
        <div className={styles.verticalDemo}>
          <Slider
            min={0}
            max={100}
            value={verticalValue}
            onChange={setVerticalValue}
            marks={[0, 25, 50, 75, 100]}
            tooltip={true}
            label="Vertical Slider"
            orientation="vertical"
          />
        </div>
      </section>
      
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Color Slider</h2>
        <p className={styles.description}>A color slider for managing gradient color stops</p>
        
        <div className={styles.colorSlidersContainer}>
          <div className={styles.colorSliderDemo}>
            <h3 className={styles.demoTitle}>Horizontal Color Slider</h3>
            <div className={styles.horizontalSliderContainer}>
              <ColorSlider
                colors={colors}
                activeColorIndex={activeColorIndex}
                gradientType={gradientType}
                onColorSelect={handleColorSelect}
                onPositionChange={handlePositionChange}
                onAddColor={addColor}
                onRemoveColor={removeColor}
                minColors={1}
                step={5}
                marks={[0, 25, 50, 75, 100]}
                tooltip={true}
                label="Color Stops"
              />
            </div>
          </div>
          
          <div className={styles.colorSliderDemo}>
            <h3 className={styles.demoTitle}>Vertical Color Slider</h3>
            <div className={styles.verticalSliderContainer}>
              <ColorSlider
                colors={colors}
                activeColorIndex={activeColorIndex}
                gradientType={gradientType}
                onColorSelect={handleColorSelect}
                onPositionChange={handlePositionChange}
                onAddColor={addColor}
                onRemoveColor={removeColor}
                minColors={1}
                step={5}
                marks={[0, 25, 50, 75, 100]}
                tooltip={true}
                label="Color Stops"
                orientation="vertical"
              />
            </div>
          </div>
        </div>
        
        <div className={styles.colorSwatchPreview}>
          <h3 className={styles.previewTitle}>Gradient Preview</h3>
          <div 
            className={styles.previewBox}
            style={{
              background: gradientType === 'linear' 
                ? `linear-gradient(to right, ${colors.map(c => `${c.color} ${c.position}%`).join(', ')})`
                : gradientType === 'radial'
                ? `radial-gradient(circle, ${colors.map(c => `${c.color} ${c.position}%`).join(', ')})`
                : colors[0]?.color || 'transparent'
            }}
          />
          
          <div className={styles.gradientControls}>
            <button 
              className={`${styles.gradientTypeButton} ${gradientType === 'linear' ? styles.active : ''}`}
              onClick={() => setGradientType('linear')}
            >
              Linear
            </button>
            <button 
              className={`${styles.gradientTypeButton} ${gradientType === 'radial' ? styles.active : ''}`}
              onClick={() => setGradientType('radial')}
            >
              Radial
            </button>
            <button 
              className={`${styles.gradientTypeButton} ${gradientType === 'none' ? styles.active : ''}`}
              onClick={() => setGradientType('none')}
            >
              Solid
            </button>
          </div>
        </div>
      </section>
    </div>
  );
} 