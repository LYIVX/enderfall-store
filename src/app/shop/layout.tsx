import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shop - Enderfall',
  description: 'Purchase ranks and upgrades for the Enderfall Minecraft server',
};

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 