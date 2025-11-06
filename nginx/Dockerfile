# ===== Stage 1: Build frontend =====
FROM node:20 AS build
WORKDIR /app
COPY ./front/package*.json ./
RUN npm ci --no-progress
COPY ./front ./
RUN npm run build

# ===== Stage 2: Nginx =====
FROM nginx:alpine

# Копируем собранный фронт
COPY --from=build /app/dist /usr/share/nginx/html

# Копируем конфиги nginx (будет перезаписан volume mount из docker-compose.yml, если он есть)
# Контекст сборки - корень проекта, поэтому путь относительно корня
COPY nginx/conf.d/ /etc/nginx/conf.d/

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
