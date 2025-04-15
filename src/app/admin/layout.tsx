import { Metadata } from 'next';
import AdminClientLayout from './client-layout';
import { FaTachometerAlt, FaUsers, FaComments, FaShoppingCart, FaStar, FaPenNib, FaStream, FaTools, FaBrush, FaCog } from 'react-icons/fa';

export const metadata: Metadata = {
  title: 'Admin Dashboard - Enderfall',
  description: 'Admin dashboard for Enderfall Minecraft server',
};

const adminLinks = [
  { href: '/admin', label: 'Dashboard', icon: FaTachometerAlt },
  { href: '/admin/users', label: 'Users', icon: FaUsers },
  { href: '/admin/forums', label: 'Forums', icon: FaComments },
  { href: '/admin/shop', label: 'Shop', icon: FaShoppingCart },
  { href: '/admin/feature-ranks', label: 'Featured Ranks', icon: FaStar },
  { href: '/admin/blog', label: 'Blog', icon: FaPenNib },
  { href: '/admin/activity', label: 'Activities', icon: FaStream },
  { href: '/admin/maintenance', label: 'Maintenance', icon: FaTools },
  { href: '/admin/customization', label: 'Customization', icon: FaBrush },
  { href: '/admin/settings', label: 'Settings', icon: FaCog },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminClientLayout>{children}</AdminClientLayout>;
} 