<a name="guide-top"></a>

<h1 align="center">📘 Installation and architecture</h1>

<p align="center">
  <a href="../README.md"><img src="assets/readme-buttons/overview-en.svg" alt="Project overview" width="264"></a>
  <a href="INSTALLATION.fa.md"><img src="assets/readme-buttons/install-fa.svg" alt="راهنمای نصب فارسی" width="264"></a>
</p>

This guide installs **one marketplace with one Telegram bot** using the included Docker services. Complete steps 1–6 to run it locally; complete steps 7–9 to use it from Telegram and prepare your first product.

Run commands from the repository directory unless a step says otherwise. On a server, run them in your SSH session. On Windows, use a WSL 2 Linux terminal with Docker Desktop integration enabled.

| What do you want to do? | Follow this path |
|---|---|
| Inspect the admin panel on your computer | Steps 1–6; public DNS is not required. |
| Use the store from Telegram | Steps 1–9; provide a reachable HTTPS URL in step 7. |

<details>
<summary><strong>🧭 Installation map — jump to a step</strong></summary>

<table>
<tr><td align="center">1</td><td><a href="#step-1">🧰 Prepare your computer or server</a></td></tr>
<tr><td align="center">2</td><td><a href="#step-2">🤖 Create your Telegram bot</a></td></tr>
<tr><td align="center">3</td><td><a href="#step-3">📥 Download the source</a></td></tr>
<tr><td align="center">4</td><td><a href="#step-4">🔐 Set credentials</a></td></tr>
<tr><td align="center">5</td><td><a href="#step-5">🚀 Build and start</a></td></tr>
<tr><td align="center">6</td><td><a href="#step-6">🖥️ Open the admin panel</a></td></tr>
<tr><td align="center">7</td><td><a href="#step-7">🌐 Add domains and HTTPS</a></td></tr>
<tr><td align="center">8</td><td><a href="#step-8">✈️ Connect Telegram</a></td></tr>
<tr><td align="center">9</td><td><a href="#step-9">✅ Test a complete purchase</a></td></tr>
</table>
</details>

<p align="center"><a href="#operations">🗃️ Maintenance</a> · <a href="#troubleshooting">🛠️ Troubleshooting</a> · <a href="#architecture">🏗️ Architecture</a></p>

---

<a name="step-1"></a>

## 1. 🧰 Prepare your computer or server

You need:

