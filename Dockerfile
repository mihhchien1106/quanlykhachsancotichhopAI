FROM node:22-alpine
WORKDIR /app/backend
COPY backend/package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY --chown=node:node backend/ ./
COPY --chown=node:node frontend/ /app/frontend/
RUN mkdir -p data && chown -R node:node data
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4000
USER node
EXPOSE 4000
CMD ["node", "server.js"]
