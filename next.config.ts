import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["anki-apkg-export", "sql.js"],
};

export default nextConfig;
