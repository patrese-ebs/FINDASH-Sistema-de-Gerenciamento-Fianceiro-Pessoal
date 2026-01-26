# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build the Angular app for production
# Build the Angular app for production
# Increase memory limit for node process to avoid OOM
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build -- --configuration=production --verbose

# Production Stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
# Angular build output is usually in dist/frontend-ng/browser (for v17+) or dist/frontend-ng
# We need to verify the output path in angular.json, but standard is dist/<project-name>/browser for SSG/SSR compatible builds
# or just dist/<project-name>
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
