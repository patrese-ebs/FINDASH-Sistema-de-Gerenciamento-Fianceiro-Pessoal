# Build Stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production Stage
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/config ./src/config
# Copy any other necessary files (like templates, SSL certs if local)

EXPOSE 3000

CMD ["node", "dist/server.js"]
