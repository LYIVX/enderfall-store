import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Blogs - Enderfall',
  description: 'View all blogs',
};

export default function BlogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 