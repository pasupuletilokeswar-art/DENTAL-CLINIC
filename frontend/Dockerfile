# Stage 1: Build Frontend React Application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package definitions
COPY package*.json ./

# Install dependencies deterministically
RUN npm ci

# Copy application source and build production bundle
COPY . .
RUN npm run build

# Stage 2: Serve with Production Nginx
FROM nginx:1.27-alpine

# Remove default HTML assets
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled frontend assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy isolated Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
