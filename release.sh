#!/usr/bin/env bash
set -e

echo "==> Aplicando migrações do banco de dados..."
python manage.py migrate --noinput

echo "==> Coletando arquivos estáticos..."
python manage.py collectstatic --noinput

echo "==> Criando superusuário padrão (se não existir)..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(email='johnnybraga2@gmail.com').exists():
    User.objects.create_superuser(
        username='johnnyadmin',
        email='johnnybraga2@gmail.com',
        password='Jb@46431194',
        role='ADMIN'
    )
    print('Superusuário criado com sucesso.')
else:
    print('Superusuário já existe.')
"

echo "==> Release concluído com sucesso!"
