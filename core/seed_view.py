import os
import django
from django.http import HttpResponse
def run_seeds_view(request):
    try:
        from django.contrib.auth import get_user_model
        from classes.models import Class
        from courses.models import Lesson
        from datetime import date
        
        User = get_user_model()
        teacher = User.objects.filter(username__icontains='johnny').first() or User.objects.filter(email__icontains='johnny').first()
        
        if not teacher:
            return HttpResponse("Professor johnny nao encontrado.", status=400)
            
        logs = []
        logs.append(f"Professor encontrado: {teacher.username}")
        
        # --- BEFLY EXCEL ---
        TARGET_CODE = 'P0BYFAGI'
        cls_befly = Class.objects.filter(join_code=TARGET_CODE).first()
        if not cls_befly:
            cls_befly = Class.objects.filter(name__icontains='Befly').first()
            
        if cls_befly:
            cls_befly.lessons.all().delete()
            logs.append(f"Limpando e populando Befly (ID={cls_befly.pk})")
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
            for i, (dt, duracao, titulo, publicada) in enumerate(aulas, start=1):
                ch = '03:00' if duracao == 180 else '03:30'
                Lesson.objects.create(
                    target_class=cls_befly, title=titulo,
                    content=f'Data: {dt.strftime("%d/%m/%Y")} | Horario: 09h30 as 12h30 | Modalidade: Presencial | CH: {ch}',
                    order=i, duration_minutes=duracao, is_published=publicada,
                    publish_date=dt if publicada else None,
                )
            logs.append(f"Befly populada com {len(aulas)} aulas.")
        
        # --- POWER BI ---
        Class.objects.filter(name='Curso de Power BI – Presencial', teacher=teacher).delete()
        powerbi_class = Class.objects.create(
            name='Curso de Power BI – Presencial',
            description='Cronograma presencial do Curso de Power BI. CH Total: 32h. Horário: 14h às 17h.',
            teacher=teacher, color='#F2C811'
        )
        logs.append(f"Turma Power BI criada (ID={powerbi_class.pk})")
        
        powerbi_aulas = [
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
            (date(2026, 8,  5),  120, 'Aula 11 – 05/ago | 14h às 17h | A iniciar', False),
        ]
        
        for i, (dt, duracao, titulo, publicada) in enumerate(powerbi_aulas, start=1):
            ch = '03:00' if duracao == 180 else '02:00'
            Lesson.objects.create(
                target_class=powerbi_class, title=titulo,
                content=f'Data: {dt.strftime("%d/%m/%Y")} | Horário: 14h às 17h | Modalidade: Presencial | CH: {ch}',
                order=i, duration_minutes=duracao, is_published=publicada,
                publish_date=dt if publicada else None,
            )
        logs.append(f"Power BI populada com {len(powerbi_aulas)} aulas.")
        
        return HttpResponse("<br>".join(logs))
    except Exception as e:
        return HttpResponse(f"Erro: {str(e)}", status=500)
