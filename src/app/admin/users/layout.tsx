import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Users - Enderfall',
  description: 'View all users',
};

export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 