import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Edit Blog - Enderfall',
  description: 'Edit a blog post',
};

export default function EditBlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 