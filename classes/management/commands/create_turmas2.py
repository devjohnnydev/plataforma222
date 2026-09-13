from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from classes.models import Class, Enrollment
from courses.models import Lesson
from datetime import date

User = get_user_model()


class Command(BaseCommand):
    help = "Cria as duas novas turmas (Excel Online 2 e Power BI Presencial 2) com cronograma completo"

    def handle(self, *args, **options):
        self.stdout.write("==> Iniciando criacao das novas turmas...")

        teacher = User.objects.filter(username__icontains="johnny").first()
        if not teacher:
            teacher = User.objects.filter(is_staff=True).first()
        if not teacher:
            self.stderr.write("Nenhum professor encontrado.")
            return

        self.stdout.write(f"Professor: {teacher.username}")

        # ---- EXCEL ONLINE 2 ----
        excel_class, excel_created = Class.objects.get_or_create(
            name="Curso de Excel - Online 2",
            teacher=teacher,
            defaults={
                "description": "Treinamento online de Excel - Turma 2. CH Total: 40h. Horario: 14h as 17h.",
                "color": "#1D6F42",
                "total_hours": 40,
            }
        )
        if excel_created:
            self.stdout.write(self.style.SUCCESS(f"Turma criada: {excel_class.name}"))
        else:
            self.stdout.write(f"Turma ja existe: {excel_class.name}")

        excel_aulas = [
            (date(2026, 9, 17),  "14h as 17h",   "Aula 1 - Ambientacao e Introducao"),
            (date(2026, 9, 21),  "14h as 17h",   "Aula 2 - Interface e Navegacao"),
            (date(2026, 9, 22),  "14h as 17h",   "Aula 3 - Formulas Basicas"),
            (date(2026, 9, 23),  "14h as 17h",   "Aula 4 - Formatacao de Planilhas"),
            (date(2026, 9, 24),  "14h as 17h",   "Aula 5 - Funcoes de Texto e Data"),
            (date(2026, 9, 25),  "14h as 17h",   "Aula 6 - Funcoes Logicas"),
            (date(2026, 10, 5),  "14h as 17h",   "Aula 7 - Tabela Dinamica Basica"),
            (date(2026, 10, 6),  "14h as 17h",   "Aula 8 - Tabela Dinamica Avancada"),
            (date(2026, 10, 7),  "14h as 17h",   "Aula 9 - Graficos e Visualizacao"),
            (date(2026, 10, 8),  "14h as 17h",   "Aula 10 - PROCV e PROCH"),
            (date(2026, 10, 9),  "14h as 17h",   "Aula 11 - Funcoes Avancadas"),
            (date(2026, 10, 28), "14h as 17h30", "Aula 12 - Protecao e Validacao"),
            (date(2026, 10, 29), "14h as 17h30", "Aula 13 - Revisao e Encerramento"),
        ]

        existing_excel = Lesson.objects.filter(target_class=excel_class).count()
        if existing_excel == 0:
            for i, (dt, horario, titulo) in enumerate(excel_aulas, start=1):
                Lesson.objects.create(
                    target_class=excel_class,
                    title=titulo,
                    content=horario,
                    order=i,
                    duration_minutes=180 if "17h30" not in horario else 210,
                    is_published=False,
                    publish_date=dt,
                )
            self.stdout.write(self.style.SUCCESS(f"{len(excel_aulas)} aulas criadas para Excel 2."))
        else:
            self.stdout.write(f"{existing_excel} aulas ja existem para Excel 2, pulando.")

        # ---- POWER BI PRESENCIAL 2 ----
        pbi_class, pbi_created = Class.objects.get_or_create(
            name="Curso de Power BI - Presencial 2",
            teacher=teacher,
            defaults={
                "description": "Cronograma presencial do Curso de Power BI - Turma 2. CH Total: 32h. Horario: 09h30 as 12h30.",
                "color": "#F2C811",
                "total_hours": 32,
            }
        )
        if pbi_created:
            self.stdout.write(self.style.SUCCESS(f"Turma criada: {pbi_class.name}"))
        else:
            self.stdout.write(f"Turma ja existe: {pbi_class.name}")

        pbi_aulas = [
            (date(2026, 9, 17),  "09h30 as 12h30", "Aula 1 - Ambientacao e Interface Power BI"),
            (date(2026, 9, 21),  "09h30 as 12h30", "Aula 2 - Introducao ao Power BI"),
            (date(2026, 9, 22),  "09h30 as 12h30", "Aula 3 - Importacao de Dados e Power Query"),
            (date(2026, 9, 23),  "09h30 as 12h30", "Aula 4 - Transformacao de Dados"),
            (date(2026, 9, 24),  "09h30 as 12h30", "Aula 5 - Modelagem de Dados"),
            (date(2026, 10, 5),  "09h30 as 12h30", "Aula 6 - Introducao a DAX"),
            (date(2026, 10, 6),  "09h30 as 12h30", "Aula 7 - Funcoes DAX Avancadas"),
            (date(2026, 10, 7),  "09h30 as 12h30", "Aula 8 - Visualizacoes Basicas"),
            (date(2026, 10, 8),  "09h30 as 12h30", "Aula 9 - Visuais Interativos e Filtros"),
            (date(2026, 10, 28), "09h30 as 12h30", "Aula 10 - Criacao de Dashboards"),
            (date(2026, 10, 29), "09h30 as 11h30", "Aula 11 - Publicacao e Encerramento"),
        ]

        existing_pbi = Lesson.objects.filter(target_class=pbi_class).count()
        if existing_pbi == 0:
            for i, (dt, horario, titulo) in enumerate(pbi_aulas, start=1):
                Lesson.objects.create(
                    target_class=pbi_class,
                    title=titulo,
                    content=horario,
                    order=i,
                    duration_minutes=180 if "12h30" in horario else 120,
                    is_published=False,
                    publish_date=dt,
                )
            self.stdout.write(self.style.SUCCESS(f"{len(pbi_aulas)} aulas criadas para Power BI 2."))
        else:
            self.stdout.write(f"{existing_pbi} aulas ja existem para Power BI 2, pulando.")

        self.stdout.write(self.style.SUCCESS("==> Concluido! Turmas criadas sem tocar nos dados existentes."))
