FROM node:22-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY backend/package.json backend/pnpm-lock.yaml ./

# Install dependencies (ignoring scripts to bypass pnpm 10 security errors)
RUN pnpm install --ignore-scripts

# Copy prisma schema and generate client explicitly
COPY backend/prisma ./prisma
RUN npx prisma generate

# Copy the rest of the backend application code
COPY backend/ .

# Expose the port the app runs on
EXPOSE 5080

# Start the application using ts-node to run directly from src/
# This avoids any issues with the 'dist' folder or compiled module resolution
CMD ["npx", "ts-node", "-r", "tsconfig-paths/register", "src/main.ts"]
