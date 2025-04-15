import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - Enderfall',
  description: 'Privacy policy and information for the Enderfall Minecraft gaming community',
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 