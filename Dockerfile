# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files and install dependencies
COPY package.json ./
RUN npm install --no-audit --no-fund

# Copy source code
COPY . .

# Build argument for API URL (can be overridden at build time)
ARG VITE_API_URL=http://localhost:8080/api
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN npm run build

# Runtime stage with nginx
FROM nginx:alpine AS runtime
WORKDIR /usr/share/nginx/html

# Copy built files from build stage
COPY --from=build /app/dist .

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create script to inject runtime environment variables
RUN cat > /docker-entrypoint.d/40-update-env.sh << 'EOF'
#!/bin/sh
set -e

# Create env-config.js with runtime environment variables
cat > /usr/share/nginx/html/env-config.js << ENVEOF
window.ENV = {
  VITE_API_URL: '${VITE_API_URL:-http://localhost:8080/api}'
};
ENVEOF

echo "Environment configuration updated:"
cat /usr/share/nginx/html/env-config.js
EOF

RUN chmod +x /docker-entrypoint.d/40-update-env.sh

# Environment variable for runtime configuration
ENV VITE_API_URL=http://localhost:8080/api

EXPOSE 80

# Use nginx default entrypoint
CMD ["nginx", "-g", "daemon off;"]
