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
| **Redis** | 6379 | Cache and session storage |
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

## License

MIT
