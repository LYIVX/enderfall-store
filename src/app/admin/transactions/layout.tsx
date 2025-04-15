import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Transactions - Enderfall',
  description: 'View all transactions',
};

export default function TransactionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 