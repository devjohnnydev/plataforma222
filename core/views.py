from django.shortcuts import render

def home_view(request):
    if request.user.is_authenticated:
        if request.user.is_superadmin():
            return render(request, 'core/dashboard_admin.html')
        elif request.user.is_teacher():
            return render(request, 'core/dashboard_teacher.html')
        else:
            return render(request, 'core/dashboard_student.html')
    return render(request, 'core/landing.html')

import os
from groq import Groq
from django.http import JsonResponse
import json

def chat_view(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            message = data.get("message", "")
            
            client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
            completion = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": "You are Mister, a helpful and friendly AI assistant for students at Johnny Corporate Training. Answer their questions clearly and concisely in Portuguese."},
                    {"role": "user", "content": message}
                ],
                temperature=0.7,
                max_tokens=1024,
            )
            response_text = completion.choices[0].message.content
            return JsonResponse({"response": response_text})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
            
    return render(request, 'core/chat.html')
