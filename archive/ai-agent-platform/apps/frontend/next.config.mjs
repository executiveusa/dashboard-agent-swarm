/** @type {import('next').NextConfig} */
const config = {
  experimental: {
    serverActions: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default config;
