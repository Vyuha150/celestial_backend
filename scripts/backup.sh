#!/usr/bin/env bash
# Nightly MongoDB Atlas backup. Reads MONGO_URI from .env (same connection
# string the app itself uses) and dumps it locally via mongodump — a
# free-tier Atlas cluster (M0/M2/M5) does not include automated continuous
# backups the way dedicated (M10+) clusters do, so this fills that gap.
#
# Add to the VPS crontab:
#   0 3 * * * cd /var/www/celestial-backend && ./scripts/backup.sh >> /var/log/celestial-backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "No .env file found — cannot read MONGO_URI." >&2
  exit 1
fi

MONGO_URI=$(grep -E '^MONGO_URI=' .env | head -1 | cut -d= -f2-)
if [ -z "$MONGO_URI" ]; then
  echo "MONGO_URI not set in .env" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETAIN_DAYS="${RETAIN_DAYS:-14}"
STAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"

mongodump --uri="$MONGO_URI" --archive="$BACKUP_DIR/celestial-$STAMP.archive.gz" --gzip

echo "Backup written to $BACKUP_DIR/celestial-$STAMP.archive.gz ($(du -h "$BACKUP_DIR/celestial-$STAMP.archive.gz" | cut -f1))"

find "$BACKUP_DIR" -name "celestial-*.archive.gz" -mtime "+$RETAIN_DAYS" -delete

# Recommended: also sync $BACKUP_DIR to off-VPS storage (e.g. Cloudflare R2,
# rclone to any remote) so a disk failure doesn't take the backups with it.
