FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/api/package*.json apps/api/
COPY apps/web/package*.json apps/web/
RUN npm ci
COPY apps/web apps/web
RUN npm run build -w @akros/web

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/web/.output ./apps/web/.output
EXPOSE 3000
CMD ["node", "apps/web/.output/server/index.mjs"]
