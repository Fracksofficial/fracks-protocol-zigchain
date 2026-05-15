FROM node:22-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY frontend/package.json frontend/pnpm-lock.yaml ./

# Install dependencies (ignoring scripts to bypass pnpm 10 security errors)
RUN pnpm install --ignore-scripts

# Copy the rest of the frontend application code
COPY frontend/ .

# Expose the port the app runs on
EXPOSE 5081

# Start the application
CMD ["pnpm", "run", "dev"]
