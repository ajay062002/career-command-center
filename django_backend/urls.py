from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from core.views import home


def setup_admin(request):
    """One-time endpoint to seed the admin user. Will be removed after setup."""
    from core.models import User
    from rest_framework.authtoken.models import Token
    created = []
    for uname, pwd, role, is_super in [
        ('admin', 'password123', 'ROLE_ADMIN', True),
        ('user1', 'password123', 'ROLE_USER', False),
    ]:
        if not User.objects.filter(username=uname).exists():
            if is_super:
                u = User.objects.create_superuser(username=uname, password=pwd, email=f'{uname}@stemsheetz.com')
            else:
                u = User.objects.create_user(username=uname, password=pwd, email=f'{uname}@stemsheetz.com')
            u.role = role
            u.save()
            Token.objects.get_or_create(user=u)
            created.append(uname)
    return JsonResponse({'created': created, 'status': 'ok'})


urlpatterns = [
    path('', home),
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
    path('setup-once/', setup_admin),
]
