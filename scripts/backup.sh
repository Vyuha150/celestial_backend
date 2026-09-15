#!/usr/bin/env bash
# Nightly MongoDB backup. Add to the VPS crontab, e.g.:
#   0 3 * * * cd /opt/celestial-backend && ./scripts/backup.sh >> /var/log/celestial-backup.log 2>&1
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETAIN_DAYS="${RETAIN_DAYS:-14}"
STAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"

docker compose exec -T mongo mongodump --archive --gzip --db=celestial > "$BACKUP_DIR/celestial-$STAMP.archive.gz"

echo "Backup written to $BACKUP_DIR/celestial-$STAMP.archive.gz"

find "$BACKUP_DIR" -name "celestial-*.archive.gz" -mtime "+$RETAIN_DAYS" -delete

# Recommended: also sync $BACKUP_DIR to off-VPS storage (e.g. Cloudflare R2,
# rclone to any remote) so a disk failure doesn't take the backups with it.
