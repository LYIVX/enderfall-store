"use client";

import { NineSliceContainer } from '@/components/UI';
import styles from './Examples.module.css';

const NineSliceContainerExample = () => {
  return (
    <div className={styles.exampleSection}>
      <h2>Nine Slice Container Examples</h2>
      
      <div className={styles.exampleRow}>
        <h3>Standard Variant</h3>
        <NineSliceContainer variant="standard" className={styles.exampleContainer}>
          <p>Standard Container</p>
        </NineSliceContainer>
      </div>
      
      <div className={styles.exampleRow}>
        <h3>Primary Variant</h3>
        <NineSliceContainer variant="primary" className={styles.exampleContainer}>
          <p>Primary Container</p>
        </NineSliceContainer>
      </div>
      
      <div className={styles.exampleRow}>
        <h3>Panel Variant</h3>
        <NineSliceContainer variant="panel" className={styles.exampleContainer}>
          <p>Panel Container</p>
        </NineSliceContainer>
      </div>
      
      <div className={styles.exampleRow}>
        <h3>Container Variant</h3>
        <NineSliceContainer variant="container" className={styles.exampleContainer}>
          <p>Generic Container</p>
        </NineSliceContainer>
      </div>
      
      <div className={styles.exampleRow}>
        <h3>Sizes</h3>
        <div className={styles.exampleFlex}>
          <NineSliceContainer size="small" className={styles.exampleContainer}>
            <p>Small</p>
          </NineSliceContainer>
          
          <NineSliceContainer size="medium" className={styles.exampleContainer}>
            <p>Medium</p>
          </NineSliceContainer>
          
          <NineSliceContainer size="large" className={styles.exampleContainer}>
            <p>Large</p>
          </NineSliceContainer>
        </div>
      </div>
      
      <div className={styles.exampleRow}>
        <h3>Full Width</h3>
        <NineSliceContainer fullWidth variant="standard" className={styles.exampleContainer}>
          <p>Full Width Container</p>
        </NineSliceContainer>
      </div>
      
      <div className={styles.exampleRow}>
        <h3>Active State</h3>
        <NineSliceContainer active variant="primary" className={styles.exampleContainer}>
          <p>Active Container</p>
        </NineSliceContainer>
      </div>
      
      <div className={styles.exampleRow}>
        <h3>Complex Content</h3>
        <NineSliceContainer variant="panel" className={styles.exampleContainer}>
          <div className={styles.complexContent}>
            <h4>Container Title</h4>
            <p>This container can hold any content you want, including other components, images, and text.</p>
            <div className={styles.buttonRow}>
              <button>Action 1</button>
              <button>Action 2</button>
            </div>
          </div>
        </NineSliceContainer>
      </div>
    </div>
  );
};

export default NineSliceContainerExample; 