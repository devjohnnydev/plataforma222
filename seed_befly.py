"""
Adiciona as aulas do cronograma de Excel Presencial
na turma 'Befly' (codigo P0BYFAGI) do professor Johnny.

Para rodar no Railway:
  python seed_befly.py
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'johnny_lms.settings')
django.setup()

from classes.models import Class
from courses.models import Lesson
from datetime import date

# Busca pelo codigo visto na tela
TARGET_CODE = 'P0BYFAGI'
cls = Class.objects.filter(join_code=TARGET_CODE).first()

# Se nao achar pelo codigo, tenta pelo nome
if not cls:
    cls = Class.objects.filter(name__icontains='Befly').first()

# Se ainda nao achar, lista todas para o usuario escolher
if not cls:
    print("Turma nao encontrada. Turmas existentes:")
    for c in Class.objects.all().order_by('-created_at'):
        print(f"  ID={c.pk} | [{c.join_code}] {c.name} | prof: {c.teacher.username}")
    exit(1)

print(f"Turma encontrada: '{cls.name}' (ID={cls.pk}, codigo={cls.join_code})")
print(f"Professor: {cls.teacher.get_full_name() or cls.teacher.username}")

# Remove aulas existentes para evitar duplicatas
removidas = cls.lessons.count()
cls.lessons.all().delete()
if removidas:
    print(f"Removidas {removidas} aulas anteriores.")

# Aulas do cronograma Excel Presencial (CH Total: 40h)
aulas = [
    (date(2026, 5, 21),  180, 'Aula 1  – 21/mai | 09h30 as 12h30 | Realizado',   True),
    (date(2026, 5, 26),  180, 'Aula 2  – 26/mai | 09h30 as 12h30 | Realizado',   True),
    (date(2026, 5, 27),  180, 'Aula 3  – 27/mai | 09h30 as 12h30 | Realizado',   True),
    (date(2026, 6,  2),  180, 'Aula 4  – 02/jun | 09h30 as 12h30 | Realizado',   True),
    (date(2026, 7, 13),  180, 'Aula 5  – 13/jul | 09h30 as 12h30 | A iniciar',  False),
    (date(2026, 7, 14),  180, 'Aula 6  – 14/jul | 09h30 as 12h30 | A iniciar',  False),
    (date(2026, 7, 15),  180, 'Aula 7  – 15/jul | 09h30 as 12h30 | A iniciar',  False),
    (date(2026, 7, 17),  180, 'Aula 8  – 17/jul | 09h30 as 12h30 | A iniciar',  False),
    (date(2026, 7, 27),  180, 'Aula 9  – 27/jul | 09h30 as 12h30 | A iniciar',  False),
    (date(2026, 7, 29),  180, 'Aula 10 – 29/jul | 09h30 as 12h30 | A iniciar',  False),
    (date(2026, 8,  4),  180, 'Aula 11 – 04/ago | 09h30 as 12h30 | A iniciar',  False),
    (date(2026, 8,  5),  210, 'Aula 12 – 05/ago | 09h30 as 12h30 | A iniciar',  False),
    (date(2026, 8,  6),  210, 'Aula 13 – 06/ago | 09h30 as 12h30 | A iniciar',  False),
]

print(f"\nCriando {len(aulas)} aulas...")
for i, (dt, duracao, titulo, publicada) in enumerate(aulas, start=1):
    ch = '03:00' if duracao == 180 else '03:30'
    Lesson.objects.create(
        target_class=cls,
        title=titulo,
        content=f'Data: {dt.strftime("%d/%m/%Y")} | Horario: 09h30 as 12h30 | Modalidade: Presencial | CH: {ch}',
        order=i,
        duration_minutes=duracao,
        is_published=publicada,
        publish_date=dt if publicada else None,
    )
    status = '[PUBLICADA]' if publicada else '[RASCUNHO] '
    print(f'  {status} {titulo}')

print(f"\nConcluido! {len(aulas)} aulas adicionadas.")
print(f"Acesse: /classes/{cls.pk}/lessons/")
