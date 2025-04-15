import './globals.css';
import React from 'react';
import { Inter } from 'next/font/google';
import { Metadata } from 'next';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { AuthProvider } from '@/components/Auth/AuthContext';
import { ThemeProvider } from '@/components/Theme/ThemeContext';
import { ChatPreferencesProvider } from '@/components/Theme/ChatPreferencesContext';
import { UserStatusProvider } from '@/components/Auth/UserStatusContext';
import { headers } from 'next/headers';
import '../styles/fonts.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Enderfall - Minecraft Gaming Community',
  description: 'Join the premier Minecraft server community with unique game modes, friendly players, and regular events.',
  icons: {
    icon: '/images/favicon.ico',
  },
};

// Define the main navigation links for consistency across the site
export const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Shop', href: '/shop' },
  { label: 'Social', href: '/social' },
  { label: 'Vote', href: '/vote' },
  { label: 'Wiki', href: '/wiki' },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get the request ID from middleware to track navigation
  const headersList = headers();
  const requestId = headersList.get('X-Middleware-Request-Id') || '';
  
  return (
    <html lang="en">
      <head>
        <meta name="request-id" content={requestId} />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider>
            <ChatPreferencesProvider>
              <UserStatusProvider>
                <div className="app-container">
                  <Navbar navLinks={navLinks} />
                  <main className="main-content">
                    {/* 
                      The auth handling is now properly managed by:
                      1. The middleware, which refreshes sessions without redirect
                      2. The AuthContext, which manages auth state without automatic redirects
                      3. Individual pages that handle their own auth requirements
                    */}
                    {children}
                  </main>
                  <Footer navLinks={navLinks} />
                </div>
              </UserStatusProvider>
            </ChatPreferencesProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
