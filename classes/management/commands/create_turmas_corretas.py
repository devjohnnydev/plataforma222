from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from classes.models import Class
from courses.models import Course, Lesson
from datetime import date

User = get_user_model()


class Command(BaseCommand):
    help = "Cria turmas Excel Avancado e Power BI com aulas e vinculadas aos cursos"

    def handle(self, *args, **options):
        Class.objects.filter(name__in=["Curso de Excel - Online 2", "Curso de Power BI - Presencial 2"]).delete()
        
        teacher = User.objects.filter(username__icontains="johnny").first()
        if not teacher:
            teacher = User.objects.filter(is_staff=True).first()

        excel_course = Course.objects.filter(title__icontains="Excel").first()
        pbi_course = Course.objects.filter(title__icontains="Power BI").first()

        # ---- EXCEL AVANCADO ----
        excel_class, _ = Class.objects.get_or_create(
            name="Turma de Excel Avançado",
            teacher=teacher,
            defaults={
                "course": excel_course,
                "description": "Treinamento online de Excel Avancado. CH Total: 40h.",
                "color": "#1D6F42",
                "total_hours": 40,
            }
        )
        if not excel_class.course and excel_course:
            excel_class.course = excel_course
            excel_class.save()

        excel_aulas = [
            (date(2026, 9, 17),  "14h as 17h",   "Aula 01 - Ambientação"),
            (date(2026, 9, 21),  "14h as 17h",   "Aula 02 - Interface e Navegacao"),
            (date(2026, 9, 22),  "14h as 17h",   "Aula 03 - Formulas Basicas"),
            (date(2026, 9, 23),  "14h as 17h",   "Aula 04 - Formatacao de Planilhas"),
            (date(2026, 9, 24),  "14h as 17h",   "Aula 05 - Funcoes de Texto e Data"),
            (date(2026, 9, 25),  "14h as 17h",   "Aula 06 - Funcoes Logicas"),
            (date(2026, 10, 5),  "14h as 17h",   "Aula 07 - Tabela Dinamica Basica"),
            (date(2026, 10, 6),  "14h as 17h",   "Aula 08 - Tabela Dinamica Avancada"),
            (date(2026, 10, 7),  "14h as 17h",   "Aula 09 - Graficos e Visualizacao"),
            (date(2026, 10, 8),  "14h as 17h",   "Aula 10 - PROCV e PROCH"),
            (date(2026, 10, 9),  "14h as 17h",   "Aula 11 - Funcoes Avancadas"),
            (date(2026, 10, 28), "14h as 17h30", "Aula 12 - Protecao e Validacao"),
            (date(2026, 10, 29), "14h as 17h30", "Aula 13 - Revisao e Encerramento"),
        ]

        if Lesson.objects.filter(target_class=excel_class).count() == 0:
            for i, (dt, horario, titulo) in enumerate(excel_aulas, start=1):
                Lesson.objects.create(
                    target_class=excel_class, title=titulo, content=horario, order=i,
                    duration_minutes=180, is_published=False, publish_date=dt,
                )

        # ---- POWER BI ----
        pbi_class, _ = Class.objects.get_or_create(
            name="Turma de Power BI",
            teacher=teacher,
            defaults={
                "course": pbi_course,
                "description": "Curso de Power BI - Presencial. CH Total: 32h.",
                "color": "#F2C811",
                "total_hours": 32,
            }
        )
        if not pbi_class.course and pbi_course:
            pbi_class.course = pbi_course
            pbi_class.save()

        pbi_aulas = [
            (date(2026, 9, 17),  "09h30 as 12h30", "Aula 01 - Ambientação"),
            (date(2026, 9, 21),  "09h30 as 12h30", "Aula 02 - Introducao ao Power BI"),
            (date(2026, 9, 22),  "09h30 as 12h30", "Aula 03 - Importacao de Dados e Power Query"),
            (date(2026, 9, 23),  "09h30 as 12h30", "Aula 04 - Transformacao de Dados"),
            (date(2026, 9, 24),  "09h30 as 12h30", "Aula 05 - Modelagem de Dados"),
            (date(2026, 10, 5),  "09h30 as 12h30", "Aula 06 - Introducao a DAX"),
            (date(2026, 10, 6),  "09h30 as 12h30", "Aula 07 - Funcoes DAX Avancadas"),
            (date(2026, 10, 7),  "09h30 as 12h30", "Aula 08 - Visualizacoes Basicas"),
            (date(2026, 10, 8),  "09h30 as 12h30", "Aula 09 - Visuais Interativos e Filtros"),
            (date(2026, 10, 28), "09h30 as 12h30", "Aula 10 - Criacao de Dashboards"),
            (date(2026, 10, 29), "09h30 as 11h30", "Aula 11 - Publicacao e Encerramento"),
        ]

        if Lesson.objects.filter(target_class=pbi_class).count() == 0:
            for i, (dt, horario, titulo) in enumerate(pbi_aulas, start=1):
                Lesson.objects.create(
                    target_class=pbi_class, title=titulo, content=horario, order=i,
                    duration_minutes=180, is_published=False, publish_date=dt,
                )

        self.stdout.write(self.style.SUCCESS("Turmas Excel Avancado e Power BI criadas com as devidas aulas!"))
