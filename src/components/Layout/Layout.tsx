import { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Shop', href: '/shop' },
    { label: 'Social', href: '/social' },
    { label: 'Blog', href: '/blog' },
    { label: 'About', href: '/about' }
  ];

  return (
    <div className={styles.layout}>
      <Navbar navLinks={navLinks} />
      <main className={styles.main}>{children}</main>
      <Footer navLinks={navLinks} />
    </div>
  );
};

export default Layout; 