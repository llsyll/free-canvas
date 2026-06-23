import type { NextConfig } from "next";
import path from "node:path";

const isProd = process.env.NODE_ENV === 'production';
const repoName = 'free-canvas';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: isProd ? `/${repoName}` : '',
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
