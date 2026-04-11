import datetime
import json
import re
import subprocess
import sys
import threading
from io import BytesIO
from pathlib import Path

from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Count, Sum
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate, login as django_login

from . import models
from .serializers import (UserSerializer, JobSerializer, SubmissionSerializer, 
                          RTRSerializer, ReminderSerializer, StudySessionSerializer, ScrapedJobSerializer)
from .pagination import AngularPagination

def home(request):
    from django.http import HttpResponse
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
        """Allow any authenticated user to change their OWN password (requires old password)."""
        user = request.user
        if not user.is_authenticated:
            return Response({'detail': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
        old_password = request.data.get('old_password', '')
        new_password = request.data.get('new_password', '')
        if not old_password or not new_password:
            return Response({'detail': 'Both old_password and new_password are required.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(new_password) < 6:
            return Response({'detail': 'New password must be at least 6 characters.'}, status=status.HTTP_400_BAD_REQUEST)
        if not user.check_password(old_password):
            return Response({'detail': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save()
        # Re-issue token so existing sessions stay valid
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
        
        # Calculate rates
        sub_rate = (sub_count / rtr_count * 100) if rtr_count > 0 else 0
        
        # Unique vendor set
        vendor_set = set(models.RTR.objects.filter(user=user).values_list('vendorCompany', flat=True)) | \
                     set(models.Submission.objects.filter(user=user).values_list('submittedByVendor', flat=True))
        vendor_count = len([v for v in vendor_set if v])
        
        return Response({
            'totalJobs': models.Job.objects.filter(user=user).count(),
            'activeSubmissions': sub_count,
            'rtrPending': rtr_count,
            'offers': models.Job.objects.filter(user=user, status=models.JobWorkflowStatus.OFFER).count(),
            'rejected': models.Job.objects.filter(user=user, status=models.JobWorkflowStatus.REJECTED).count(),
            'studyMinutesThisWeek': models.StudySession.objects.filter(user=user).aggregate(Sum('timeSpentMinutes'))['timeSpentMinutes__sum'] or 0,
            'overdueReminders': models.Reminder.objects.filter(user=user, completed=False).count(),
            'totalUsers': models.User.objects.count() if user.role == 'ROLE_ADMIN' else 0,
            
            # Additional KPI fields for the dashboard cards
            'totalVendors': vendor_count,
            'submissionRate': round(sub_rate, 1),
            'interviewConversions': models.Submission.objects.filter(user=user, submissionStatus__in=['INTERVIEW', 'INTERVIEW_SCHEDULED']).count()
        })

    @action(detail=False, methods=['get'], url_path='jobs-by-status')
    def jobs_by_status(self, request):
        user = self.get_user(request)
        counts = models.Job.objects.filter(user=user).values('status').annotate(count=Count('id'))
        return Response(counts)

    @action(detail=False, methods=['get'], url_path='study-trend')
    def study_trend(self, request):
        user = self.get_user(request)
        last_7_days = timezone.now() - datetime.timedelta(days=7)
        trend = models.StudySession.objects.filter(user=user, date__gte=last_7_days)\
                    .values('date').annotate(totalMinutes=Sum('timeSpentMinutes')).order_by('date')
        return Response(trend)

    @action(detail=False, methods=['get'], url_path='vendor-performance')
    def vendor_performance(self, request):
        from django.db.models import Q
        user = self.get_user(request)

        # Single annotated query per dataset — no per-vendor loop queries
        sub_data = models.Submission.objects.filter(user=user)\
            .values('submittedByVendor')\
            .annotate(
                totalSubmissions=Count('id'),
                interviewsOrOffers=Count('id', filter=Q(submissionStatus__in=['INTERVIEW', 'INTERVIEW_SCHEDULED']))
            )
        rtr_data = models.RTR.objects.filter(user=user)\
            .values('vendorCompany')\
            .annotate(totalRtrs=Count('id'))

        vendor_map = {
            item['submittedByVendor']: {
                'vendorCompany': item['submittedByVendor'],
                'totalSubmissions': item['totalSubmissions'],
                'totalRtrs': 0,
                'interviewsOrOffers': item['interviewsOrOffers']
            }
            for item in sub_data if item['submittedByVendor']
        }

        for item in rtr_data:
            v = item['vendorCompany']
            if not v:
                continue
            if v in vendor_map:
                vendor_map[v]['totalRtrs'] = item['totalRtrs']
            else:
                vendor_map[v] = {'vendorCompany': v, 'totalSubmissions': 0, 'totalRtrs': item['totalRtrs'], 'interviewsOrOffers': 0}

        return Response(list(vendor_map.values()))

    @action(detail=False, methods=['get'], url_path='rtr-timeline')
    def rtr_timeline(self, request):
        user = self.get_user(request)
        # Combined timeline is more complex, we'll try to find union of dates
        rtr_counts = models.RTR.objects.filter(user=user).values('date').annotate(rtrs=Count('id'))
        sub_counts = models.Submission.objects.filter(user=user, submissionDate__isnull=False).values('submissionDate').annotate(submissions=Count('id'))
        
        timeline_map = {}
        for item in rtr_counts:
            d = str(item['date'])
            timeline_map[d] = {'date': d, 'rtrs': item['rtrs'], 'submissions': 0}
            
        for item in sub_counts:
            d = str(item['submissionDate'])
            if d in timeline_map:
                timeline_map[d]['submissions'] = item['submissions']
            else:
                timeline_map[d] = {'date': d, 'rtrs': 0, 'submissions': item['submissions']}
                
        # Sorted results
        results = sorted(timeline_map.values(), key=lambda x: x['date'])
        return Response(results)

class AutomationViewSet(viewsets.ViewSet):
    def _get_automation_path(self):
        return Path(settings.BASE_DIR) / "backend" / "automation-service"

    @action(detail=False, methods=['get'], url_path='base-content')
    def base_content(self, request):
        automation_dir = self._get_automation_path()
        json_path = automation_dir / "data" / "base_content.json"
        if json_path.exists():
            with open(json_path, "r", encoding="utf-8") as f:
                return Response(json.load(f))
        return Response({})

    def _extract_important_tool(self, jd_text):
        if not jd_text:
            return "General"
        
        # List of common tools/keywords
        TOOLS = [
            "Java", "Spring Boot", "Microservices", "React", "Angular", "Python", "AWS", "Azure", 
            "Kafka", "Kubernetes", "Docker", "DevOps", "FullStack", "Backend", "Frontend",
            "CI/CD", "Machine Learning", "Oracle", "PostgreSQL", "MongoDB", "Cassandra",
            "Spark", "Flink", "Snowflake", "Teradata", "GCP", "OpenShift"
        ]
        
        # Check for title first
        title_match = re.search(r"(?:Job Title|Role|Position|Title):\s*(.*)", jd_text, re.IGNORECASE)
        if title_match:
            job_title = title_match.group(1).strip()
            # Look for tools in the job title
            for tool in TOOLS:
                if tool.lower() in job_title.lower():
                    return tool
        
        # Otherwise look in the entire JD text
        for tool in TOOLS:
            if tool.lower() in jd_text.lower():
                return tool
                
        return "Resume"

    @action(detail=False, methods=['post'], url_path='generate-resume')
    def generate_resume(self, request):
        automation_dir = self._get_automation_path()
        template_path = automation_dir / "templates" / "template.docx"

        try:
            from docxtpl import DocxTemplate
            from docx import Document
            from docx.shared import Pt
            from docx.enum.text import WD_LINE_SPACING, WD_ALIGN_PARAGRAPH

            data = request.data
            # Handle both old (flat object) and new (wrapped object) formats for backward compatibility
            if "resume_data" in data:
                ctx = data.get('resume_data')
                jd_text = data.get('jd_text', '')
            else:
                ctx = data
                jd_text = ""

            # --- Render template into memory ---
            raw_buf = BytesIO()
            doc = DocxTemplate(str(template_path))
            doc.render(ctx)
            doc.save(raw_buf)
            raw_buf.seek(0)

            # --- Post-process: normalize bullets ---
            final_buf = BytesIO()
            d = Document(raw_buf)

            LIST_STYLE_CANDIDATES = {
                "List Bullet", "List Paragraph", "Bullet",
                "List Bullet 2", "List Bullet 3", "Body Text List",
            }
            BULLET_PREFIXES = ("•", "-", "–", "—", "*")

            def tighten(p):
                pf = p.paragraph_format
                pf.space_before = Pt(0)
                pf.space_after = Pt(0)
                pf.line_spacing_rule = WD_LINE_SPACING.SINGLE
                pf.line_spacing = 1
                p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

            def is_list(p):
                try:
                    return p.style and p.style.name in LIST_STYLE_CANDIDATES
                except Exception:
                    return False

            prev_was_list = False
            to_delete = []
            for p in d.paragraphs:
                txt = p.text.strip()
                if txt.startswith(BULLET_PREFIXES):
                    new_text = p.text.lstrip("".join(BULLET_PREFIXES)).lstrip(" \t")
                    p.text = new_text if new_text else ""
                    try:
                        p.style = d.styles["List Bullet"]
                    except KeyError:
                        p.style = d.styles["List Paragraph"]
                if is_list(p):
                    tighten(p)
                    if prev_was_list and txt == "":
                        to_delete.append(p)
                    prev_was_list = True
                else:
                    prev_was_list = False

            for p in to_delete:
                el = p._element
                el.getparent().remove(el)

            for p in d.paragraphs:
                if is_list(p):
                    tighten(p)

            d.save(final_buf)
            content_bytes = final_buf.getvalue()

            # --- EXTRACT TOOL NAME ---
            tool_name = self._extract_important_tool(jd_text)

            # --- SAVE TO LOCAL DISK ---
            try:
                import os
                # Ensure filename is clean
                clean_tool = re.sub(r'[^\w\s-]', '', tool_name).strip()
                file_name = f"{clean_tool}_Ajay_Purshotam_Thota.docx"
                
                # Primary Path: C:\Resumes
                primary_dir = "C:\\Resumes"
                if not os.path.exists(primary_dir):
                    os.makedirs(primary_dir, exist_ok=True)
                
                save_path = os.path.join(primary_dir, file_name)
                with open(save_path, "wb") as f:
                    f.write(content_bytes)
                
                # Success Log
                with open("save_debug.log", "a") as log:
                    log.write(f"[{datetime.datetime.now()}] SUCCESS: Saved to {save_path}\n")
                
            except Exception as se:
                # Capture specific error for user
                with open("save_debug.log", "a") as log:
                    log.write(f"[{datetime.datetime.now()}] ERROR: {str(se)}\n")
                print(f"Error saving resume locally: {se}")

            # --- RETURN IN RESPONSE ---
            response = HttpResponse(
                content_bytes,
                content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )
            response['Content-Disposition'] = f'attachment; filename="{tool_name}_Ajay_Purshotam_Thota.docx"'
            return response

        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=False, methods=['post'], url_path='draft-email')
    def draft_email(self, request):
        jd_text = request.data.get('jd_text', '')
        import re
        import urllib.parse
        import webbrowser
        
        email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', jd_text)
        recipient = email_match.group(0) if email_match else ""
        
        title_match = re.search(r"(?:Job Title|Role|Position|Title):\s*(.*)", jd_text, re.IGNORECASE)
        job_title = title_match.group(1).strip() if title_match else "Java Developer"
        
        subject = f"Interested in {job_title}"
        body = (
            f"Hi,\n\nI am Ajay Purshotam Thota, a Senior Full Stack Java Developer with 11+ years of experience "
            f"designing and delivering enterprise-grade applications. My expertise includes Java, Spring Boot, "
            f"Microservices, REST APIs, SQL/ORM, and CI/CD pipelines, complemented by strong front-end skills "
            f"with React and Angular. I have extensive experience with cloud platforms (AWS, Azure, OpenShift) "
            f"and containerization tools (Docker, Kubernetes), along with hands-on proficiency in messaging "
            f"systems (Kafka, ActiveMQ) and multithreading/concurrency for high-performance solutions. Over the "
            f"years, I have successfully delivered secure, scalable applications across banking, healthcare, "
            f"and e-commerce domains.\n\nI have attached my resume for your review, and I would be glad to discuss "
            f"how my skills and experience align with your team's needs.\n\nBest Regards,\nAjay Purshotam Thota\n"
            f"📧 ajaythota2209@gmail.com\n📞 (314)-648 5540\n\n------------------------------------------------\nReference:\n{jd_text}"
        )
        
        base_url = "https://mail.google.com/mail/?view=cm&fs=1"
        params = {"to": recipient, "cc": "ramya@stemsolllc.com", "su": subject, "body": body}
        query_string = urllib.parse.urlencode(params)
        gmail_url = f"{base_url}&{query_string}"
        
        try:
            webbrowser.open(gmail_url)
        except:
            pass
            
        return Response({"status": "success", "url": gmail_url})

    @action(detail=False, methods=['post'], url_path='linkedin-scrape')
    def linkedin_scrape(self, request):
        kw = request.data.get('keyword', 'Java Developer')
        user = request.user
        if not user.is_authenticated:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

        autom_dir = self._get_automation_path()
        scraper = autom_dir / "linkedin_scraper.py"
        user_id = user.id

        def run_scrape():
            try:
                result = subprocess.run(
                    [sys.executable, str(scraper), kw],
                    capture_output=True, text=True,
                    cwd=str(autom_dir), timeout=60
                )
                if result.returncode == 0:
                    jobs_data = json.loads(result.stdout.strip())
                    # Re-fetch user inside the thread to avoid cross-thread ORM issues
                    thread_user = models.User.objects.get(id=user_id)
                    for job_info in jobs_data:
                        if not models.ScrapedJob.objects.filter(user=thread_user, link=job_info['link']).exists():
                            models.ScrapedJob.objects.create(
                                user=thread_user,
                                title=job_info['title'],
                                company=job_info['company'],
                                location=job_info.get('location', 'Remote'),
                                link=job_info['link'],
                                source=job_info.get('source', 'nvoids'),
                                summary=job_info.get('summary', '')
                            )
            except Exception:
                pass

        threading.Thread(target=run_scrape, daemon=True).start()
        return Response({"status": "scraping_started", "message": "Scraping in background — refresh job discovery shortly"})

class ScrapedJobViewSet(viewsets.ModelViewSet):
    serializer_class = ScrapedJobSerializer
    pagination_class = AngularPagination
    def get_queryset(self):
        if not self.request.user.is_authenticated: return models.ScrapedJob.objects.none()
        return models.ScrapedJob.objects.filter(user=self.request.user).order_by('-scrapedAt')

    @action(detail=True, methods=['post'], url_path='promote')
    def promote_to_job(self, request, pk=None):
        scraped_job = self.get_object()
        job = models.Job.objects.create(
            user=request.user,
            jobTitle=scraped_job.title,
            companyName=scraped_job.company,
            status=models.JobWorkflowStatus.APPLIED
        )
        return Response(JobSerializer(job).data)

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    pagination_class = AngularPagination
    def get_queryset(self):
        if not self.request.user.is_authenticated: return models.User.objects.none()
        return models.User.objects.all() if self.request.user.role == 'ROLE_ADMIN' else models.User.objects.filter(id=self.request.user.id)

    @action(detail=True, methods=['put'], url_path='toggle_role')
    def toggle_role(self, request, pk=None):
        """Admin only: toggle a user between ROLE_USER and ROLE_ADMIN."""
        if request.user.role != 'ROLE_ADMIN':
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object()
        user.role = 'ROLE_USER' if user.role == 'ROLE_ADMIN' else 'ROLE_ADMIN'
        user.save()
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=['post'], url_path='change-password')
    def change_password(self, request, pk=None):
        """Admin only: reset any user's password without needing the old one."""
        if request.user.role != 'ROLE_ADMIN':
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        new_password = request.data.get('new_password', '')
        if len(new_password) < 6:
            return Response({'detail': 'Password must be at least 6 characters.'}, status=status.HTTP_400_BAD_REQUEST)
        user = self.get_object()
        user.set_password(new_password)
        user.save()
        # Invalidate old token so user must re-login with new password
        Token.objects.filter(user=user).delete()
        return Response({'detail': f'Password for {user.username} updated successfully.'})

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

    @action(detail=False, methods=['get'], url_path='overdue')
    def overdue(self, request):
        now = timezone.now().date()
        reminders = models.Reminder.objects.filter(user=request.user, completed=False, dueDate__lt=now)
        return Response(ReminderSerializer(reminders, many=True).data)

    @action(detail=True, methods=['put'], url_path='complete')
    def complete(self, request, pk=None):
        reminder = self.get_object()
        reminder.completed = True
        reminder.save()
        return Response({'status': 'completed'})

class StudySessionViewSet(viewsets.ModelViewSet):
    serializer_class = StudySessionSerializer
    def perform_create(self, serializer): serializer.save(user=self.request.user)
    def get_queryset(self):
        if not self.request.user.is_authenticated: return models.StudySession.objects.none()
        return models.StudySession.objects.filter(user=self.request.user)
