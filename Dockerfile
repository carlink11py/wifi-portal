FROM node:20-alpine

WORKDIR /app

# Build frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Build backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install
COPY backend/ ./backend/
RUN cd backend && npx tsc

# Copy frontend dist next to backend dist so paths are simple
RUN cp -r /app/frontend/dist /app/backend/dist/public

EXPOSE 3000
CMD ["node", "backend/dist/server.js"]
