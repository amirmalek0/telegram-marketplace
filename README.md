# Telegram Marketplace

A full-stack Telegram marketplace with Mini App, Backoffice admin panel, and Telegram Bot integration.

## Project Structure

```
telegram-marketplace/
├── core/              # Go backend (API + Bot services)
│   ├── cmd/           # Service entry points
│   ├── internal/      # Application code
│   └── docker/        # Backend Dockerfiles
├── miniapp/           # Telegram Mini App (React + Vite)
├── backoffice/        # Admin Backoffice (React + Vite)
└── docker-compose.yml # Orchestration
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| **API** | 8080 | REST API for Mini App and Backoffice |
| **Bot** | 8081 | Telegram Bot webhook/polling service |
| **Mini App** | 3000 | Telegram Mini App frontend |
| **Backoffice** | 3001 | Admin panel frontend |
| **PostgreSQL** | 5432 | Database |
| **MinIO** | 9000/9001 | Object storage (S3-compatible) |
| **pgAdmin** | 5050 | Database admin UI |
| **CloudBeaver** | 8978 | Database admin UI |

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

### Setup

1. **Clone and configure environment:**

```bash
cp .env.example .env
# Set BOT_TOKEN, a random JWT_SECRET, and your initial admin credentials in .env
```

The API defaults to host port `8080` and the bot webhook server to `8081`.
Override `API_PORT`, `BOT_PORT`, or `POSTGRES_PORT` in `.env` when needed;
container-to-container addresses stay the same. `JWT_SECRET` has no Compose
fallback: generate your own value with `openssl rand -base64 32`.

2. **Start all services:**

```bash
docker compose up --build
```

3. **Access the applications:**

- Mini App: http://localhost:3000
- Backoffice: http://localhost:3001
- API: http://localhost:8080
- Bot: http://localhost:8081
- pgAdmin: http://localhost:5050

### Development Mode (with hot reload)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

This enables hot reload at the same frontend URLs. The development override
keeps one host-port mapping per frontend and uses Docker service names for API
and storage requests.

## Development

### Backend (Go)

```bash
cd core

# For host processes, set DATABASE_URL to a localhost PostgreSQL address.
export DATABASE_URL='postgres://tgmp:tgmp@localhost:5432/telegram_marketplace?sslmode=disable'

# Run API service (separate terminal)
ADDR=:8080 go run ./cmd/api

# Run Bot service (separate terminal)
ADDR=:8081 go run ./cmd/bot

# Run tests
go test ./...
```

### Frontend (React + Vite)

```bash
# Mini App
cd miniapp
npm ci
npm run dev

# Backoffice
cd backoffice
npm ci
npm run dev
```

The local Vite servers use ports `3000` and `3001`. Both call `/api/v1` on
their own origin; their proxy defaults to `http://localhost:8080`. Copy each
frontend's `.env.example` to `.env.local` when overriding the proxy or storage
signing host. Set `VITE_ALLOWED_HOSTS` to explicit hostnames when exposing a
Vite development server through a tunnel.

## Telegram and public deployment

- Serve the miniapp and backoffice through HTTPS in production. Browser API and
  storage requests use the same-origin nginx proxies bundled in their images.
- Set the bot's Mini App URL in BotFather to your public miniapp HTTPS URL.
- Set `MINIAPP_PUBLIC_URL` before building the backoffice so its content editor
  opens that same URL. Set `CORS_ALLOWED_ORIGINS` for your actual frontend origins.
- Leave `WEBHOOK_URL` empty for polling. For webhooks, set the public webhook URL
  and a random `TELEGRAM_WEBHOOK_SECRET`, and route HTTPS traffic to the bot service.
- Replace the example admin, database and MinIO credentials before public use;
  expose database/storage consoles only on trusted networks. Persist and back up
  the PostgreSQL and MinIO volumes. `docker compose down -v` removes those volumes.
- Catalog images and downloadable product files are uploaded through the admin
  panel into object storage. A new installation has no store-specific catalog.

## Environment Variables

### Required

