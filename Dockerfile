# Backend Dockerfile (opsiyonel - Docker deployment için)
FROM node:20-alpine

WORKDIR /app

# Copy backend files
COPY server/package*.json ./server/
RUN cd server && npm install --production

COPY server ./server

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node server/healthcheck.js

EXPOSE 5000

CMD ["node", "server/index.js"]
