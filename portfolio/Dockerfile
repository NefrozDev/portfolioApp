# Build context: repository root (the app imports shared code from Common/).
FROM node:24-alpine AS builder

WORKDIR /app

COPY portfolio/package*.json portfolio/
COPY Common/package.json Common/
RUN npm ci --prefix portfolio --ignore-scripts

COPY Common Common
COPY portfolio portfolio

# "development" points the app at the API on http://localhost:3000.
ARG BUILD_CONFIGURATION=production
RUN npm --prefix portfolio run build -- --configuration ${BUILD_CONFIGURATION}

FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY portfolio/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/portfolio/dist/portfolio/browser /usr/share/nginx/html

USER nginx

EXPOSE 8080