- `BOT_TOKEN` - Telegram Bot token from BotFather
- `DATABASE_URL` - PostgreSQL connection string
- `STORAGE_ENDPOINT` - MinIO/S3 endpoint
- `MINIO_ACCESS_KEY` - MinIO access key
- `MINIO_SECRET_KEY` - MinIO secret key
- `PRODUCT_IMAGES_BUCKET` - Bucket for product storefront images (default: `product-images`)
- `PRODUCT_IMAGES_PUBLIC_URL` - Public base URL for product images

### Optional

- `WEBHOOK_URL` - Bot webhook URL (empty = polling mode)
- `MINIAPP_API_URL` - Mini App API base URL
- `BACKOFFICE_API_URL` - Backoffice API base URL
- `API_PORT`, `BOT_PORT`, `POSTGRES_PORT` - Host port overrides
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` - Bundled database credentials
- `DOCKER_DATABASE_URL` - Optional API/bot database URL inside Docker; defaults to
  the bundled PostgreSQL service using `POSTGRES_*`. URL-encode credentials when
  supplying a custom connection string.
- `MINIAPP_PUBLIC_URL` - Mini App URL used by the backoffice editor
- `VITE_API_PROXY_TARGET` - Local Vite API upstream
- `VITE_STORAGE_PROXY_TARGET`, `VITE_STORAGE_SIGNING_HOST` - Local storage proxy settings
- `VITE_ALLOWED_HOSTS` - Additional allowed Vite development hostnames

## Architecture

The project follows a clean architecture pattern with separation of concerns:

- **core/** - Shared domain logic, API routes, and bot handlers
- **miniapp/** - Telegram Mini App frontend (user-facing)
- **backoffice/** - Admin panel frontend (admin-facing)

All services share the same PostgreSQL database and can communicate through the internal Docker network.

## Backend security and payment recovery

- Use Go 1.26.9 (also pinned in the backend Dockerfiles). Rebuild the API and bot
  together when applying backend changes; migrations run at startup.
- Admin access tokens expire after 15 minutes; refresh tokens rotate on use and
  expire after 7 days. Logout, disabling an account, and password changes revoke
  access.
- Telegram Mini App authentication accepts signed initialization data for one hour,
  with one minute of future clock skew. Reopen the Mini App to obtain fresh data.
- File, inventory, message, bundle, and provider-API management routes are
  admin-only. Customers obtain content through ownership-checked deliveries.
- Stars test mode simulates the charge but uses real settlement: successful tests
  credit wallets, activate VIP, and deliver products. Product checkouts reserve
  inventory and coupons and enforce purchase limits just like paid checkouts.
  This is a global setting, not a per-user sandbox; enable it only when you intend
  users to receive these benefits without paying Telegram Stars. Disabling it
  rejects pending simulations.
- Unapproved invoices expire after 30 minutes. Accepted pre-checkouts retain their
  reservations for up to 24 hours; genuine payments arriving after expiration are
  refunded through Telegram rather than discarded.
- API delivery jobs retry with a one-minute failure delay and a two-minute
  processing lease. External providers must honor the stable `Idempotency-Key`
  header (the delivery-item UUID) to prevent duplicate effects after a timeout.
  Configure only public HTTPS endpoints on port 443. Redirects, private addresses,
  environment proxies, and responses larger than 2 MiB are blocked.
- Failed bot updates are stored in `telegram_failed_updates` before acknowledgement.
  Financial updates keep retrying. Other updates become dead letters after ten
  attempts. Monitor dead letters and aged `pending`, `processing`, or `failed`
  payments/deliveries; database errors are logged without discarding the update.
- Login throttling is bounded and process-local. Multi-replica deployments should
  additionally enforce shared rate limits at the ingress/proxy.

Verification: run `go test ./...`, `go vet ./...`, and
`go run golang.org/x/vuln/cmd/govulncheck@latest ./...` inside `core`.
Set `COUPON_TEST_DATABASE_URL` to a development PostgreSQL database to run isolated
schema integration tests; these clone table definitions, not customer records.

## License

MIT
