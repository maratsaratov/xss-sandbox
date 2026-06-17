# Фронтенд: React (Vite dev-сервер)
FROM node:20-alpine

WORKDIR /app

# Сначала зависимости — кешируется отдельным слоем.
COPY package*.json ./
RUN npm install

# Затем исходный код (node_modules/dist исключены через .dockerignore).
COPY . .

EXPOSE 5173

# --host чтобы Vite слушал 0.0.0.0 и был доступен с хоста.
CMD ["npm", "run", "dev", "--", "--host"]
