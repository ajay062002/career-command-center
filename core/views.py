import datetime
import json
import re
import os
import sys
import threading
from io import BytesIO
from pathlib import Path

from django.conf import settings
from django.http import HttpResponse, FileResponse
from django.utils import timezone
from django.db.models import Count, Sum
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate, login as django_login

# Safe import for Gemini
try:
    import google.generativeai as genai
except ImportError:
    genai = None

from . import models
from .serializers import (UserSerializer, JobSerializer, SubmissionSerializer, 
                          RTRSerializer, ReminderSerializer, StudySessionSerializer, ScrapedJobSerializer)
from .pagination import AngularPagination

def home(request):
    return HttpResponse("Command Center Backend is Online")

class AuthViewSet(viewsets.ViewSet):
    @action(detail=False, methods=['post'], url_path='register')
    def register(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, _ = Token.objects.get_or_create(user=user)
            data = UserSerializer(user).data
            data['token'] = token.key
            return Response(data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='login')
    def login(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        if user:
            django_login(request, user)
            token, _ = Token.objects.get_or_create(user=user)
            data = UserSerializer(user).data
            data['token'] = token.key
            return Response(data)
        return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=False, methods=['post'], url_path='change-password')
    def change_password(self, request):
        user = request.user
        if not user.is_authenticated:
            return Response({'detail': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
        old_password = request.data.get('old_password', '')
        new_password = request.data.get('new_password', '')
        if not old_password or not new_password:
            return Response({'detail': 'Both old_password and new_password are required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not user.check_password(old_password):
            return Response({'detail': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save()
        Token.objects.filter(user=user).delete()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'detail': 'Password changed successfully.', 'token': token.key})

class AnalyticsViewSet(viewsets.ViewSet):
    def get_user(self, request):
        user_id = request.query_params.get('userId')
        if user_id and request.user.role == 'ROLE_ADMIN':
            return models.User.objects.get(id=user_id)
        return request.user

    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard(self, request):
        user = self.get_user(request)
        if not user.is_authenticated: return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
        rtr_count = models.RTR.objects.filter(user=user).count()
        sub_count = models.Submission.objects.filter(user=user).count()
        sub_rate = (sub_count / rtr_count * 100) if rtr_count > 0 else 0
        vendor_set = set(models.RTR.objects.filter(user=user).values_list('vendorCompany', flat=True)) | \
                     set(models.Submission.objects.filter(user=user).values_list('submittedByVendor', flat=True))
        vendor_count = len([v for v in vendor_set if v])
        return Response({
            'totalJobs': models.Job.objects.filter(user=user).count(),
            'activeSubmissions': sub_count, 'rtrPending': rtr_count, 'totalVendors': vendor_count,
            'submissionRate': round(sub_rate, 1),
            'interviewConversions': models.Submission.objects.filter(user=user, submissionStatus__in=['INTERVIEW', 'INTERVIEW_SCHEDULED']).count()
        })

class AutomationViewSet(viewsets.ViewSet):
    def _get_automation_path(self):
        return Path(settings.BASE_DIR)

    def _extract_important_tool(self, jd_text):
        if not jd_text: return "SoftwareEngineer"
        tools = ["Java", "Spring", "Angular", "React", "Python", "AWS", "Kafka", "Docker", "Kubernetes", "Microservices"]
        for t in tools:
            if t.lower() in jd_text.lower(): return t
        return "SoftwareEngineer"

    def _ai_tailor_sections(self, jd_text, base_content, sections):
        api_key = getattr(settings, 'GEMINI_API_KEY', None)
        if not api_key or not genai: return None
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')
            prompt = f"""
            You are a World-Class Recruiter. Rewrite Ajay Purshotam Thota's resume for this JD.
            JD: {jd_text[:3000]}
            SECTION TOGGLES: {json.dumps(sections)}
            BASE CONTENT: {json.dumps(base_content)}
            
            DIRECTIONS:
            1. ONLY update sections that are 'true' in SECTION TOGGLES.
            2. SUMMARY: 5-6 bullets matching JD keywords.
            3. TD/CH: Pick best bullets highlighting relevant tech (Kafka, Spring, etc).
            4. KEYWORDS: Return a list of 10 matched keywords found in JD.
            
            Return ONLY a valid JSON object:
            {{"TITLE": "...", "SUMMARY": ["...", "..."], "TD": ["...", "..."], "CH": ["...", "..."], "TD_ENV": "...", "KEYWORDS": ["...", "..."]}}
            """
            response = model.generate_content(prompt)
            raw = response.text.strip()
            if "```json" in raw: raw = raw.split("```json")[-1].split("```")[0].strip()
            return json.loads(raw)
        except: return None

    @action(detail=False, methods=['post'], url_path='tailor-sections')
    def tailor_sections(self, request):
        jd_text = request.data.get('jd_text', '')
        base_content = request.data.get('base_content', {})
        sections = request.data.get('sections', {})
        use_ai = request.data.get('use_ai', True)

        # 1. Keyword Extraction (Always for Rating)
        KEYWORDS = ["Java", "Spring Boot", "Microservices", "REST", "Kafka", "AWS", "Docker", "Kubernetes", "Angular", "React", "PostgreSQL", "CI/CD", "Redis", "Oracle"]
        found_keywords = [kw for kw in KEYWORDS if re.search(r'\b' + re.escape(kw) + r'\b', jd_text, re.IGNORECASE)]

        # 2. Try AI Tailoring
        if use_ai:
            ai_data = self._ai_tailor_sections(jd_text, base_content, sections)
            if ai_data:
                return Response({
                    'updated': ai_data,
                    'keywords': ai_data.get('KEYWORDS', found_keywords),
                    'sections_updated': len([k for k in ai_data.keys() if k != 'KEYWORDS']),
                    'ai_powered': True
                })

        # 3. Fallback Ranking Logic
        def rank_bullets(pool, keywords, limit=6):
            if not pool: return []
            scored = []
            for b in pool:
                score = sum([3 for kw in keywords if kw.lower() in b.lower()])
                scored.append((score, b))
            scored.sort(key=lambda x: x[0], reverse=True)
            return [b for s, b in scored[:limit]]

        updated = {}
        if sections.get('summary'): updated['SUMMARY'] = rank_bullets(base_content.get('SUMMARY', []), found_keywords)
        if sections.get('td'): updated['TD'] = rank_bullets(base_content.get('TD', []), found_keywords, 10)
        if sections.get('env'): updated['TD_ENV'] = ", ".join(found_keywords)

        return Response({
            'updated': updated,
            'keywords': found_keywords,
            'sections_updated': len(updated),
            'ai_powered': False
        })

    @action(detail=False, methods=['post'], url_path='generate-resume')
    def generate_resume(self, request):
        root = self._get_automation_path()
        template_path = root / "reference" / "Ajay Purshotam Thota.docx"
        if not template_path.exists(): return Response({'error': 'Template missing'}, status=404)
        
        try:
            from docxtpl import DocxTemplate
            from docx import Document
            from docx.shared import Pt
            doc = DocxTemplate(str(template_path))
            
            # Sanitization
            raw_ctx = request.data.get('resume_data', {})
            ctx = {}
            for k, v in raw_ctx.items():
                if isinstance(v, list):
                    ctx[k] = v
                    ctx[f"{k}_STR"] = "\n".join([f"• {i}" for i in v])
                else: ctx[k] = v
            
            doc.render(ctx)
            buf = BytesIO()
            doc.save(buf)
            buf.seek(0)
            
            # Post-Process Formatting
            d = Document(buf)
            for p in d.paragraphs:
                pf = p.paragraph_format
                pf.space_before = pf.space_after = Pt(0)
                pf.line_spacing = 1.0
            
            final_buf = BytesIO()
            d.save(final_buf)
            final_buf.seek(0)
            return FileResponse(final_buf, as_attachment=True, filename="Ajay_Thota_Tailored.docx")
        except Exception as e: return Response({'error': str(e)}, status=500)

class ScrapedJobViewSet(viewsets.ModelViewSet):
    serializer_class = ScrapedJobSerializer
    pagination_class = AngularPagination
    def get_queryset(self):
        if not self.request.user.is_authenticated: return models.ScrapedJob.objects.none()
        return models.ScrapedJob.objects.filter(user=self.request.user).order_by('-scrapedAt')

    @action(detail=True, methods=['post'], url_path='promote')
    def promote_to_job(self, request, pk=None):
        scraped_job = self.get_object()
        job = models.Job.objects.create(user=request.user, jobTitle=scraped_job.title, companyName=scraped_job.company, status='APPLIED')
        return Response(JobSerializer(job).data)

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    def get_queryset(self):
        if not self.request.user.is_authenticated: return models.User.objects.none()
        return models.User.objects.filter(id=self.request.user.id)

class JobViewSet(viewsets.ModelViewSet):
    serializer_class = JobSerializer
    pagination_class = AngularPagination
    def perform_create(self, serializer): serializer.save(user=self.request.user)
    def get_queryset(self):
        if not self.request.user.is_authenticated: return models.Job.objects.none()
        return models.Job.objects.filter(user=self.request.user).order_by('-createdAt')

class SubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = SubmissionSerializer
    def perform_create(self, serializer): serializer.save(user=self.request.user)
    def get_queryset(self):
        if not self.request.user.is_authenticated: return models.Submission.objects.none()
        return models.Submission.objects.filter(user=self.request.user).select_related('job')

class RTRViewSet(viewsets.ModelViewSet):
    serializer_class = RTRSerializer
    def perform_create(self, serializer): serializer.save(user=self.request.user)
    def get_queryset(self):
        if not self.request.user.is_authenticated: return models.RTR.objects.none()
        return models.RTR.objects.filter(user=self.request.user).select_related('job')

class ReminderViewSet(viewsets.ModelViewSet):
    serializer_class = ReminderSerializer
    def perform_create(self, serializer): serializer.save(user=self.request.user)
    def get_queryset(self):
        if not self.request.user.is_authenticated: return models.Reminder.objects.none()
        return models.Reminder.objects.filter(user=self.request.user).select_related('job')

class StudySessionViewSet(viewsets.ModelViewSet):
    serializer_class = StudySessionSerializer
    def perform_create(self, serializer): serializer.save(user=self.request.user)
    def get_queryset(self):
        if not self.request.user.is_authenticated: return models.StudySession.objects.none()
        return models.StudySession.objects.filter(user=self.request.user)
