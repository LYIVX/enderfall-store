import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Complete Your Profile - Enderfall',
  description: 'Complete your Enderfall profile to access all features of our Minecraft gaming community',
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 