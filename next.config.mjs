/** @type {import('next').NextConfig} */
const nextConfig = {
  // Live canonical projection and the authenticated operator surface require
  // a server runtime. Static export remains available only for explicit
  // fixture/review builds and must never be presented as live production.
  ...(process.env.CIVICLENZ_STATIC_EXPORT === 'true' ? { output: 'export' } : {}),
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
