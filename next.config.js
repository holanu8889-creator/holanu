/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Disabled to support middleware

  // Configure Turbopack root directory
  experimental: {
    turbo: {
      root: __dirname,
    },
  },
}

module.exports = nextConfig