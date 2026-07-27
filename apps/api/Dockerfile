FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/api/package*.json apps/api/
COPY apps/web/package*.json apps/web/
RUN npm ci
COPY apps/api apps/api
RUN npm run build -w @akros/api

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
CMD ["node", "apps/api/dist/server.js"]
