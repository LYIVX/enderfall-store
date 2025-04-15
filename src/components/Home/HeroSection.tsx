import Button from '@/components/UI/Button';
import styles from './HeroSection.module.css';
import { NineSliceContainer } from '../UI';

const HeroSection = () => {
  return (
    <NineSliceContainer className={styles.heroSection} variant="blue">
          <NineSliceContainer className={styles.heroContent} variant="standard">
            <h1 className={styles.heroTitle}>
              Welcome to <span className={styles.highlight}>Enderfall</span>
            </h1>
            <p className={styles.heroDescription}>
              A premium Minecraft gaming experience with Towny, McMMO, and custom features. 
              Join our growing community today and start your adventure!
            </p>
            
          </NineSliceContainer>
          <div className={styles.heroButtons}>
              <Button 
              size="large"
              variant="primary"
              nineSlice={true}
              className={styles.heroButtonPlay}
              >
                Start Playing Now
              </Button>
              <Button 
              size="large" 
              variant="secondary"
              nineSlice={true}
              className={styles.heroButtonLearn}
              >
                Learn More
              </Button>
            </div>
        <NineSliceContainer className={styles.heroStats} variant="standard">
          <div className={styles.statItem}>
            <div className={styles.statNumber}>1000+</div>
            <div className={styles.statLabel}>Registered Players</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statNumber}>50+</div>
            <div className={styles.statLabel}>Active Towns</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statNumber}>99.9%</div>
            <div className={styles.statLabel}>Uptime</div>
          </div>
        </NineSliceContainer>
    </NineSliceContainer>
  );
};

export default HeroSection; 