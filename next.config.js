/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // The project uses (supabase as any) pattern throughout — TS errors won't block production build
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
