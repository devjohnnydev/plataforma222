#!/usr/bin/env bash
set -e

echo "==> Aplicando migrações do banco de dados..."
python manage.py migrate --noinput

echo "==> Coletando arquivos estáticos..."
python manage.py collectstatic --noinput

echo "==> Criando superusuário padrão (se não existir)..."
python manage.py shell -c "
import os
from django.contrib.auth import get_user_model
User = get_user_model()
admin_email = os.environ.get('ADMIN_EMAIL', 'johnnybraga2@gmail.com')
admin_password = os.environ.get('ADMIN_PASSWORD', 'Jb@46431194')
if not User.objects.filter(email=admin_email).exists() and not User.objects.filter(username='johnnyadmin').exists():
    User.objects.create_superuser(
        username='johnnyadmin',
        email=admin_email,
        password=admin_password,
        role='ADMIN'
    )
    print('Superusuário criado com sucesso.')
else:
    print('Superusuário já existe.')
"

echo "==> Criando/atualizando conta do professor Johnny (se não existir)..."
python manage.py shell -c "
import os
from accounts.models import User
teacher_email = os.environ.get('TEACHER_EMAIL', 'johnny.braga@docente.senai.br')
teacher_password = os.environ.get('TEACHER_PASSWORD', 'Jb@46431194')
u, created = User.objects.get_or_create(
    email=teacher_email,
    defaults={
        'username': teacher_email.split('@')[0],
        'role': 'TEACHER',
        'approved_by_admin': True
    }
)
u.role = 'TEACHER'
u.approved_by_admin = True
u.set_password(teacher_password)
u.save()
print('Conta do professor configurada com sucesso!')
"

echo "==> Release concluído com sucesso!"
