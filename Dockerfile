FROM node:20-bookworm-slim AS base

# Install necessary system fonts for @napi-rs/canvas so it can render Arabic perfectly
RUN apt-get update && apt-get install -y \
    fonts-noto-core \
    fonts-hosny-amiri \
    fontconfig \
    && rm -rf /var/lib/apt/lists/*

FROM base AS builder
WORKDIR /app
COPY package*.json ./
# Install dependencies including our native @napi-rs/canvas and fluent-ffmpeg
RUN npm ci
COPY . .
# We must generate the prisma client before building Next.js
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Security best practice: rootless container execution
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy over the necessary raw assets
COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Optional: Ensure our public storage directory has write permissions if using Local Storage
RUN mkdir -p /app/public/audio /app/public/videos
RUN chown -R nextjs:nodejs /app/public

USER nextjs

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
