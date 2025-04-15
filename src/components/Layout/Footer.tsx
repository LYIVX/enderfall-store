"use client";

import Link from 'next/link';
import styles from './Footer.module.css';
import { NineSliceContainer } from '@/components/UI';

interface NavLink {
  label: string;
  href: string;
}

interface FooterProps {
  navLinks: NavLink[];
}

const Footer: React.FC<FooterProps> = ({ navLinks }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <NineSliceContainer className={styles.footerNineSlice} variant="standard">
        <div className={`${styles.footerContainer} container`}>
          <div className={styles.footerTop}>
            <NineSliceContainer className={styles.footerLogo} variant="standard">
              <div className={styles.footerLogoContent}>
                <img className={styles.footerLogoImage} src="/images/logo.png" alt="Enderfall Logo" width={50} height={50} />
                <div className={styles.footerLogoText}>
                  <h2>Enderfall</h2>
                  <p>A premium Minecraft gaming experience</p>
                </div>
              </div>
            </NineSliceContainer>
            
            <NineSliceContainer className={styles.footerLinks} variant="standard">
              <NineSliceContainer className={styles.linksColumn}>
                <h3>Navigation</h3>
                <ul>
                  {navLinks.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href}>{link.label}</Link>
                    </li>
                  ))}
                  <li><Link href="/profile">Profile</Link></li>
                </ul>
              </NineSliceContainer>
              
              <NineSliceContainer className={styles.linksColumn}>
                <h3>Information</h3>
                <ul>
                  <li><Link href="/legal/terms">Terms of Service</Link></li>
                  <li><Link href="/legal/privacy">Privacy Policy</Link></li>
                  <li><Link href="/legal/rules">Server Rules</Link></li>
                  <li><Link href="/legal/faq">FAQ</Link></li>
                </ul>
              </NineSliceContainer>
              
              <NineSliceContainer className={styles.linksColumn}>
                <h3>Connect</h3>
                <ul>
                  <li><a href="https://discord.gg/ellrijord" target="_blank" rel="noopener noreferrer">Discord</a></li>
                  <li><a href="https://twitter.com/enderfall" target="_blank" rel="noopener noreferrer">Twitter</a></li>
                  <li><a href="https://instagram.com/enderfall" target="_blank" rel="noopener noreferrer">Instagram</a></li>
                  <li><a href="https://youtube.com/enderfall" target="_blank" rel="noopener noreferrer">YouTube</a></li>
                </ul>
              </NineSliceContainer>
            </NineSliceContainer>
          </div>
          
          <div className={styles.footerBottom}>
            <p>&copy; {currentYear} Enderfall. All rights reserved.</p>
            <p>play.enderfall.co.uk</p>
          </div>
        </div>
      </NineSliceContainer>
    </footer>
  );
};

export default Footer; 