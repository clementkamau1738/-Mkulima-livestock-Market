# Build the SPA, then serve it with nginx, which also forwards /api, the Django
# Admin and /static to the backend and serves uploaded media from a volume.
FROM node:22.23.4-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Public, build-time only. Never put secrets in VITE_* variables.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

FROM nginx:1.30.6-alpine
# The official image renders /etc/nginx/templates/*.template with envsubst at start.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
ENV BACKEND_HOST=backend:8000 \
    DJANGO_ADMIN_PATH=/django-admin/ \
    CSP_IMG_SRC="'self' data:"
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --retries=5 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
