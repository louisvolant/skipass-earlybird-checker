// next.config.ts
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {},
  serverExternalPackages: ['mongoose', 'node-mailjet'],
};

module.exports = nextConfig;
