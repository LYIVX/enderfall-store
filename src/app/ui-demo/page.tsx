import TabsDemo from './tabs-demo';
import SliderDemo from './slider-demo';
import AvatarDemo from './avatar-demo';
import ButtonDemo from './button-demo';
import FontDemo from './font-demo';
import styles from './ui-demo.module.css';

export default function UIDemo() {
  return (
    <div className={styles.uiDemoContainer}>
      <h1 className={styles.pageTitle}>UI Components Demo</h1>
      <div className={styles.fontNote}>
        <p><strong>Note:</strong> The Minecraft fonts have been automatically loaded and are ready to use.</p>
      </div>
      <FontDemo />
      <ButtonDemo />
      <AvatarDemo />
      <SliderDemo />
      <TabsDemo />
    </div>
  );
} 