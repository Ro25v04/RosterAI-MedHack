/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev }) => {
    if (dev) config.cache = false; // fixes "Failed to allocate memory" on some laptops
    return config;
  },
};

module.exports = nextConfig;