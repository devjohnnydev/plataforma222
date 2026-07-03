"""
Script para criar as turmas de Excel e Power BI para o professor johnny
conforme cronograma da imagem.

Execute com:
  python manage.py shell < seed_turmas.py
ou:
  python seed_turmas.py  (com DJANGO_SETTINGS_MODULE configurado)
"""

import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'johnny_lms.settings')
django.setup()

from django.contrib.auth import get_user_model
from classes.models import Class
from courses.models import Lesson
from datetime import date

User = get_user_model()

# ─── Encontrar o professor johnny ─────────────────────────────────────────────
try:
    teacher = User.objects.get(username='johnny.oliveira')
except User.DoesNotExist:
    # Tenta por username parcial ou email
    teacher = User.objects.filter(
        username__icontains='johnny'
    ).first() or User.objects.filter(
        email__icontains='johnny'
    ).first()

if not teacher:
    print("❌ Usuário 'johnny' não encontrado. Listando usuários disponíveis:")
    for u in User.objects.all():
        print(f"   - {u.username} ({u.email})")
    exit(1)

print(f"✅ Professor encontrado: {teacher.username} ({teacher.email})")


# ─── TURMA 1: Curso de Excel – Presencial ─────────────────────────────────────

# Remover turma existente com mesmo nome (opcional - evita duplicatas)
Class.objects.filter(name='Curso de Excel – Presencial', teacher=teacher).delete()

excel_class = Class.objects.create(
    name='Curso de Excel – Presencial',
    description='Cronograma presencial do Curso de Excel. CH Total: 40h. Horário: 09h30 às 12h30.',
    teacher=teacher,
    color='#1D6F42',  # Verde Excel
)
print(f"✅ Turma criada: {excel_class.name} (Código: {excel_class.join_code})")

# Aulas do Excel conforme cronograma
excel_aulas = [
    # (data, ch_minutos, titulo, publicada)
    (date(2026, 5, 21),  180, 'Aula 1 – 21/mai | 09h30 às 12h30 | Realizado',   True),
    (date(2026, 5, 26),  180, 'Aula 2 – 26/mai | 09h30 às 12h30 | Realizado',   True),
    (date(2026, 5, 27),  180, 'Aula 3 – 27/mai | 09h30 às 12h30 | Realizado',   True),
    (date(2026, 6,  2),  180, 'Aula 4 – 02/jun | 09h30 às 12h30 | Realizado',   True),
    (date(2026, 7, 13),  180, 'Aula 5 – 13/jul | 09h30 às 12h30 | A iniciar',  False),
    (date(2026, 7, 14),  180, 'Aula 6 – 14/jul | 09h30 às 12h30 | A iniciar',  False),
    (date(2026, 7, 15),  180, 'Aula 7 – 15/jul | 09h30 às 12h30 | A iniciar',  False),
    (date(2026, 7, 17),  180, 'Aula 8 – 17/jul | 09h30 às 12h30 | A iniciar',  False),
    (date(2026, 7, 27),  180, 'Aula 9 – 27/jul | 09h30 às 12h30 | A iniciar',  False),
    (date(2026, 7, 29),  180, 'Aula 10 – 29/jul | 09h30 às 12h30 | A iniciar', False),
    (date(2026, 8,  4),  180, 'Aula 11 – 04/ago | 09h30 às 12h30 | A iniciar', False),
    (date(2026, 8,  5),  210, 'Aula 12 – 05/ago | 09h30 às 12h30 | A iniciar', False),  # 03:30
    (date(2026, 8,  6),  210, 'Aula 13 – 06/ago | 09h30 às 12h30 | A iniciar', False),  # 03:30
]

for i, (dt, duracao, titulo, publicada) in enumerate(excel_aulas, start=1):
    lesson = Lesson.objects.create(
        target_class=excel_class,
        title=titulo,
        content=f'Data: {dt.strftime("%d/%m/%Y")} | Horário: 09h30 às 12h30 | Modalidade: Presencial',
        order=i,
        duration_minutes=duracao,
        is_published=publicada,
        publish_date=dt if publicada else None,
    )
    status = "✔ Realizado" if publicada else "○ A iniciar"
    print(f"   {status} → {lesson.title}")

print(f"\n✅ {len(excel_aulas)} aulas criadas para '{excel_class.name}'\n")


# ─── TURMA 2: Curso de Power BI – Presencial ──────────────────────────────────

Class.objects.filter(name='Curso de Power BI – Presencial', teacher=teacher).delete()

powerbi_class = Class.objects.create(
    name='Curso de Power BI – Presencial',
    description='Cronograma presencial do Curso de Power BI. CH Total: 32h. Horário: 14h às 17h.',
    teacher=teacher,
    color='#F2C811',  # Amarelo Power BI
)
print(f"✅ Turma criada: {powerbi_class.name} (Código: {powerbi_class.join_code})")

# Aulas do Power BI conforme cronograma
powerbi_aulas = [
    # (data, ch_minutos, titulo, publicada)
    (date(2026, 5, 18),  180, 'Aula 1 – 18/mai | 14h às 17h | Realizado',   True),
    (date(2026, 5, 22),  180, 'Aula 2 – 22/mai | 14h às 17h | Realizado',   True),
    (date(2026, 6,  3),  180, 'Aula 3 – 03/jun | 14h às 17h | Realizado',   True),
    (date(2026, 7, 13),  180, 'Aula 4 – 13/jul | 14h às 17h | A iniciar',  False),
    (date(2026, 7, 14),  180, 'Aula 5 – 14/jul | 14h às 17h | A iniciar',  False),
    (date(2026, 7, 15),  180, 'Aula 6 – 15/jul | 14h às 17h | A iniciar',  False),
    (date(2026, 7, 16),  180, 'Aula 7 – 16/jul | 14h às 17h | A iniciar',  False),
    (date(2026, 7, 17),  180, 'Aula 8 – 17/jul | 14h às 17h | A iniciar',  False),
    (date(2026, 7, 27),  180, 'Aula 9 – 27/jul | 14h às 17h | A iniciar',  False),
    (date(2026, 8,  4),  180, 'Aula 10 – 04/ago | 14h às 17h | A iniciar', False),
    (date(2026, 8,  5),  120, 'Aula 11 – 05/ago | 14h às 17h | A iniciar', False),  # 02:00
]

for i, (dt, duracao, titulo, publicada) in enumerate(powerbi_aulas, start=1):
    lesson = Lesson.objects.create(
        target_class=powerbi_class,
        title=titulo,
        content=f'Data: {dt.strftime("%d/%m/%Y")} | Horário: 14h às 17h | Modalidade: Presencial',
        order=i,
        duration_minutes=duracao,
        is_published=publicada,
        publish_date=dt if publicada else None,
    )
    status = "✔ Realizado" if publicada else "○ A iniciar"
    print(f"   {status} → {lesson.title}")

print(f"\n✅ {len(powerbi_aulas)} aulas criadas para '{powerbi_class.name}'\n")

print("=" * 60)
print("🎉 Seed concluído com sucesso!")
print(f"   Turma Excel:    ID={excel_class.pk}    | Código: {excel_class.join_code}")
print(f"   Turma Power BI: ID={powerbi_class.pk} | Código: {powerbi_class.join_code}")
print("=" * 60)
