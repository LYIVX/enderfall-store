import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profile - Enderfall',
  description: 'View and manage your profile on the Enderfall Minecraft server',
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 