#!/usr/bin/env bash
# One-time TLS bootstrap: run this once on a fresh VPS before the first
# real `docker compose up`. It gets a Let's Encrypt cert issued so
# nginx/celestial.conf (which requires an existing cert to even start) has
# something to serve on :443.
#
# Usage: DOMAIN=api.yourdomain.com EMAIL=you@yourdomain.com ./scripts/init-tls.sh
set -euo pipefail

DOMAIN="${DOMAIN:?Set DOMAIN=api.yourdomain.com}"
EMAIL="${EMAIL:?Set EMAIL=you@yourdomain.com}"

cp nginx/celestial.conf nginx/celestial.conf.bak

echo "==> Step 1/4: starting nginx with the HTTP-only bootstrap config"
sed "s/api.yourdomain.com/$DOMAIN/g" nginx/celestial.bootstrap.conf > nginx/celestial.conf
docker compose up -d nginx

echo "==> Step 2/4: requesting the certificate from Let's Encrypt"
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d "$DOMAIN" --email "$EMAIL" --agree-tos --no-eff-email

echo "==> Step 3/4: restoring the real TLS config with your domain substituted"
sed "s/api.yourdomain.com/$DOMAIN/g" nginx/celestial.conf.bak > nginx/celestial.conf
rm nginx/celestial.conf.bak

echo "==> Step 4/4: bringing up the full stack"
docker compose up -d --build

echo "==> Done. https://$DOMAIN is now live."
echo "    The 'certbot' service renews the cert automatically every 12h check."
