import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Forums - Enderfall',
  description: 'View all forums and discussions',
};

export default function ForumsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 