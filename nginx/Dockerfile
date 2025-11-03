# ===== Stage 1: Build frontend =====
FROM node:20 AS build
WORKDIR /app
COPY ./front/package*.json ./
RUN npm ci --no-progress
COPY ./front .
RUN npm run build

# ===== Stage 2: Nginx =====
FROM nginx:alpine
COPY ./nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY ./nginx/ssl /etc/nginx/ssl
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
