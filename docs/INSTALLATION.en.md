# Installation & architecture

[فارسی](INSTALLATION.fa.md) · [Project introduction](../README.md)

## Install

Requirements: Git, Docker Engine/Desktop with Compose v2, and a bot token from [BotFather](https://t.me/BotFather). Linux servers should have at least 2 CPU cores and 4 GB RAM for builds.

```sh
git clone --branch main https://github.com/amirmalek0/telegram-marketplace.git
cd telegram-marketplace
cp .env.example .env
```

Edit `.env`: set `BOT_TOKEN`, `JWT_SECRET`, `ADMIN_SEED_PASSWORD`, `POSTGRES_PASSWORD`, and `MINIO_SECRET_KEY`. Generate secrets with `openssl rand -hex 32`; use URL-safe database passwords. Keep `DOCKER_DATABASE_URL` empty for the bundled database. Leave `WEBHOOK_URL` unset for polling; do not run the same bot token in two installations.

```sh
docker compose up -d --build
docker compose ps
curl --fail http://localhost:8080/health
```

| Service | Default URL |
|---|---|
| Miniapp | http://localhost:3000 |
| Admin panel | http://localhost:3001 |
| API health | http://localhost:8080/health |
| MinIO console | http://localhost:9001 |

Sign in with `ADMIN_SEED_USERNAME` / `ADMIN_SEED_PASSWORD`. Tables, buckets, and the initial admin are created automatically. Create your categories, delivery resources and products in the panel. Admin seed credentials apply only on first startup; later password changes belong in the panel.

## Connect Telegram with HTTPS

1. Point two DNS names to your server; allow inbound TCP ports 80 and 443.
2. Set these values in `.env`, replacing the example domains:

```dotenv
MINIAPP_DOMAIN=shop.example.com
BACKOFFICE_DOMAIN=admin.example.com
MINIAPP_PUBLIC_URL=https://shop.example.com
CORS_ALLOWED_ORIGINS=https://shop.example.com,https://admin.example.com
```

3. Start the optional gateway; Caddy obtains and renews TLS certificates:

```sh
docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build
```

4. In BotFather, set the bot's Menu Button or Main Mini App URL to `https://shop.example.com`. Open it from Telegram; ordinary browser visits do not supply Telegram authentication. In the panel, configure payment methods, destination cards and product prices before selling.

Application and storage ports bind to localhost by default (`HOST_BIND=127.0.0.1`); only the optional gateway exposes 80/443 publicly. Stop another bot process using the same token before switching an existing bot to this installation.

## Operations

- Logs: `docker compose logs --tail=100 api bot`. A Telegram `401` means an invalid token; `409` usually means another polling process. Fix `.env`, then run `docker compose up -d`.
- Port conflicts: change `API_PORT`, `BOT_PORT`, `MINIAPP_PORT`, `BACKOFFICE_PORT`, `POSTGRES_PORT`, `MINIO_PORT` or `MINIO_CONSOLE_PORT` in `.env`. Update `MINIAPP_PUBLIC_URL` and CORS when frontend URLs change.
- Updates: `git pull --ff-only` then repeat your Compose command with `--build`. Back up PostgreSQL and MinIO volumes first. `docker compose down` preserves data; **`down -v` deletes it**.
- Optional database UIs: `docker compose --profile tools up -d`. Their default credentials are for local use; do not expose them publicly.
- Stars test mode uses real store fulfillment and wallet/VIP changes. Enable it only for intentional tests.

## Architecture

- `miniapp/`: React + TypeScript + Vite customer interface; `backoffice/`: the admin interface. Their nginx proxies forward `/api/` and `/storage/` to Docker services.
- `core/`: Go API and bot. Feature modules follow **router → handler/DTO → service → repository → PostgreSQL**; SQL lives beside repositories in query files. Migrations run automatically under a shared database lock.
- PostgreSQL stores business data; MinIO stores images, receipts and product files. Private content is served through authenticated access. User requests carry verified Telegram `initData`; admins use JWT sessions.
- Polling receives bot updates. Stars confirmations or admin card-transfer approval settle purchases; delivery workers grant access and retry provider calls with idempotency keys. One installation serves one marketplace.

Optional development: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build` enables frontend hot reload at the same URLs.
