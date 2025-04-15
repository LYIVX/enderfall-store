import Box from '@/components/UI/Box';
import styles from './ServerFeatures.module.css';
import { NineSliceContainer } from '../UI';

const ServerFeatures = () => {
  const features = [
    {
      id: 1,
      title: 'Towny',
      description: 'Create and manage your own towns, form nations, and build communities with other players.',
      icon: '🏙️',
    },
    {
      id: 2,
      title: 'Economy',
      description: 'Engage in a player-driven economy with shops, jobs, and trading opportunities.',
      icon: '💰',
    },
    {
      id: 3,
      title: 'McMMO',
      description: 'Level up skills like Mining, Woodcutting, and Combat to unlock powerful abilities.',
      icon: '⛏️',
    },
    {
      id: 4,
      title: 'Custom Enchantments',
      description: 'Discover unique enchantments that aren\'t available in vanilla Minecraft.',
      icon: '✨',
    },
    {
      id: 5,
      title: 'Custom Mobs',
      description: 'Battle challenging custom mobs with special abilities and rewards.',
      icon: '👹',
    },
    {
      id: 6,
      title: 'Events & Quests',
      description: 'Participate in regular server events and complete quests for exciting rewards.',
      icon: '🎯',
    },
  ];

  return (
    <NineSliceContainer className={styles.featuresSection} variant="blue">
      <NineSliceContainer className={styles.sectionHeader} variant="standard">
        <h2 className={styles.sectionTitle}>Server Features</h2>
        <p className={styles.sectionDescription}>
          Explore what makes Enderfall a unique Minecraft experience
        </p>
      </NineSliceContainer>

      <div className={styles.featuresGrid}>
        {features.map((feature) => (
          <NineSliceContainer key={feature.id} className={styles.featureBox} variant="standard">
            <div className={styles.featureIcon}>{feature.icon}</div>
            <h3 className={styles.featureTitle}>{feature.title}</h3>
            <p className={styles.featureDescription}>{feature.description}</p>
          </NineSliceContainer>
        ))}
      </div>
    </NineSliceContainer>
  );
};

export default ServerFeatures; 