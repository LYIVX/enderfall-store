import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ - Enderfall',
  description: 'Frequently asked questions about the Enderfall Minecraft gaming community',
};

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 