import os
import django
from django.http import HttpResponse

def update_lessons_view(request):
    try:
        from classes.models import Class
        from courses.models import Lesson
        
        logs = []
        
        excel_curriculum = [
            "Apresentação do Professor e do Curso, Introdução e Interface do Excel",
            "Formatação de Planilhas, Tipos de Dados e Atalhos Essenciais",
            "Fórmulas Básicas (SOMA, MÉDIA, MÍN, MÁX) e Operadores",
            "Fórmulas Condicionais (SE, E, OU, SEERRO)",
            "Funções de Contagem e Soma (CONT.SE, CONT.SES, SOMASE, SOMASES)",
            "Funções de Pesquisa e Referência (PROCV, PROCH)",
            "Funções de Pesquisa Avançadas (ÍNDICE, CORRESP, PROCX)",
            "Validação de Dados, Filtros Básicos e Avançados",
            "Tabelas Dinâmicas (Pivot Tables) - Fundamentos e Criação",
            "Tabelas Dinâmicas Avançadas e Gráficos Dinâmicos",
            "Criação de Dashboards Profissionais no Excel",
            "Introdução a Macros e Automação Básica",
            "Revisão Geral, Resolução de Casos Práticos e Encerramento"
        ]
        
        powerbi_curriculum = [
            "Apresentação do Professor e do Curso, Introdução ao BI e Interface do Power BI",
            "Importação de Dados e Introdução ao Power Query",
            "Transformação e Limpeza de Dados (Power Query Avançado)",
            "Modelagem de Dados (Star Schema, Tabelas Fato e Dimensão, Relacionamentos)",
            "Introdução à Linguagem DAX (Colunas Calculadas vs Medidas)",
            "DAX Intermediário: Funções de Inteligência de Tempo (Time Intelligence)",
            "DAX Avançado (CALCULATE, FILTER, ALL)",
            "Criação de Relatórios e Visualizações de Dados (Gráficos, Segmentações)",
            "Interatividade (Tooltips, Drill-through, Bookmarks)",
            "Publicação e Compartilhamento (Power BI Service e Workspaces)",
            "Revisão Geral, Construção do Dashboard Final e Encerramento"
        ]
        
        # Befly (Excel)
        befly = Class.objects.filter(name__icontains='Befly').first()
        if befly:
            lessons = befly.lessons.all().order_by('order')
            count = 0
            for idx, lesson in enumerate(lessons):
                topic = excel_curriculum[idx] if idx < len(excel_curriculum) else "Atividade Extra"
                if "Conteúdo Programático:" not in lesson.content:
                    old_meta = lesson.content
                    lesson.content = f"<p><strong>Conteúdo Programático:</strong><br>{topic}</p>\n<hr>\n<p><small>{old_meta}</small></p>"
                    lesson.save()
                    count += 1
            logs.append(f"Aulas de Excel atualizadas: {count}/{lessons.count()}")
        else:
            logs.append("Befly não encontrada")
            
        # Power BI
        powerbi = Class.objects.filter(name__icontains='Power BI').first()
        if powerbi:
            lessons = powerbi.lessons.all().order_by('order')
            count = 0
            for idx, lesson in enumerate(lessons):
                topic = powerbi_curriculum[idx] if idx < len(powerbi_curriculum) else "Atividade Extra"
                if "Conteúdo Programático:" not in lesson.content:
                    old_meta = lesson.content
                    lesson.content = f"<p><strong>Conteúdo Programático:</strong><br>{topic}</p>\n<hr>\n<p><small>{old_meta}</small></p>"
                    lesson.save()
                    count += 1
            logs.append(f"Aulas de Power BI atualizadas: {count}/{lessons.count()}")
        else:
            logs.append("Power BI não encontrada")
            
        return HttpResponse("<br>".join(logs))
    except Exception as e:
        return HttpResponse(f"Erro: {str(e)}", status=500)
