<div dir="rtl">

# نصب و معماری

[English](INSTALLATION.en.md) · [معرفی پروژه](../README.md)

## نصب

پیش‌نیاز: Git، موتور Docker یا Docker Desktop با Compose v2 و توکن ربات از [BotFather](https://t.me/BotFather). برای ساخت روی سرور، حداقل ۲ هسته و ۴ گیگابایت RAM پیشنهاد می‌شود.

```sh
git clone --branch main https://github.com/amirmalek0/telegram-marketplace.git
cd telegram-marketplace
cp .env.example .env
```

در `.env` مقادیر `BOT_TOKEN`، `JWT_SECRET`، `ADMIN_SEED_PASSWORD`، `POSTGRES_PASSWORD` و `MINIO_SECRET_KEY` را تنظیم کنید. برای ساخت رمز از `openssl rand -hex 32` استفاده کنید؛ رمز پایگاه داده باید مناسب URL باشد. برای پایگاه داده همراه پروژه، `DOCKER_DATABASE_URL` خالی بماند. برای polling، متغیر `WEBHOOK_URL` را تنظیم نکنید؛ یک توکن را هم‌زمان در دو نصب اجرا نکنید.

```sh
docker compose up -d --build
docker compose ps
curl --fail http://localhost:8080/health
```

| بخش | نشانی پیش‌فرض |
|---|---|
| مینی‌اپ | http://localhost:3000 |
| پنل مدیریت | http://localhost:3001 |
| سلامت API | http://localhost:8080/health |
| کنسول MinIO | http://localhost:9001 |

با `ADMIN_SEED_USERNAME` و `ADMIN_SEED_PASSWORD` وارد شوید. جدول‌ها، باکت‌ها و مدیر اولیه خودکار ساخته می‌شوند؛ دسته‌ها، منابع تحویل و محصولات را از پنل بسازید. اطلاعات مدیر اولیه فقط در نصب اول اعمال می‌شود؛ تغییر رمز بعدی از پنل انجام می‌شود.

## اتصال تلگرام و HTTPS

۱. دو دامنه را به IP سرور متصل و پورت‌های TCP شماره ۸۰ و ۴۴۳ را باز کنید.

۲. این مقادیر را با دامنه‌های خودتان در `.env` تنظیم کنید:

```dotenv
MINIAPP_DOMAIN=shop.example.com
BACKOFFICE_DOMAIN=admin.example.com
MINIAPP_PUBLIC_URL=https://shop.example.com
CORS_ALLOWED_ORIGINS=https://shop.example.com,https://admin.example.com
```

۳. درگاه اختیاری را اجرا کنید؛ Caddy گواهی HTTPS را خودکار دریافت و تمدید می‌کند:

```sh
docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build
```

۴. در BotFather نشانی Menu Button یا Main Mini App را روی `https://shop.example.com` بگذارید. مینی‌اپ را از تلگرام باز کنید؛ مرورگر معمولی اطلاعات ورود تلگرام ندارد. پیش از فروش، روش‌های پرداخت، کارت‌های مقصد و قیمت محصولات را در پنل تنظیم کنید.

پورت‌های برنامه و ذخیره‌ساز به‌صورت پیش‌فرض فقط روی localhost هستند (`HOST_BIND=127.0.0.1`)؛ درگاه اختیاری فقط ۸۰ و ۴۴۳ را عمومی می‌کند. هنگام انتقال یک ربات موجود، پردازش قبلی همان توکن را متوقف کنید.

## نگهداری

- گزارش خطا: `docker compose logs --tail=100 api bot`. خطای تلگرام `401` یعنی توکن نامعتبر؛ `409` معمولاً یعنی polling هم‌زمان. پس از اصلاح `.env`، دستور `docker compose up -d` را اجرا کنید.
- تداخل پورت: متغیرهای `API_PORT`، `BOT_PORT`، `MINIAPP_PORT`، `BACKOFFICE_PORT`، `POSTGRES_PORT`، `MINIO_PORT` یا `MINIO_CONSOLE_PORT` را تغییر دهید. با تغییر نشانی فرانت‌اند، نشانی مینی‌اپ و CORS را هم اصلاح کنید.
- به‌روزرسانی: `git pull --ff-only` و اجرای دوباره دستور Compose با `--build`. ابتدا از volumeهای PostgreSQL و MinIO پشتیبان بگیرید. `docker compose down` داده را نگه می‌دارد؛ **`down -v` داده را حذف می‌کند**.
- ابزارهای اختیاری پایگاه داده: `docker compose --profile tools up -d`. اطلاعات ورود پیش‌فرض آن‌ها برای استفاده محلی است؛ عمومی نشوند.
- حالت آزمایشی Stars تحویل، کیف پول و VIP واقعی فروشگاه را تغییر می‌دهد؛ فقط برای آزمایش آگاهانه فعال شود.

## معماری

- `miniapp/`: رابط مشتری با React، TypeScript و Vite؛ `backoffice/`: پنل مدیریت. nginx هر دو، مسیرهای `/api/` و `/storage/` را به سرویس‌های Docker هدایت می‌کند.
- `core/`: API و ربات با Go. ساختار ماژول‌ها <span dir="ltr">**router → handler/DTO → service → repository → PostgreSQL**</span> است؛ SQL در فایل‌های query کنار repository قرار دارد. مهاجرت‌ها با قفل مشترک پایگاه داده خودکار اجرا می‌شوند.
- PostgreSQL داده‌های کسب‌وکار و MinIO تصاویر، رسیدها و فایل‌ها را نگه می‌دارد. محتوای خصوصی کنترل دسترسی دارد. کاربران با `initData` معتبر تلگرام و مدیران با نشست JWT احراز هویت می‌شوند.
- ربات با polling رویدادها را دریافت می‌کند. تأیید Stars یا تأیید دستی کارت‌به‌کارت، خرید را تسویه می‌کند؛ پردازشگر تحویل دسترسی را ایجاد و فراخوانی سرویس را با کلید idempotency بازآزمایی می‌کند. هر نصب برای یک فروشگاه است.

توسعه با بارگذاری زنده فرانت‌اند: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build`؛ نشانی‌ها همان نشانی‌های بالا هستند.

</div>
