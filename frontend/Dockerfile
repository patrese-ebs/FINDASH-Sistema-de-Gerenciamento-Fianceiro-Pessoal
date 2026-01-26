# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build the Angular app for production
RUN npm run build --configuration=production

# Production Stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
# Angular build output is usually in dist/frontend-ng/browser (for v17+) or dist/frontend-ng
# We need to verify the output path in angular.json, but standard is dist/<project-name>/browser for SSG/SSR compatible builds
# or just dist/<project-name>
COPY --from=builder /app/dist/frontend-ng/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
