import Image from 'next/image';
import Box from '@/components/UI/Box';
import styles from './StaffSection.module.css';
import { NineSliceContainer } from '../UI';

const StaffSection = () => {
  const staffMembers = [
    {
      id: 1,
      name: 'TheDarkKitsune',
      role: 'Co-Owner & Head-Manager',
      minecraft: 'TheDarkKitsune',
      description: 'Server co-owner and lead Manager. Responsible for server, discord maintenance and plugin development.',
    },
    {
      id: 2,
      name: 'LYIVX',
      role: 'Co-Owner & Head-Developer',
      minecraft: 'LYIVX',
      description: 'Server co-owner and lead Developer. Responsible for server, web and plugin development.',
    },
    {
      id: 3,
      name: 'TheAutoSave',
      role: 'Co-Owner & Head-Builder',
      minecraft: 'TheAutoSaving',
      description: 'Server co-owner and lead builder. Responsible for server.',
    },
    {
      id: 4,
      name: 'Blocksy123',
      role: 'Head-Admin',
      minecraft: 'Blocksy123',
      description: 'Lead Admin. Responsible for server and discord administration.',
    },
    {
      id: 5,
      name: 'LilYowser',
      role: 'Head-Moderator',
      minecraft: 'LilYowser',
      description: 'Lead Moderator. Responsible for server and discord moderation.',
    },
    {
      id: 6,
      name: 'WanderingGuy',
      role: 'Developer',
      minecraft: 'WanderingGuy',
      description: 'Developer. Responsible for server, web develepment.',
    },
  ];

  return (
    <NineSliceContainer className={styles.staffSection} variant="blue">
      <NineSliceContainer className={styles.sectionHeader} variant="standard">
        <h2 className={styles.sectionTitle}>Meet Our Staff</h2>
        <p className={styles.sectionDescription}>
          The dedicated team working hard to make Enderfall an amazing experience
        </p>
      </NineSliceContainer>

      <div className={styles.staffGrid}>
        {staffMembers.map((member) => (
          <NineSliceContainer key={member.id} className={styles.staffCard} variant="standard">
            <div className={styles.staffImageContainer}>
              <Image
                src={`https://mc-heads.net/body/${member.minecraft}`}
                alt={member.name}
                width={100}
                height={100}
                className={styles.staffImage}
              />
            </div>
            <div className={styles.staffInfo}>
              <h3 className={styles.staffName}>{member.name}</h3>
              <div className={styles.staffRole}>{member.role}</div>
              <p className={styles.staffDescription}>{member.description}</p>
            </div>
          </NineSliceContainer>
        ))}
      </div>
    </NineSliceContainer>  
  );
};

export default StaffSection; 