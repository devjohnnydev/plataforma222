class RoleSwitchMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            # If the user is a teacher, has been promoted, or is superadmin, check session switch
            if request.user.role == 'TEACHER' or getattr(request.user, 'is_promoted_teacher', False) or request.user.is_superuser:
                view_as = request.session.get('view_as')
                if view_as in ['TEACHER', 'STUDENT']:
                    request.user.role = view_as
        
        response = self.get_response(request)
        return response
