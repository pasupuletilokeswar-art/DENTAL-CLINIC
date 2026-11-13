# Stage 1: Build TypeScript Backend Application
FROM node:20-alpine AS builder

# Install OpenSSL required by Prisma Query Engine on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Copy dependency specifications and Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies deterministically
RUN npm ci

# Copy source code and generate Prisma client + build TypeScript
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Production Execution Runtime
FROM node:20-alpine AS runner

# Install OpenSSL required by Prisma runtime engine
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files and Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install runtime dependencies (including prisma and tsx for entrypoint initialization)
RUN npm ci

# Copy compiled application code and Prisma artifacts from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy startup entrypoint script and set permissions
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r$//' ./docker-entrypoint.sh && chmod +x ./docker-entrypoint.sh

EXPOSE 5000

ENTRYPOINT ["/bin/sh", "/app/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
