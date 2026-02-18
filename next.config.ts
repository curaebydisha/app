import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // Required for static export to work with dynamic client-side routing on some hosts, 
  // though Netlify usually handles clean URLs.
  // We might need an _redirects file for SPA routing.
  images: { unoptimized: true } // Required for static export if using next/image
};

export default nextConfig;
