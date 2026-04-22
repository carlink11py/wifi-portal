FROM node:20-alpine

WORKDIR /app

# Install frontend dependencies and build
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Install backend dependencies and build
COPY backend/package*.json ./backend/
RUN cd backend && npm install

COPY backend/ ./backend/
RUN cd backend && npm run build

# Copy root package files
COPY package*.json ./

EXPOSE 3000

CMD ["node", "backend/dist/server.js"]
