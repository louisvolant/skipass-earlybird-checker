import { defineCloudflareConfig } from '@opennextjs/cloudflare';

const config = defineCloudflareConfig();
// Define custom buildCommand so that npm run build can directly run opennextjs-cloudflare build
// without recursive npm run build loop, making it work seamlessly with Cloudflare Workers Builds.
config.buildCommand = 'npx next build';

export default config;
