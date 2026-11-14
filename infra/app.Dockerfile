# Laravel + Inertia (app/). FrankenPHP serve o PHP na porta 8080; o Caddy da frente cuida do HTTPS.
FROM node:24-bookworm-slim AS front
WORKDIR /src
COPY app/package.json app/package-lock.json ./
RUN npm ci
COPY app/ ./
RUN npm run build

FROM composer:2 AS vendor
WORKDIR /src
COPY app/composer.json app/composer.lock ./
RUN composer install --no-dev --no-scripts --prefer-dist --no-interaction --ignore-platform-reqs

FROM dunglas/frankenphp:1-php8.5
RUN install-php-extensions pdo_pgsql intl zip opcache pcntl
WORKDIR /app
COPY app/ ./
COPY --from=vendor /src/vendor ./vendor
COPY --from=front /src/public/build ./public/build
RUN composer dump-autoload --optimize --no-dev 2>/dev/null || true \
 && chown -R www-data:www-data storage bootstrap/cache
ENV SERVER_NAME=:8080
# Migrations ao subir; o agendador (tarefas:processar a cada minuto) roda no mesmo container.
CMD ["sh", "-c", "php artisan migrate --force && php artisan config:cache && php artisan route:cache && (php artisan schedule:work &) && frankenphp run --config /etc/caddy/Caddyfile"]
