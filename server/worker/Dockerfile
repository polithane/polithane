FROM node:20-alpine

WORKDIR /app

# FFmpeg + ffprobe
RUN apk add --no-cache ffmpeg

# Install server deps (includes @supabase/supabase-js)
COPY server/package*.json ./server/
RUN cd server && npm install --production

COPY server ./server

ENV NODE_ENV=production

# Worker entrypoint
CMD ["node", "server/worker/videoTranscodeWorker.js"]

