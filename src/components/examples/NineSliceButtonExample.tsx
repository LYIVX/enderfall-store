"use client";

import React from 'react';
import Button from '../UI/Button';
import styles from './NineSliceButtonExample.module.css';

const NineSliceButtonExample = () => {
  return (
    <div className={styles.container}>
      {/* Standard Buttons (Default Nine-Slice) */}
      <div className={styles.variantRow}>
        <div className={styles.buttonWithLabel}>
          <Button variant="standard">Standard</Button>
          <span className={styles.buttonLabel}>Normal</span>
        </div>
        <div className={styles.buttonWithLabel}>
          <Button variant="standard" disabled>Standard</Button>
          <span className={styles.buttonLabel}>Disabled</span>
        </div>
        <div className={styles.buttonWithLabel}>
          <Button variant="standard">Hover Me</Button>
          <span className={styles.buttonLabel}>Hover</span>
        </div>
      </div>

      {/* Primary Buttons */}
      <div className={styles.variantRow}>
        <div className={styles.buttonWithLabel}>
          <Button variant="primary" nineSlice>Primary</Button>
          <span className={styles.buttonLabel}>Normal</span>
        </div>
        <div className={styles.buttonWithLabel}>
          <Button variant="primary" nineSlice disabled>Primary</Button>
          <span className={styles.buttonLabel}>Disabled</span>
        </div>
        <div className={styles.buttonWithLabel}>
          <Button variant="primary" nineSlice>Hover Me</Button>
          <span className={styles.buttonLabel}>Hover</span>
        </div>
      </div>

      {/* Secondary Buttons */}
      <div className={styles.variantRow}>
        <div className={styles.buttonWithLabel}>
          <Button variant="secondary" nineSlice>Secondary</Button>
          <span className={styles.buttonLabel}>Normal</span>
        </div>
        <div className={styles.buttonWithLabel}>
          <Button variant="secondary" nineSlice disabled>Secondary</Button>
          <span className={styles.buttonLabel}>Disabled</span>
        </div>
        <div className={styles.buttonWithLabel}>
          <Button variant="secondary" nineSlice>Hover Me</Button>
          <span className={styles.buttonLabel}>Hover</span>
        </div>
      </div>

      {/* Danger Buttons */}
      <div className={styles.variantRow}>
        <div className={styles.buttonWithLabel}>
          <Button variant="danger" nineSlice>Danger</Button>
          <span className={styles.buttonLabel}>Normal</span>
        </div>
        <div className={styles.buttonWithLabel}>
          <Button variant="danger" nineSlice disabled>Danger</Button>
          <span className={styles.buttonLabel}>Disabled</span>
        </div>
        <div className={styles.buttonWithLabel}>
          <Button variant="danger" nineSlice>Hover Me</Button>
          <span className={styles.buttonLabel}>Hover</span>
        </div>
      </div>

      {/* Success Buttons */}
      <div className={styles.variantRow}>
        <div className={styles.buttonWithLabel}>
          <Button variant="success" nineSlice>Success</Button>
          <span className={styles.buttonLabel}>Normal</span>
        </div>
        <div className={styles.buttonWithLabel}>
          <Button variant="success" nineSlice disabled>Success</Button>
          <span className={styles.buttonLabel}>Disabled</span>
        </div>
        <div className={styles.buttonWithLabel}>
          <Button variant="success" nineSlice>Hover Me</Button>
          <span className={styles.buttonLabel}>Hover</span>
        </div>
      </div>

      {/* Warning Buttons */}
      <div className={styles.variantRow}>
        <div className={styles.buttonWithLabel}>
          <Button variant="warning" nineSlice>Warning</Button>
          <span className={styles.buttonLabel}>Normal</span>
        </div>
        <div className={styles.buttonWithLabel}>
          <Button variant="warning" nineSlice disabled>Warning</Button>
          <span className={styles.buttonLabel}>Disabled</span>
        </div>
        <div className={styles.buttonWithLabel}>
          <Button variant="warning" nineSlice>Hover Me</Button>
          <span className={styles.buttonLabel}>Hover</span>
        </div>
      </div>

      {/* Info Buttons */}
      <div className={styles.variantRow}>
        <div className={styles.buttonWithLabel}>
          <Button variant="info" nineSlice>Info</Button>
          <span className={styles.buttonLabel}>Normal</span>
        </div>
        <div className={styles.buttonWithLabel}>
          <Button variant="info" nineSlice disabled>Info</Button>
          <span className={styles.buttonLabel}>Disabled</span>
        </div>
        <div className={styles.buttonWithLabel}>
          <Button variant="info" nineSlice>Hover Me</Button>
          <span className={styles.buttonLabel}>Hover</span>
        </div>
      </div>

      {/* Size Demonstrations */}
      <div className={styles.variantSection}>
        <h3>Size Variations</h3>
        <div className={styles.buttonRow}>
          <div className={styles.buttonWithLabel}>
            <Button variant="standard" size="small">Small</Button>
            <span className={styles.buttonLabel}>Small (30px)</span>
          </div>
          <div className={styles.buttonWithLabel}>
            <Button variant="standard" size="medium">Medium</Button>
            <span className={styles.buttonLabel}>Medium (38px)</span>
          </div>
          <div className={styles.buttonWithLabel}>
            <Button variant="standard" size="large">Large</Button>
            <span className={styles.buttonLabel}>Large (46px)</span>
          </div>
        </div>
      </div>

      {/* Full Width Button */}
      <div className={styles.fullWidthRow}>
        <Button variant="secondary" nineSlice fullWidth>Full Width Nine-Slice Button</Button>
      </div>
    </div>
  );
};

export default NineSliceButtonExample; 