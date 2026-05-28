FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
RUN addgroup -S icos && adduser -S icos -G icos
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
RUN mkdir -p /data/uploads /data/backups && chown -R icos:icos /data
USER icos
EXPOSE 3000
ENV NODE_ENV=production
ENV DB_PATH=/data/icos.db
ENV BACKUP_DIR=/data/backups
CMD ["node", "dist/server.js"]
