import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Blog - Enderfall',
  description: 'Create a new blog post',
};

export default function CreateBlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 