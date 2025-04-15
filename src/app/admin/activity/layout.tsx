import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Activity - Enderfall',
  description: 'View all users activity',
};

export default function ActivityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 