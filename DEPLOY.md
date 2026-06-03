# Private deployment (VPS in Uzbekistan, served directly with Caddy)

The whole stack runs in Docker on a single VPS in Uzbekistan. The site is served
on your own domain over HTTPS (Caddy auto-issues a Let's Encrypt cert) and gated
behind a password (HTTP basic auth) so only people you give the password to can
use it.

```
  wife's phone ──https──► your-domain ──(password)──► Caddy ──► web:3000 ──► backends
```

---

## 1. Provision a VPS (in Uzbekistan — data localization, ЗРУ-547)

Host inside Uzbekistan so personal data stays in-country (TZ compliance). The
stack needs ~**4 GB RAM minimum, 8 GB comfortable**, 2–4 vCPU, ~40 GB disk
(8 JVM services + Kafka).

- **Uztelecom Cloud** — cloud.uztelecom.uz / uztelecom.uz → Бизнесу → Облачные
  сервисы → Virtual Dedicated Server. TIER 3 DC in UZ. Order a VM with
  **Ubuntu 22.04+**. (Uztelecom B2B cloud usually needs a legal-entity contract.)
- Faster self-service UZ alternatives (also in-country, same compliance):
  **Serverspace.uz**, **SmartCloud.uz**, **PS Cloud (pscloud.uz)**, **UzCloud.uz**.

Pick Ubuntu 22.04/24.04, give it a public IP (only outbound is actually needed —
see the tunnel below). On the server:

```bash
# install Docker + compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # re-login after this
```

Copy the repo to the server (git clone, or `scp` / `rsync` your local checkout).

## 2. Point your domain at the server + open 80/443

1. At your domain registrar, set an **A record**: `yourdomain` → the server's
   public IP. (Caddy needs ports 80/443 reachable to get the TLS cert.)
2. Make sure the server firewall allows inbound **80** and **443** (and 22 for
   SSH). On a plain Ubuntu VM with no ufw rules this is already open.

## 3. Configure secrets

```bash
cp .env.prod.example .env.prod
# edit .env.prod:
#   DB_PASSWORD, REDIS_PASSWORD  — strong passwords
#   JWT_SECRET                   — openssl rand -base64 48
#   DOMAIN                       — your domain (e.g. kidscard.uz)
#   BASIC_AUTH_USER              — e.g. admin
#   BASIC_AUTH_HASH              — bcrypt hash of your password:
#       docker run --rm caddy:2 caddy hash-password --plaintext 'YourPassword'
```

## 4. Build & run

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

First build takes a while (Gradle builds 7 services, Next builds the web). Watch
it come up:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f caddy web
```

When healthy, open `https://yourdomain` — the browser asks for the basic-auth
username/password, then loads the app. (First load may take a few seconds while
Caddy obtains the TLS certificate.)

## 5. Test logins (dev mode)

OTP/SMS is simulated (no real SMS):

- **Parent** — register a new number, then check the OTP in the auth logs:
  `docker compose -f docker-compose.prod.yml logs auth-service | grep -i otp`
  (the dev seed parent `+998909914927` / OTP `123456` exists only if the DB was
  seeded; on a fresh DB, register fresh.)
- **Child cabinet** — a parent issues the child's login code + PIN in the app
  ("Семья" → child → доступ), then the child logs in via "Вход для детей".

## Operations

```bash
# update after a git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# logs / restart one service
docker compose -f docker-compose.prod.yml logs -f payment-service
docker compose -f docker-compose.prod.yml restart payment-service

# stop everything (data persists in named volumes)
docker compose -f docker-compose.prod.yml down
```

## Notes & hardening (later)

- This is still **dev-grade auth** (simulated OTP). The basic-auth password is the security
  boundary — keep the allow-list tight.
- Single Postgres with per-service **schemas** (not separate DBs) — fine for
  testing; the ТЗ calls for separate instances in real production.
- Back up the `postgres_data` volume if the test data matters.
- `infrastructure/postgres/init` seeds the per-service schemas on first boot.
