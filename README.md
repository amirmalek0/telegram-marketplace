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

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

### Setup

1. **Clone and configure environment:**

```bash
cp .env.example .env
# Edit .env with your BOT_TOKEN and other settings
```

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

This enables hot reload for frontend applications.

## Development

### Backend (Go)

```bash
cd core

# Run API service
go run ./cmd/api

# Run Bot service
go run ./cmd/bot

# Run tests
go test ./...
```

### Frontend (React + Vite)

```bash
# Mini App
cd miniapp
npm install
npm run dev

# Backoffice
cd backoffice
npm install
npm run dev
```

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

## Architecture

The project follows a clean architecture pattern with separation of concerns:

- **core/** - Shared domain logic, API routes, and bot handlers
- **miniapp/** - Telegram Mini App frontend (user-facing)
- **backoffice/** - Admin panel frontend (admin-facing)

All services share the same PostgreSQL database and can communicate through the internal Docker network.

## Backend security and payment recovery

- Use Go 1.26.9 (also pinned in the backend Dockerfiles). Rebuild the API and bot
  together: startup migrations add admin sessions and the durable bot retry queue.
- Admin access tokens expire after 15 minutes; refresh tokens rotate on use and
  expire after 7 days. Logout, disabling an account, and password changes revoke
  access. Tokens issued before this upgrade require a fresh login.
- Telegram Mini App authentication accepts signed initialization data for one hour,
  with one minute of future clock skew. Reopen the Mini App to obtain fresh data.
- File, inventory, message, bundle, and provider-API management routes are
  admin-only. Customers obtain content through ownership-checked deliveries.
- Stars test mode simulates the charge but uses real settlement: successful tests
  credit wallets, activate VIP, and deliver products. Product checkouts reserve
  inventory and coupons and enforce purchase limits just like paid checkouts.
  This is a global setting, not a per-user sandbox; enable it only when you intend
  users to receive these benefits without paying Telegram Stars. Disabling it
  rejects pending simulations. Historical simulation-only payments are not
  retroactively fulfilled; start a new checkout to test the restored behavior.
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
