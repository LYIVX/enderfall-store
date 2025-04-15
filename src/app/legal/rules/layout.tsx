import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Server Rules - Enderfall',
  description: 'Official rules and guidelines for the Enderfall Minecraft gaming community',
};

export default function RulesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 