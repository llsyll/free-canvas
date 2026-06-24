import type { NextConfig } from "next";
import path from "node:path";

const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const repoName = 'free-canvas';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: isGitHubPages ? `/${repoName}` : '',
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    unoptimized: true,
  },
  devIndicators: false,
};

export default nextConfig;
