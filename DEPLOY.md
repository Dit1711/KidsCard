# Private deployment (VPS + Cloudflare Tunnel + Access)

The whole stack runs in Docker on a single VPS. Nothing is exposed to the public
internet: the **only** ingress is a Cloudflare Tunnel (outbound connection, no
open ports), and **Cloudflare Access** gates it to an email allow-list — so only
you and your wife can reach it.

```
  wife's phone ──https──► Cloudflare ──(Access login wall)──► Tunnel ──► web:3000 ──► backends
```

---

## 1. Provision a VPS

Any provider works; the stack needs ~**4 GB RAM minimum, 8 GB comfortable**
(8 JVM services + Kafka). Good picks:

- **Hetzner Cloud** CPX21 (3 vCPU / 4 GB, ~€8/mo) or CPX31 (8 GB) — best value.
- **DigitalOcean** Droplet 4–8 GB.

On the server (Ubuntu 22.04+):

```bash
# install Docker + compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # re-login after this
```

Copy the repo to the server (git clone, or `scp` / `rsync` your local checkout).

## 2. Cloudflare: a private tunnel + Access

You need a domain on Cloudflare (free plan is fine; a cheap domain ~$10/yr).

1. **Zero Trust dashboard** → **Networks → Tunnels → Create a tunnel** (type
   *Cloudflared*). Name it e.g. `kidscard`.
2. Copy the **tunnel token** (the long string in the `cloudflared ... run <TOKEN>`
   command). You'll put it in `.env.prod`.
3. In the tunnel's **Public Hostname** tab, add:
   - Subdomain/domain: e.g. `kidscard.yourdomain.com`
   - Service: **HTTP** → `web:3000`
4. **Access → Applications → Add an application → Self-hosted**:
   - Application domain: `kidscard.yourdomain.com`
   - Policy: **Allow**, include **Emails** → add your email and your wife's.
   - (Optional) session duration, one-time-PIN or Google login.

Now anyone hitting the URL must pass the Access login first; everyone else is
blocked. No app code is exposed publicly.

## 3. Configure secrets

```bash
cp .env.prod.example .env.prod
# edit .env.prod — set DB_PASSWORD, REDIS_PASSWORD, JWT_SECRET (openssl rand -base64 48),
# and CLOUDFLARE_TUNNEL_TOKEN from step 2.
```

## 4. Build & run

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

First build takes a while (Gradle builds 7 services, Next builds the web). Watch
it come up:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f cloudflared web
```

When healthy, open `https://kidscard.yourdomain.com` — you'll hit the Access
login, then the app.

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

- This is still **dev-grade auth** (simulated OTP). Access is the security
  boundary — keep the allow-list tight.
- Single Postgres with per-service **schemas** (not separate DBs) — fine for
  testing; the ТЗ calls for separate instances in real production.
- Back up the `postgres_data` volume if the test data matters.
- `infrastructure/postgres/init` seeds the per-service schemas on first boot.
