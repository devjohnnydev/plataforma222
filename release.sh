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

echo "==> Criando/atualizando conta do professor Johnny (se não existir)..."
python manage.py shell -c "
from accounts.models import User
u, created = User.objects.get_or_create(
    email='johnny.braga@docente.senai.br',
    defaults={
        'username': 'johnny.braga',
        'role': 'TEACHER',
        'approved_by_admin': True
    }
)
u.role = 'TEACHER'
u.approved_by_admin = True
u.set_password('Jb@46431194')
u.save()
print('Conta do professor configurada com sucesso!')
"

echo "==> Release concluído com sucesso!"
