/** @type {import('next').NextConfig} */
const nextConfig = {
  // Bắt buộc để Dockerfile hoạt động đúng
  output: 'standalone',

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nocodb-production-200b.up.railway.app',
      },
      {
        protocol: 'http',
        hostname: 'nocodb',         // Docker internal
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },

  env: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  },
}

module.exports = nextConfig
