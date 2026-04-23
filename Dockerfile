# Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

ARG VITE_PORTFOLIO_URL=https://lieltavor.com
ARG VITE_PLATFORM_URL=https://devops.lieltavor.com
ARG VITE_POCKETBASE_URL=https://api.devops.lieltavor.com
ENV VITE_PORTFOLIO_URL=$VITE_PORTFOLIO_URL
ENV VITE_PLATFORM_URL=$VITE_PLATFORM_URL
ENV VITE_POCKETBASE_URL=$VITE_POCKETBASE_URL

RUN npm run build

# Stage 2: serve
FROM nginx:1.25-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
