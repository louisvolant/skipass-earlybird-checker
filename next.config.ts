import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {},
  serverExternalPackages: ['mongoose', 'node-mailjet'],
};

export default nextConfig;
