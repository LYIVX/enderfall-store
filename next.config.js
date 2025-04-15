/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'cdn.discordapp.com', 
      'lh3.googleusercontent.com', 
      'mc-heads.net', 
      'imgur.com',
      'wsjjasupxnzinvopxgum.supabase.co'
    ],
  },
}

module.exports = nextConfig 