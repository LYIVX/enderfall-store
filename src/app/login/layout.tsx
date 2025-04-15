import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - Enderfall',
  description: 'Login to your Enderfall account to access all features of our Minecraft gaming community',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 