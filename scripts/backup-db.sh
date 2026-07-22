#!/usr/bin/env bash
#
# Backup do banco (MySQL) — mysqldump + gzip + rotação, com upload off-site
# opcional. Simples de propósito: para o estágio de teste, um cron diário disparando
# este script para um storage barato já cobre o pior caso (perder o banco).
#
# Uso:
#   ./scripts/backup-db.sh
#
# Configuração por variável de ambiente (todas opcionais, com defaults):
#   DATABASE_URL           mysql://user:pass@host:port/db   (mesmo do app; parseado)
#   BACKUP_DIR             destino dos dumps        (default: ./backups)
#   BACKUP_RETENTION_DAYS  dias a manter            (default: 14)
#   MYSQL_CONTAINER        se setado, roda o mysqldump via `docker exec` nesse
#                          container (útil no dev: agender-mysql-1)
#   BACKUP_UPLOAD_CMD      comando de upload off-site; `{}` vira o caminho do dump.
#                          Ex.: 'rclone copy {} remote:agenda-backups'
#                               'aws s3 cp {} s3://meu-bucket/agenda/'
#
# Sai com código != 0 se o dump falhar (o cron consegue detectar e alertar).
# Rotação só roda DEPOIS de um dump válido — um dump que falha nunca apaga
# backups bons.

set -euo pipefail

# --- Carrega .env da raiz do repo se existir (para achar DATABASE_URL) ----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
if [ -z "${DATABASE_URL:-}" ] && [ -f "$REPO_ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$REPO_ROOT/.env"
  set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERRO: DATABASE_URL não definido (nem no ambiente nem no .env da raiz)." >&2
  exit 1
fi

# --- Parse do mysql://user:pass@host:port/db?params -----------------------------
# Observação: assume credenciais sem caracteres percent-encoded (o caso de dev).
# Se a senha tiver caracteres especiais, prefira setar as vars discretas do MySQL.
rest="${DATABASE_URL#*://}"
creds="${rest%%@*}"
hostportdb="${rest#*@}"
DB_USER="${creds%%:*}"
DB_PASS="${creds#*:}"
hostport="${hostportdb%%/*}"
dbpart="${hostportdb#*/}"
DB_NAME="${dbpart%%\?*}"
DB_HOST="${hostport%%:*}"
DB_PORT="${hostport#*:}"
[ "$DB_PORT" = "$DB_HOST" ] && DB_PORT=3306

BACKUP_DIR="${BACKUP_DIR:-$REPO_ROOT/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUTFILE="$BACKUP_DIR/${DB_NAME}-${STAMP}.sql.gz"

DUMP_FLAGS=(
  --single-transaction  # snapshot consistente sem travar tabelas InnoDB
  --quick
  --routines
  --triggers
  --events
  --no-tablespaces      # evita exigir a privilege PROCESS
  --default-character-set=utf8mb4
)

echo "[backup] $DB_NAME @ $DB_HOST:$DB_PORT -> $OUTFILE"

# MYSQL_PWD evita a senha no argv (não vaza no `ps`) e o warning do mysqldump.
if [ -n "${MYSQL_CONTAINER:-}" ]; then
  docker exec -e MYSQL_PWD="$DB_PASS" "$MYSQL_CONTAINER" \
    mysqldump -u"$DB_USER" -h 127.0.0.1 -P 3306 "${DUMP_FLAGS[@]}" "$DB_NAME" \
    | gzip > "$OUTFILE"
else
  MYSQL_PWD="$DB_PASS" mysqldump \
    -u"$DB_USER" -h "$DB_HOST" -P "$DB_PORT" "${DUMP_FLAGS[@]}" "$DB_NAME" \
    | gzip > "$OUTFILE"
fi

# --- Valida: dump não pode estar vazio ------------------------------------------
if [ ! -s "$OUTFILE" ]; then
  echo "ERRO: dump vazio — algo falhou. Removendo arquivo e mantendo backups antigos." >&2
  rm -f "$OUTFILE"
  exit 1
fi
SIZE="$(du -h "$OUTFILE" | cut -f1)"
echo "[backup] ok ($SIZE)"

# --- Upload off-site opcional ---------------------------------------------------
if [ -n "${BACKUP_UPLOAD_CMD:-}" ]; then
  CMD="${BACKUP_UPLOAD_CMD//\{\}/$OUTFILE}"
  echo "[backup] upload: $CMD"
  eval "$CMD"
  echo "[backup] upload ok"
fi

# --- Rotação (só depois de um dump válido) --------------------------------------
find "$BACKUP_DIR" -name "${DB_NAME}-*.sql.gz" -type f -mtime "+$BACKUP_RETENTION_DAYS" -print -delete \
  | sed 's/^/[backup] rotacionado (removido): /' || true

echo "[backup] concluído."
