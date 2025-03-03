/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "cdn.discordapp.com",
      "mc-heads.net",
      "cdn.discordapp.com/embed/avatars",
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        pathname: "/avatars/**",
      },
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        pathname: "/embed/avatars/**",
      },
      {
        protocol: "https",
        hostname: "mc-heads.net",
        pathname: "/avatar/**",
      },
    ],
  },
};

module.exports = nextConfig;
