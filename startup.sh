#!/usr/bin/env bash
set -e

echo "==> PORT: ${PORT:-8080}"
echo "==> Applying database migrations..."
python manage.py migrate --noinput

echo "==> Collecting static files..."
python manage.py collectstatic --noinput

echo "==> Creating superuser if not exists..."
python manage.py shell << 'PYEOF'
import os
from django.contrib.auth import get_user_model
User = get_user_model()
email = os.environ.get("ADMIN_EMAIL", "johnnybraga2@gmail.com")
pwd = os.environ.get("ADMIN_PASSWORD", "Jb@46431194")
if not User.objects.filter(email=email).exists() and not User.objects.filter(username="johnnyadmin").exists():
    User.objects.create_superuser(username="johnnyadmin", email=email, password=pwd, role="ADMIN")
    print("Superuser created.")
else:
    print("Superuser already exists.")
PYEOF

echo "==> Starting gunicorn on port ${PORT:-8080}..."
exec gunicorn johnny_lms.wsgi --bind "0.0.0.0:${PORT:-8080}" --workers 2 --timeout 120 --log-file - --access-logfile -
