FROM node:22-slim AS base

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy built output
COPY dist/ ./dist/

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
