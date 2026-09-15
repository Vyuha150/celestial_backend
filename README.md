# Celestial Backend

Node.js/TypeScript + Express + MongoDB API for the Celestial storefront and
admin panel — products, categories, cart, checkout (Razorpay), orders,
customers, CMS pages/sections, settings, and analytics computed from real
data.

## Local development

```bash
cp .env.example .env   # fill in real values
npm install
npm run seed            # loads the Celestial catalog content + CMS pages
npm run dev              # tsx watch, http://localhost:4000
```

Create the first admin account once the server is running:

```bash
curl -X POST http://localhost:4000/auth/bootstrap-admin \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"'"$ADMIN_BOOTSTRAP_EMAIL"'","password":"'"$ADMIN_BOOTSTRAP_PASSWORD"'"}'
```

(uses the `ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_PASSWORD` from `.env` —
refuses once any admin already exists.)

## Tests

```bash
npm test
```

Spins up an in-memory single-node MongoDB replica set (transactions need a
replica set even locally) and covers the two financially-critical paths:
Razorpay signature verification and the atomic stock-reservation flow in
checkout (including the "cart qty exceeds available stock" rollback case).

## Architecture notes

- **Auth**: JWT access (15 min) + refresh (30 days) token rotation.
  Refresh tokens are stored hashed; reusing a revoked one fails closed.
- **Checkout**: creates a `pending` Order and atomically decrements stock
  for every line item inside one MongoDB transaction — a stock race on any
  item rolls the whole order back, never leaving partial state.
- **Payment reconciliation has two paths**: the client-driven
  `/checkout/verify` (fast path) and the Razorpay **webhook**
  (`/webhooks/razorpay`) as the authoritative backstop — an order can never
  get permanently stuck in "pending" just because a browser tab closed
  before the client-side verify call landed.
- **Analytics are computed from real data**, not hardcoded — revenue,
  orders, category mix, top products, and even the purchase funnel and
  traffic-source breakdown (via a minimal first-party `PageView` log) are
  live MongoDB aggregations.

## Deploying to a Hostinger VPS

### One-time server setup

```bash
ssh root@your-vps-ip
apt update && apt install -y docker.io docker-compose-plugin git
git clone <this-repo-url> /opt/celestial-backend
cd /opt/celestial-backend
cp .env.example .env   # fill in real production values
```

Point your Hostinger domain's DNS A record (e.g. `api.yourdomain.com`) at
the VPS's IP before continuing.

### First-time TLS setup

nginx's real config requires a certificate to already exist before it can
even start — so the very first run needs a bootstrap step:

```bash
DOMAIN=api.yourdomain.com EMAIL=you@yourdomain.com ./scripts/init-tls.sh
```

This brings nginx up with an HTTP-only config, requests the Let's Encrypt
certificate via the `certbot` service, then restores the real TLS config
and starts the full stack (`api`, `mongo`, `nginx`, `certbot`). The
`certbot` service keeps renewing the cert automatically after that.

### Subsequent deploys

Handled automatically by `.github/workflows/deploy.yml` on every push to
`main` (after tests pass). It SSHes in and runs `git pull` +
`docker compose up -d --build`. Configure these repo secrets:

| Secret | Value |
|---|---|
| `VPS_HOST` | VPS IP or hostname |
| `VPS_USER` | SSH user (e.g. `root` or a deploy user) |
| `VPS_SSH_KEY` | Private key with access to the VPS |
| `VPS_PORT` | SSH port (optional, defaults to 22) |
| `VPS_DEPLOY_PATH` | e.g. `/opt/celestial-backend` |

To deploy manually instead: SSH in, `cd /opt/celestial-backend`,
`git pull`, `docker compose up -d --build`.

### Backups

```bash
crontab -e
# 0 3 * * * cd /var/www/celestial-backend && ./scripts/backup.sh >> /var/log/celestial-backup.log 2>&1
```

Writes gzipped `mongodump` archives to `./backups`, pruned after 14 days.
Strongly recommend also syncing `./backups` off-VPS (rclone to Cloudflare
R2, or any remote) — a local-only backup doesn't survive a disk failure.

## Environment variables

See `.env.example`. In production, `MONGO_URI` is set by docker-compose to
point at the `mongo` service with the replica set already configured — you
only need to fill in the secrets (JWT, Razorpay, admin bootstrap, CORS
origin) in `.env`.

## API surface

Public: `/health`, `/auth/*`, `/categories`, `/categories/:slug`,
`/products?category=`, `/cart/*`, `/checkout/session`, `/checkout/verify`,
`/webhooks/razorpay`, `/content/pages`, `/content/sections`,
`/track/pageview`.

Admin (`Authorization: Bearer <accessToken>`, admin role required), all
under `/admin`: `/products`, `/categories`, `/orders`, `/customers`,
`/content/pages`, `/content/sections`, `/settings`, `/analytics/*`.
