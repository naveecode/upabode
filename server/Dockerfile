FROM node:20-alpine

WORKDIR /app

# Copy root prisma schema and server files
COPY prisma ./prisma/
COPY server/package*.json ./

RUN npm install

COPY server/src ./src
COPY server/tsconfig.json ./

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 5000

CMD ["npm", "start"]
