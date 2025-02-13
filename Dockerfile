# Use Alpine-based Node.js v22
FROM node:22-alpine

# Install OpenSSL and other necessary dependencies
RUN apk add --no-cache openssl

RUN apk add --no-cache ca-certificates

# Set working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first (for caching layer efficiency)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application files
COPY . .

# Expose the application port (change this if needed)
EXPOSE 3000

# Define the default command
CMD ["npm", "start"]
