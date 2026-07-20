#!/usr/bin/env bash
set -e

echo "==> PORT: ${PORT:-8080}"
echo "==> Running release script..."
bash release.sh

echo "==> Starting gunicorn on port ${PORT:-8080}..."
exec gunicorn johnny_lms.wsgi --bind "0.0.0.0:${PORT:-8080}" --workers 2 --timeout 120 --log-file - --access-logfile -
