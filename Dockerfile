# ---------- Build client ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Build-time secrets injected by Cloud Build from Secret Manager
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_APP_ID

# Write .env so Vite can inline these values into the browser bundle
RUN printf 'VITE_FIREBASE_API_KEY=%s\nVITE_FIREBASE_AUTH_DOMAIN=%s\nVITE_FIREBASE_PROJECT_ID=%s\nVITE_FIREBASE_APP_ID=%s\n' \
    "$VITE_FIREBASE_API_KEY" "$VITE_FIREBASE_AUTH_DOMAIN" "$VITE_FIREBASE_PROJECT_ID" "$VITE_FIREBASE_APP_ID" > .env

# Build the React app
RUN npm run build

# ---------- Runtime image ----------
FROM node:20-alpine

WORKDIR /app

# Copy only what we need for runtime
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy built client and server code
COPY --from=builder /app/dist ./dist
COPY server.js ./server.js

# Set env vars expected by your server (adjust as needed)
ENV NODE_ENV=production
ENV PORT=8080

# Expose port for Cloud Run / container
EXPOSE 8080

# Start your Node server
CMD ["node", "server.js"]
