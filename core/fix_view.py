import os
import django
from django.http import HttpResponse

def fix_view(request):
    try:
        from django.contrib.auth import get_user_model
        from classes.models import Class
        
        User = get_user_model()
        correct_teacher = User.objects.filter(email='johnny.oliveira@sp.senai.br').first()
        
        if not correct_teacher:
            # Tentar achar de outra forma
            correct_teacher = User.objects.filter(username='johnny.oliveira').first()
            if not correct_teacher:
                return HttpResponse("Professor johnny.oliveira nao encontrado.", status=400)
            
        logs = [f"Professor correto encontrado: {correct_teacher.username} ({correct_teacher.email})"]
        
        # Transfer Befly
        befly = Class.objects.filter(name__icontains='Befly').first()
        if befly:
            befly.teacher = correct_teacher
            befly.save()
            logs.append(f"Professor da turma Befly (ID={befly.pk}) atualizado para {correct_teacher.username}")
        else:
            logs.append("Turma Befly não encontrada")
        
        # Transfer Power BI
        powerbi = Class.objects.filter(name__icontains='Power BI').first()
        if powerbi:
            powerbi.teacher = correct_teacher
            powerbi.save()
            logs.append(f"Professor da turma Power BI (ID={powerbi.pk}) atualizado para {correct_teacher.username}")
        else:
            logs.append("Turma Power BI não encontrada")
            
        # Transfer Excel Presencial
        excel = Class.objects.filter(name__icontains='Curso de Excel').exclude(name__icontains='Befly').first()
        if excel:
            excel.teacher = correct_teacher
            excel.save()
            logs.append(f"Professor da turma Excel (ID={excel.pk}) atualizado para {correct_teacher.username}")
            
        return HttpResponse("<br>".join(logs))
    except Exception as e:
        return HttpResponse(f"Erro: {str(e)}", status=500)
