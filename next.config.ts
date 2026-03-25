import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "@google-cloud/text-to-speech",
    "@napi-rs/canvas",
    "fluent-ffmpeg",
    "ffmpeg-static",
    "ffprobe-static"
  ],
};

export default nextConfig;
