#!/usr/bin/env bash
set -e

echo "==> PORT: ${PORT:-8080}"
echo "==> Running release script..."
bash release.sh

echo "==> Starting daphne on port ${PORT:-8080}..."
exec daphne -b 0.0.0.0 -p "${PORT:-8080}" johnny_lms.asgi:application
