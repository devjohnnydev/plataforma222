from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from classes.models import Class, Enrollment
from courses.models import Lesson
from datetime import date

User = get_user_model()


class Command(BaseCommand):
    help = "Restaura a turma de Power BI e rematricula todos os alunos"

    def handle(self, *args, **options):
        self.stdout.write("==> Iniciando restauracao da turma de Power BI...")

        teacher = User.objects.filter(username__icontains="johnny").first()
        if not teacher:
            teacher = User.objects.filter(is_staff=True).first()
        if not teacher:
            self.stderr.write("Nenhum professor encontrado.")
            return

        powerbi_class, created = Class.objects.get_or_create(
            name="Curso de Power BI - Presencial",
            teacher=teacher,
            defaults={
                "description": "Cronograma presencial do Curso de Power BI. CH Total: 32h.",
                "color": "#F2C811",
                "total_hours": 32,
            }
        )

        if created:
            self.stdout.write(self.style.SUCCESS(f"Turma criada: {powerbi_class.name}"))
        else:
            self.stdout.write(f"Turma ja existe: {powerbi_class.name}")

        aulas = [
            (date(2026, 9, 17),  180, "Aula 1 - Ambientacao - Horario: 09h30 as 12h30"),
            (date(2026, 9, 21),  180, "Aula 2 - Introducao ao Power BI - Horario: 09h30 as 12h30"),
            (date(2026, 9, 22),  180, "Aula 3 - Importacao de Dados e Power Query - Horario: 09h30 as 12h30"),
            (date(2026, 9, 23),  180, "Aula 4 - Transformacao de Dados - Horario: 09h30 as 12h30"),
            (date(2026, 9, 24),  180, "Aula 5 - Modelagem de Dados - Horario: 09h30 as 12h30"),
            (date(2026, 10, 5),  180, "Aula 6 - Introducao a DAX - Horario: 09h30 as 12h30"),
            (date(2026, 10, 6),  180, "Aula 7 - Funcoes DAX Avancadas - Horario: 09h30 as 12h30"),
            (date(2026, 10, 7),  180, "Aula 8 - Visualizacoes Basicas - Horario: 09h30 as 12h30"),
            (date(2026, 10, 8),  180, "Aula 9 - Visuais Interativos e Filtros - Horario: 09h30 as 12h30"),
            (date(2026, 10, 28), 180, "Aula 10 - Criacao de Dashboards - Horario: 09h30 as 12h30"),
            (date(2026, 10, 29), 120, "Aula 11 - Publicacao e Encerramento - Horario: 09h30 as 11h30"),
        ]

        existing = Lesson.objects.filter(target_class=powerbi_class).count()
        if existing == 0:
            for i, (dt, dur, titulo) in enumerate(aulas, start=1):
                Lesson.objects.create(
                    target_class=powerbi_class,
                    title=titulo,
                    content="Modalidade: Presencial",
                    order=i,
                    duration_minutes=dur,
                    is_published=False,
                    publish_date=dt,
                )
            self.stdout.write(self.style.SUCCESS(f"{len(aulas)} aulas criadas."))
        else:
            self.stdout.write(f"{existing} aulas ja existem, pulando.")

        students = User.objects.filter(role="STUDENT")
        count = 0
        for student in students:
            _, enr = Enrollment.objects.get_or_create(
                student=student,
                enrolled_class=powerbi_class,
                defaults={"status": "ACTIVE"}
            )
            if enr:
                count += 1
        self.stdout.write(self.style.SUCCESS(f"{count} alunos matriculados."))
