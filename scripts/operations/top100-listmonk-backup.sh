#!/bin/sh
set -eu
umask 077
backup_dir=/var/backups/top100-listmonk
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
tmp=$(mktemp "$backup_dir/.listmonk.XXXXXX")
trap 'rm -f "$tmp"' EXIT HUP INT TERM
docker exec top100-listmonk-pb6bin-db-1 pg_dump -U listmonk -d listmonk -Fc > "$tmp"
docker exec -i top100-listmonk-pb6bin-db-1 pg_restore --list < "$tmp" > /dev/null
mv "$tmp" "$backup_dir/listmonk-$(date -u +%Y%m%dT%H%M%SZ).dump"
