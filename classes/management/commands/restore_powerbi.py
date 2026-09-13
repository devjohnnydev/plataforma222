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

        self.stdout.write(f"Professor encontrado: {teacher.username}")

        # Try to find by original name with dash or em-dash
        powerbi_class = Class.objects.filter(
            teacher=teacher,
            name__icontains="Power BI"
        ).filter(name__icontains="Presencial").first()

        if not powerbi_class:
            powerbi_class = Class.objects.create(
                name="Curso de Power BI - Presencial",
                teacher=teacher,
                description="Cronograma presencial do Curso de Power BI. CH Total: 32h.",
                color="#F2C811",
                total_hours=32,
            )
            self.stdout.write(self.style.SUCCESS(f"Turma criada: {powerbi_class.name}"))
        else:
            self.stdout.write(f"Turma encontrada: {powerbi_class.name} (id={powerbi_class.pk})")

        aulas = [
            (date(2026, 9, 17),  180, "Aula 1 - Ambientacao - 09h30 as 12h30"),
            (date(2026, 9, 21),  180, "Aula 2 - Introducao ao Power BI - 09h30 as 12h30"),
            (date(2026, 9, 22),  180, "Aula 3 - Importacao de Dados e Power Query - 09h30 as 12h30"),
            (date(2026, 9, 23),  180, "Aula 4 - Transformacao de Dados - 09h30 as 12h30"),
            (date(2026, 9, 24),  180, "Aula 5 - Modelagem de Dados - 09h30 as 12h30"),
            (date(2026, 10, 5),  180, "Aula 6 - Introducao a DAX - 09h30 as 12h30"),
            (date(2026, 10, 6),  180, "Aula 7 - Funcoes DAX Avancadas - 09h30 as 12h30"),
            (date(2026, 10, 7),  180, "Aula 8 - Visualizacoes Basicas - 09h30 as 12h30"),
            (date(2026, 10, 8),  180, "Aula 9 - Visuais Interativos e Filtros - 09h30 as 12h30"),
            (date(2026, 10, 28), 180, "Aula 10 - Criacao de Dashboards - 09h30 as 12h30"),
            (date(2026, 10, 29), 120, "Aula 11 - Publicacao e Encerramento - 09h30 as 11h30"),
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

        # Enroll: anyone who is student role OR already enrolled in any other class
        student_ids = set(User.objects.filter(role="STUDENT").values_list("id", flat=True))
        # Also grab all students already in any class (covers users without explicit role set)
        enrolled_ids = set(Enrollment.objects.exclude(
            enrolled_class=powerbi_class
        ).values_list("student_id", flat=True))
        all_student_ids = student_ids | enrolled_ids

        self.stdout.write(f"Total de alunos encontrados para matricular: {len(all_student_ids)}")

        count = 0
        for sid in all_student_ids:
            _, enr = Enrollment.objects.get_or_create(
                student_id=sid,
                enrolled_class=powerbi_class,
                defaults={"status": "ACTIVE"}
            )
            if enr:
                count += 1
        self.stdout.write(self.style.SUCCESS(f"{count} alunos matriculados na turma de Power BI."))