- Git to download and update the source.
- Docker Engine with the Compose v2 plugin on Linux, or Docker Desktop on macOS/Windows. Start Docker Desktop before continuing.
- A Telegram account and a bot token from [BotFather](https://t.me/BotFather).
- Internet access for Docker images, build dependencies, and the Telegram API.
- For a public installation: a server with a public IP and two domain names/subdomains you control. The examples use `shop.example.com` and `admin.example.com`; replace both with your own addresses.

A starting point for building on a server is 2 CPU cores and 4 GB RAM. Storage depends on your product files and uploads; allow additional space for builds and backups.

If Docker is not installed, follow its official guide for [Ubuntu](https://docs.docker.com/engine/install/ubuntu/), [macOS](https://docs.docker.com/desktop/setup/install/mac-install/), or [Windows](https://docs.docker.com/desktop/setup/install/windows-install/). You do not need to install Go, Node.js, PostgreSQL, or MinIO separately for this Docker installation.

Check your tools:

```sh
git --version
docker --version
docker compose version
docker info
```

> [!TIP]
> **Expected result:** the version commands succeed and `docker info` can reach the Docker engine. If it cannot, start Docker or fix Docker access before continuing.

<a name="step-2"></a>

## 2. 🤖 Create your Telegram bot

1. Open the official [@BotFather](https://t.me/BotFather).
2. Send `/newbot`, choose a display name, and choose the username BotFather requests.
3. Save the bot token. You will paste it into `BOT_TOKEN` in step 4.

You can also use an existing bot. Stop any other installation/process that consumes updates for the same token before starting this one. The default setup uses **polling**: the bot contacts Telegram itself, so it does not need a public webhook endpoint.

<a name="step-3"></a>

## 3. 📥 Download the source and create `.env`

```sh
git clone --branch main https://github.com/amirmalek0/telegram-marketplace.git
cd telegram-marketplace
cp .env.example .env
```

The directory should now contain `.env`, `docker-compose.yml`, `core/`, `miniapp/`, and `backoffice/`. `.env` is your private installation configuration; `.env.example` is only a template.

> [!IMPORTANT]
> **Copy the template only for a new installation.** Copying it again over an existing `.env` would replace your current credentials and settings. Do not commit `.env` or share its contents.

<a name="step-4"></a>

## 4. 🔐 Set credentials and basic configuration

Open `.env` in a text editor. Replace the following values before the first startup:

| Variable | What to enter |
|---|---|
| `BOT_TOKEN` | The complete token from BotFather. Use the same bot throughout this installation. |
| `JWT_SECRET` | A random secret used to sign admin sessions; use the 64-character hex output below. |
| `ADMIN_SEED_USERNAME` | Your initial admin username, such as `admin`. |
| `ADMIN_SEED_PASSWORD` | A unique password for that initial admin. |
| `POSTGRES_PASSWORD` | A unique password for the bundled database. |
| `MINIO_SECRET_KEY` | A unique password/secret for the bundled object storage. |

You can generate a value with:

```sh
openssl rand -hex 32
```

Run it separately for each secret/password and paste the different outputs into `.env`. Hex values avoid special characters that would need escaping in connection URLs or `.env` files. Do not paste the placeholder values below literally:

```dotenv
BOT_TOKEN=PASTE_YOUR_BOTFATHER_TOKEN
JWT_SECRET=PASTE_A_RANDOM_HEX_VALUE
ADMIN_SEED_USERNAME=admin
ADMIN_SEED_PASSWORD=PASTE_A_DIFFERENT_RANDOM_HEX_VALUE
POSTGRES_PASSWORD=PASTE_ANOTHER_RANDOM_HEX_VALUE
MINIO_SECRET_KEY=PASTE_ANOTHER_DIFFERENT_RANDOM_HEX_VALUE
```

Keep the remaining template values for the initial Docker setup, especially:

| Setting | How it works in this guide |
|---|---|
| `DOCKER_DATABASE_URL` | Leave empty. Compose builds the internal connection from `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`. |
| `DATABASE_URL` | Used when running a Go process directly on the host; it does not override the Docker connection. If you later run Go locally, update its credentials to match PostgreSQL. |
| `WEBHOOK_URL` | Leave unset or empty for polling. A webhook is not required by the HTTPS setup below. |
| `HOST_BIND` | Keep `127.0.0.1`. Database, storage, API and frontend host ports remain local; the HTTPS gateway exposes the public sites. |
| `MINIAPP_PUBLIC_URL` | Keep `http://localhost:3000` locally. Change it to your public miniapp URL in step 7; the admin editor uses it for its preview. |
| `VITE_API_BASE_URL` | Keep `/api/v1`. The Docker frontends proxy requests to the API on the same origin. |
| `STORAGE_ENDPOINT` and bucket URLs | Leave the template values. Compose uses `minio:9000` internally and serves browser assets through `/storage/`. |

The optional `MINIAPP_API_URL` and `BACKOFFICE_API_URL` overrides should remain unset for this setup. Do not point browser requests to `http://localhost:8080` from a public HTTPS miniapp.

Validate the configuration without printing the resolved secrets:

```sh
docker compose config --quiet
```

> [!TIP]
> **Expected result:** no validation error. This checks Compose configuration, not whether your Telegram token is valid.

<a name="step-5"></a>

## 5. 🚀 Build and start the services

```sh
docker compose up -d --build
docker compose ps
curl --fail http://localhost:8080/health
```

The first build downloads dependencies and can take several minutes. `-d` keeps the containers running in the background.

> [!TIP]
> **Expected result:** `postgres`, `minio`, `api`, `bot`, `miniapp`, and `backoffice` are running; infrastructure health checks become healthy; the API returns `{"status":"ok"}`. Database tables, storage buckets, and the initial admin are created automatically. You do not need to import SQL or create buckets manually.

If a service exits or keeps restarting, inspect it before continuing:

```sh
docker compose logs --tail=100 api bot
docker compose logs --tail=100 postgres minio
```

Do not start another copy of this bot token while these services are running.

<a name="step-6"></a>

## 6. 🖥️ Open the admin panel

For an installation on your own computer:

| Service | Default address | Purpose |
|---|---|---|
| Admin panel | http://localhost:3001 | Sign in and manage the store. |
| Miniapp | http://localhost:3000 | Check that the frontend loads; authenticated customer use requires Telegram. |
| API health | http://localhost:8080/health | Verify that the API is responding. |
| MinIO console | http://localhost:9001 | Optional storage administration using `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`. |

Sign in with the `ADMIN_SEED_USERNAME` and `ADMIN_SEED_PASSWORD` you saved in `.env`. These values create the admin **only on the first database initialization**. Editing them later does not reset an existing admin; use the panel's password-change option instead.

> [!NOTE]
> **On a remote server, `localhost` means the server, not your laptop.** Continue to step 7 and open the public admin domain afterward. If you need temporary access before DNS is ready, run this on your own computer, replacing the SSH account and IP:

```sh
ssh -N -L 3000:127.0.0.1:3000 -L 3001:127.0.0.1:3001 deploy@YOUR_SERVER_IP
```

Keep that SSH session open, then visit `http://localhost:3001` on your computer. This forwards the admin and miniapp ports without exposing them publicly.

<a name="step-7"></a>

## 7. 🌐 Add domains and HTTPS

Telegram customer access needs a reachable HTTPS miniapp URL. This project includes an optional Caddy gateway that manages certificates for both frontends.

1. In your DNS provider, create an **A record** for each subdomain pointing to the server's public IPv4 address. Use an AAAA record only if that server also has working public IPv6.
2. Allow inbound TCP **80 and 443** in the server/provider firewall. Keep SSH access available. Those ports must be free; if another web server already uses them, configure that proxy instead of starting a second gateway on the same ports.
3. Replace the following values in `.env`:

```dotenv
MINIAPP_DOMAIN=shop.example.com
BACKOFFICE_DOMAIN=admin.example.com
MINIAPP_PUBLIC_URL=https://shop.example.com
CORS_ALLOWED_ORIGINS=https://shop.example.com,https://admin.example.com
```

`MINIAPP_DOMAIN` and `BACKOFFICE_DOMAIN` contain hostnames only: no `https://` or path. `MINIAPP_PUBLIC_URL` is a full URL. Use origins without paths or trailing slashes in CORS. No separate public API or storage domain is needed.

4. Start the HTTPS gateway and rebuild the frontends with the public preview URL:

```sh
docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build
```

5. Open `https://shop.example.com` and `https://admin.example.com`. Both should load with a valid certificate. If certificate setup fails, check DNS and:

```sh
docker compose -f docker-compose.yml -f docker-compose.https.yml logs --tail=100 gateway
```

Changing `.env` alone does not update a running container. Repeat the `up -d --build` command after URL changes; `MINIAPP_PUBLIC_URL` is embedded into the admin frontend at build time.

For local development, an HTTPS tunnel may forward to **miniapp port 3000**. Its public URL must also replace the URL in BotFather and `MINIAPP_PUBLIC_URL`; rebuild the admin frontend afterward. Temporary tunnel URLs must be updated whenever they change. A tunnel is an alternative to this gateway, not a required project dependency.

<a name="step-8"></a>

## 8. ✈️ Connect the miniapp to the bot

1. In BotFather, send `/setmenubutton` and select your bot.
2. Set the URL to your miniapp address, for example `https://shop.example.com`, and choose a button label such as «فروشگاه».
3. You can also configure the bot's **Main Mini App** in BotFather with the same URL to add a launch button to its profile.
4. Open your bot's private chat, send `/start`, and open the store from its menu button.

> [!TIP]
> **Expected result:** the miniapp opens inside Telegram and customer pages can authenticate. Opening its URL in an ordinary browser does not supply Telegram `initData`; that is not a valid authenticated customer test.

`MINIAPP_PUBLIC_URL` configures the admin preview; it does **not** update BotFather automatically. Configure the menu button even if you also configure a Main Mini App, because the bot uses that menu URL for its store buttons. See [Telegram's Mini App setup guide](https://core.telegram.org/bots/webapps#launching-mini-apps-from-the-menu-button).

<a name="step-9"></a>

## 9. ✅ Configure the store and test one complete purchase

In the Persian admin panel:

1. Open **دسته‌بندی‌ها** and create an active category with a title, icon and order.
2. Under **محصولات → فایل**, upload a small file. Create a product, select that category, choose file delivery, and attach the uploaded file. A product image alone does not define its delivery.
3. Open **پرداخت‌ها → تنظیمات پرداخت** to enable the methods you want and choose how prices appear. Set the relevant product prices. Card-to-card also needs destination cards under **پرداخت‌ها → کارت‌به‌کارت**.
4. To exercise purchases without a real payment, open **تنظیمات عمومی → حالت سراسری پرداخت‌ها** and intentionally enable test mode. It applies across product, VIP and wallet purchases. It is an application simulation, not Telegram's separate sandbox; successful simulated purchases still change store orders, delivery, wallet balances and VIP access. Test card transfers still need admin review.
5. Buy the product from Telegram. Check its order/payment in the panel, then check the customer's purchased content and download access. For a card transfer, verify that delivery waits for approval.
6. Switch back to real payment mode before accepting customer payments. Configure wallet packages, VIP plans, coupons, phone requirements, referral rewards and bot messages as needed.

For digital sales inside Telegram, review the [official Stars payment requirements](https://core.telegram.org/bots/payments-stars) before choosing the payment methods you offer.

<details>
<summary><strong>✅ Ready-to-launch checklist</strong></summary>

- [ ] Both public domains load with valid HTTPS.
- [ ] The admin can sign in, and the miniapp opens from the bot's menu.
- [ ] A test purchase creates the expected order and access to its delivery.
- [ ] Card-transfer delivery, if enabled, waits for admin approval.
- [ ] Real payment mode is selected before taking customer payments.
- [ ] Database, object files and private configuration have a backup plan.

</details>

---

<a name="operations"></a>

## 🗃️ Starting, stopping, updating, and keeping data

| Task | Command / action |
|---|---|
| Show service status | `docker compose ps` |
| Watch API/bot logs | `docker compose logs -f --tail=100 api bot` — Ctrl+C stops following logs, not the services. |
| Stop a local stack | `docker compose down` |
| Restart a local stack | `docker compose up -d` |
| Update source | Back up first, run `git pull --ff-only`, then repeat your installation's `up -d --build` command. |

For an HTTPS installation, keep using **both** `-f docker-compose.yml -f docker-compose.https.yml` flags for stack-wide start/stop/update commands so the gateway is included. Frontend build-setting changes require `--build`; `docker compose restart` does not reread `.env`.

Persistent data lives in Docker volumes: `pgdata` contains PostgreSQL; `miniodata` contains uploaded files and images. HTTPS certificates use `caddy_data` and `caddy_config`. Keep a private copy of `.env` with your backup records.

Back up **both PostgreSQL and MinIO** before updates or moving servers. For a simple database dump:

```sh
mkdir -p ../telegram-marketplace-backups
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > ../telegram-marketplace-backups/database.dump
```

This command overwrites that backup filename on repeat. It does not back up object files: arrange a separate MinIO backup/volume snapshot. Stop writes during coordinated snapshots, and verify recovery before relying on a backup. `docker compose down` preserves named volumes; **`docker compose down -v` deletes store data**.

Changing `POSTGRES_PASSWORD` or MinIO credentials in `.env` is not a credential-rotation procedure for an existing installation. In particular, PostgreSQL's initial password applies when its data directory is first created; changing the file alone will not change that database account's password.

Optional database UIs are not part of normal startup:

```sh
docker compose --profile tools up -d pgadmin dbeaver
```

They are available locally on ports 5050 and 8978. Their example credentials are for local tooling; change them before granting anyone access. Normal store management uses the admin panel instead.

<a name="troubleshooting"></a>

## 🛠️ Troubleshooting

| Symptom | Check and next action |
|---|---|
| Cannot connect to the Docker daemon | Start Docker Desktop/the Docker service; make `docker info` succeed first. |
| `port is already allocated` | Change the corresponding host port in `.env` (`API_PORT`, `BOT_PORT`, `MINIAPP_PORT`, `BACKOFFICE_PORT`, `POSTGRES_PORT`, `MINIO_PORT`, `MINIO_CONSOLE_PORT`) and run `up -d --build` again. Update frontend URLs/CORS if their ports changed. Internal Docker ports stay unchanged. |
| Bot reports Telegram `401` | Check `BOT_TOKEN` against BotFather, then recreate the bot container with `docker compose up -d bot`. |
| Bot reports Telegram `409` | Stop the other process using the same bot token. Only one polling consumer should run. |
| Admin/API returns `502 Bad Gateway` | Check `docker compose ps` and API logs; the frontend may be up while the API is still starting or failing to connect to PostgreSQL/MinIO. |
| Admin credentials do not work | Use the credentials from the first initialization, not newly edited seed values. Check that you opened the intended installation. |
| Miniapp API returns `401` / no user appears | Launch it from the correct bot in Telegram. Confirm the bot token and public URL belong to this installation. |
| API requires a phone number | If phone sharing is mandatory, share your own contact through the bot. The requirement is enforced on the backend too. |
| Admin preview is blank or points to localhost | Correct `MINIAPP_PUBLIC_URL` and rebuild the backoffice. Ensure its browser can reach the miniapp URL. |
| HTTPS requests try to call `http://localhost:8080` | Keep frontend API URLs at `/api/v1`, remove absolute overrides, and rebuild. |
| HTTPS certificate cannot be issued | Check both domains' A/AAAA records, inbound 80/443, port conflicts and gateway logs. |
| Image/file requests fail | Check MinIO/API logs and storage credentials; keep `/storage/` URLs rather than exposing an internal `minio:9000` URL to customers. |

<a name="architecture"></a>

## 🏗️ Architecture and technical map

```text
Customer in Telegram → miniapp nginx → /api/ → Go API → PostgreSQL
                               └──→ /storage/ → MinIO (signed assets)
Admin browser         → backoffice nginx → the same API and storage
Telegram updates      → Go bot → payment/phone/referral services
Public HTTPS domains  → Caddy → the two frontend nginx services
```

| Directory / service | Responsibility |
|---|---|
| `miniapp/` | Customer UI: React, TypeScript and Vite. Telegram supplies signed `initData`; the backend validates it. |
| `backoffice/` | Persian admin UI using React/TypeScript. Admin authentication uses JWT sessions. |
| `core/cmd/api`, `core/cmd/bot` | Separate entry points for the HTTP API and Telegram update consumer. |
| `core/internal/core/` | Feature modules for catalog, commerce, membership, support, settings and bot messages. |
| `core/internal/app/` | Configuration, dependency wiring, middleware, routing and database initialization. |
| `core/internal/platform/`, `core/pkg/` | Telegram, storage and other infrastructure adapters/shared code. |
| `deploy/Caddyfile` | Optional public HTTPS routing; no separate public database/storage endpoint. |

A typical backend feature follows **router → handler/DTO → service → repository → PostgreSQL**. Handlers parse requests; services apply purchase/access rules; repositories perform persistence. SQL query files sit alongside their repositories. Database migrations run automatically during startup with a shared lock.

The bot receives Telegram updates through polling by default. Stars confirmation or manual card-transfer approval settles a purchase; fulfillment workers grant the configured content and retry supported provider work. PostgreSQL holds orders, access and balances; MinIO holds files, receipts and images. Private content goes through authenticated access rather than an unrestricted product file link.

### Optional frontend development

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

This uses Vite and mounts the frontend `src/` and `public/` directories for hot reload on the same ports. It does not enable Go hot reload. Use this override for development; use the normal/HTTPS Compose files for deployment.

---

<p align="center"><a href="#guide-top">↑ Back to guide navigation</a> · <a href="../README.md">Project overview</a></p>
