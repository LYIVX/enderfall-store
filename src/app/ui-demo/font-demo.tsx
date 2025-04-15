"use client";

import React from 'react';
import styles from './ui-demo.module.css';

const FontDemo = () => {
  return (
    <section className={styles.demoSection}>
      <h2 className={styles.sectionTitle}>Minecraft Fonts</h2>
      <p className={styles.demoDescription}>
        Various Minecraft font styles available for use throughout the UI.
      </p>
      
      <div className={styles.fontDemoContainer}>
        <div className={styles.fontGroup}>
          <h3>MinecraftFive</h3>
          <p className="minecraft-five">
            This is MinecraftFive Regular - ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789
          </p>
          <p className="minecraft-five" style={{ fontWeight: 'bold' }}>
            This is MinecraftFive Bold - ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789
          </p>
        </div>
        
        <div className={styles.fontGroup}>
          <h3>MinecraftSeven</h3>
          <p className="minecraft-seven">
            This is MinecraftSeven - ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789
          </p>
          <p className="minecraft-seven" style={{ fontFamily: 'MinecraftSevenV2' }}>
            This is MinecraftSeven V2 - ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789
          </p>
        </div>
        
        <div className={styles.fontGroup}>
          <h3>MinecraftTen</h3>
          <p className="minecraft-ten">
            This is MinecraftTen - ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789
          </p>
          <p className="minecraft-ten" style={{ fontFamily: 'MinecraftTenV2' }}>
            This is MinecraftTen V2 - ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789
          </p>
        </div>
        
        <div className={styles.fontGroup}>
          <h3>Optimal Font Sizes</h3>
          <p className="minecraft-five" style={{ fontSize: '8px' }}>
            8px - MinecraftFive Tiny (Perfect for pixel-perfect rendering)
          </p>
          <p className="minecraft-five" style={{ fontSize: '16px' }}>
            16px - MinecraftFive Default (Recommended for buttons)
          </p>
          <p className="minecraft-five" style={{ fontSize: '24px' }}>
            24px - MinecraftFive Large (Good for headings)
          </p>
          <p className="minecraft-five" style={{ fontSize: '32px' }}>
            32px - MinecraftFive Larger (Perfect for titles)
          </p>
        </div>
        
        <div className={styles.fontNote}>
          <p><strong>Tip:</strong> For best pixel-perfect rendering, use font sizes that are multiples of 8px (8, 16, 24, 32).</p>
        </div>
      </div>
    </section>
  );
};

export default FontDemo; 