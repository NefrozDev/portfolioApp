FROM node:24-alpine AS builder

WORKDIR /app

# copy everything (including Common)
COPY . .

WORKDIR /app/Backend

RUN npm ci --ignore-scripts
RUN npm run build

FROM node:24-alpine

WORKDIR /app

COPY --from=builder /app/Backend/package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/Backend/dist ./dist

EXPOSE 3000

CMD ["node", "dist/Backend/src/server.js"]