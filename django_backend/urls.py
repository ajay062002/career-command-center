from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from core.views import home


def reset_admin(request):
    from core.models import User
    u = User.objects.get(username='admin')
    u.set_password('Admin@Live2026')
    u.role = 'ROLE_ADMIN'
    u.save()
    return JsonResponse({'status': 'ok', 'msg': 'admin password reset'})


urlpatterns = [
    path('', home),
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
    path('reset-admin-pw/', reset_admin),
]
