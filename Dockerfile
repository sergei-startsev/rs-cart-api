FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install ci
RUN npm run build

FROM alpine
RUN apk add --update nodejs npm
WORKDIR /app
COPY package*.json ./
RUN npm install ci --omit=dev
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/main.js"]
EXPOSE 4000
