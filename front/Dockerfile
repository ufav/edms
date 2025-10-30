# ===== build stage =====
FROM node:20 AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --no-progress

COPY . .
RUN npm run build --verbose

# ===== production stage =====
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
