# ---------- Build client ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install

# Copy source
COPY . .

# Build the React app (.env is copied above via COPY . . and read by Vite)
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
