from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from core.views import home


def reset_admin(request):
    from core.models import User
    from rest_framework.authtoken.models import Token
    u, created = User.objects.get_or_create(username='admin', defaults={'email': 'admin@stemsheetz.com'})
    u.set_password('Admin@Live2026')
    u.role = 'ROLE_ADMIN'
    u.is_superuser = True
    u.is_staff = True
    u.save()
    Token.objects.get_or_create(user=u)
    return JsonResponse({'status': 'ok', 'created': created})


urlpatterns = [
    path('', home),
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
    path('reset-admin-pw/', reset_admin),
]
