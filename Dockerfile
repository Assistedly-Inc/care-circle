FROM node:20-alpine

WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose the port (default 3002)
EXPOSE 3002

# Start the server
CMD ["node", "dist/server.js"]
