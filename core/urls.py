from django.urls import path, include
from django.http import JsonResponse
from rest_framework.routers import DefaultRouter
from .views import (AuthViewSet, UserViewSet, JobViewSet, SubmissionViewSet,
                    RTRViewSet, ReminderViewSet, StudySessionViewSet, AnalyticsViewSet, AutomationViewSet, ScrapedJobViewSet, home)

router = DefaultRouter()
router.register(r'auth', AuthViewSet, basename='auth')
router.register(r'users', UserViewSet, basename='users')
router.register(r'jobs', JobViewSet, basename='jobs')
router.register(r'submissions', SubmissionViewSet, basename='submissions')
router.register(r'rtrs', RTRViewSet, basename='rtrs')
router.register(r'reminders', ReminderViewSet, basename='reminders')
router.register(r'study-sessions', StudySessionViewSet, basename='study-sessions')
router.register(r'analytics', AnalyticsViewSet, basename='analytics')
router.register(r'automation', AutomationViewSet, basename='automation')
router.register(r'scraped-jobs', ScrapedJobViewSet, basename='scraped-jobs')

urlpatterns = [
    path('health/', lambda r: JsonResponse({'status': 'ok'})),
    path('', include(router.urls)),
]
