import json
import re
import os
from io import BytesIO
from pathlib import Path

from django.conf import settings
from django.http import HttpResponse, FileResponse, StreamingHttpResponse
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate, login as django_login

# Safe import for Claude (Anthropic)
try:
    import anthropic
except ImportError:
    anthropic = None

from . import models
from .serializers import (UserSerializer, JobSerializer, SubmissionSerializer,
                          RTRSerializer, ReminderSerializer, StudySessionSerializer, ScrapedJobSerializer)
from .pagination import AngularPagination


def home(request):
    return HttpResponse("Command Center Backend is Online")


# ── Auth ──────────────────────────────────────────────────────────────────────

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


# ── Analytics ─────────────────────────────────────────────────────────────────

class AnalyticsViewSet(viewsets.ViewSet):
    def _get_user(self, request):
        user_id = request.query_params.get('userId')
        if user_id and request.user.is_authenticated and request.user.role == 'ROLE_ADMIN':
            return models.User.objects.get(id=user_id)
        return request.user

    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard(self, request):
        user = self._get_user(request)
        if not user.is_authenticated:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
        rtr_count = models.RTR.objects.filter(user=user).count()
        sub_count = models.Submission.objects.filter(user=user).count()
        sub_rate = (sub_count / rtr_count * 100) if rtr_count > 0 else 0
        vendor_set = (
            set(models.RTR.objects.filter(user=user).values_list('vendorCompany', flat=True)) |
            set(models.Submission.objects.filter(user=user).values_list('submittedByVendor', flat=True))
        )
        vendor_count = len([v for v in vendor_set if v])
        return Response({
            'totalJobs': models.Job.objects.filter(user=user).count(),
            'activeSubmissions': sub_count,
            'rtrPending': rtr_count,
            'totalVendors': vendor_count,
            'submissionRate': round(sub_rate, 1),
            'interviewConversions': models.Submission.objects.filter(
                user=user, submissionStatus__in=['INTERVIEW', 'INTERVIEW_SCHEDULED']
            ).count(),
        })


# ── Automation / Resume Builder ───────────────────────────────────────────────

class AutomationViewSet(viewsets.ViewSet):

    # ── Paths ──────────────────────────────────────────────────────────────────

    def _automation_root(self) -> Path:
        """Correct path: <project_root>/backend/automation-service/"""
        return Path(settings.BASE_DIR) / "backend" / "automation-service"

    def _base_content_path(self) -> Path:
        return self._automation_root() / "data" / "base_content.json"

    def _template_path(self) -> Path:
        return self._automation_root() / "reference" / "Ajay Purshotam Thota.docx"

    def _outputs_root(self) -> Path:
        p = Path(settings.BASE_DIR) / "outputs" / "generated_resumes"
        p.mkdir(parents=True, exist_ok=True)
        return p

    # ── Claude AI Tailoring ────────────────────────────────────────────────────

    def _tailor_with_claude(self, jd_text: str, base_content: dict, sections: dict):
        """Call Claude claude-sonnet-4-6 to select and rewrite resume bullets."""
        api_key = os.environ.get('ANTHROPIC_API_KEY') or getattr(settings, 'ANTHROPIC_API_KEY', None)
        if not api_key or not anthropic:
            return None

        client = anthropic.Anthropic(api_key=api_key)

        section_instructions = []
        if sections.get('title'):
            section_instructions.append("- TITLE: Rewrite the job title to best match the JD role.")
        if sections.get('summary'):
            section_instructions.append("- SUMMARY: Select the 5-6 best bullets from the pool that match JD keywords. Lightly rewrite to mirror JD language.")
        if sections.get('td'):
            section_instructions.append("- TD: Select 8-10 best bullets from the TD pool that match JD tech stack.")
        if sections.get('ch'):
            section_instructions.append("- CH: Select 6-8 best bullets from the CH pool that match JD context.")
        if sections.get('env'):
            section_instructions.append("- TD_ENV: List only the tech tools from TD_ENV that appear in the JD, adding any critical JD tools not already listed.")

        prompt = f"""You are an expert technical recruiter and resume writer.

TASK: Tailor Ajay Purshotam Thota's resume for the following Job Description.

JOB DESCRIPTION:
{jd_text[:4000]}

BASE RESUME CONTENT (your bullet pool to select from):
{json.dumps(base_content, indent=2)[:6000]}

SECTIONS TO UPDATE:
{chr(10).join(section_instructions) if section_instructions else "All sections"}

RULES:
1. Only UPDATE sections listed above. Copy others unchanged from base.
2. Do NOT invent new bullets — select and lightly rewrite from the pool only.
3. Match JD keywords and technology names precisely.
4. KEYWORDS: Extract 8-12 technical keywords found in the JD.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{{
  "TITLE": "...",
  "TITLE2": "...",
  "SUMMARY": ["bullet 1", "bullet 2", "..."],
  "TD": ["bullet 1", "..."],
  "CH": ["bullet 1", "..."],
  "TD_ENV": "Java, Spring Boot, ...",
  "CH_ENV": "...",
  "KEYWORDS": ["keyword1", "keyword2", "..."]
}}"""

        try:
            message = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}]
            )
            raw = message.content[0].text.strip()
            # Strip markdown code fences if present
            if "```json" in raw:
                raw = raw.split("```json")[-1].split("```")[0].strip()
            elif "```" in raw:
                raw = raw.split("```")[1].split("```")[0].strip()
            return json.loads(raw)
        except Exception as e:
            print(f"[Claude Error] {e}")
            return None

    # ── Keyword fallback ranking ───────────────────────────────────────────────

    def _rank_bullets(self, pool, keywords, limit=6):
        if not pool:
            return []
        scored = [(sum(3 for kw in keywords if kw.lower() in b.lower()), b) for b in pool]
        scored.sort(key=lambda x: x[0], reverse=True)
        return [b for _, b in scored[:limit]]

    # ── Endpoints ─────────────────────────────────────────────────────────────

    @action(detail=False, methods=['get'], url_path='base-content')
    def base_content(self, request):
        """GET /api/automation/base-content/ — load base_content.json"""
        p = self._base_content_path()
        if not p.exists():
            return Response({'error': f'base_content.json not found at {p}'}, status=404)
        try:
            with open(p, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return Response(data)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=False, methods=['post'], url_path='tailor-sections')
    def tailor_sections(self, request):
        """POST /api/automation/tailor-sections/ — AI or keyword tailoring"""
        jd_text = request.data.get('jd_text', '')
        base_content = request.data.get('base_content', {})
        sections = request.data.get('sections', {})
        use_ai = request.data.get('use_ai', True)

        # Always extract keywords for the match-score chips
        KW_LIST = [
            "Java", "Spring Boot", "Spring", "Microservices", "REST", "Kafka",
            "AWS", "Docker", "Kubernetes", "Angular", "React", "Node.js",
            "PostgreSQL", "MySQL", "Oracle", "Redis", "CI/CD", "Jenkins",
            "TypeScript", "Python", "Hibernate", "JPA", "OAuth", "JWT",
            "GraphQL", "Terraform", "GCP", "Azure", "Elasticsearch"
        ]
        found_keywords = [
            kw for kw in KW_LIST
            if re.search(r'\b' + re.escape(kw) + r'\b', jd_text, re.IGNORECASE)
        ]

        # Try Claude first
        if use_ai:
            ai_data = self._tailor_with_claude(jd_text, base_content, sections)
            if ai_data:
                return Response({
                    'updated': ai_data,
                    'original': base_content,         # send back original for before/after
                    'keywords': ai_data.get('KEYWORDS', found_keywords),
                    'sections_updated': len([k for k in sections if sections.get(k)]),
                    'ai_powered': True,
                    'ai_model': 'claude-sonnet-4-6',
                })

        # Keyword fallback
        updated = {}
        if sections.get('title'):
            updated['TITLE'] = base_content.get('TITLE', '')
        if sections.get('summary'):
            updated['SUMMARY'] = self._rank_bullets(base_content.get('SUMMARY', []), found_keywords, 6)
        if sections.get('td'):
            updated['TD'] = self._rank_bullets(base_content.get('TD', []), found_keywords, 10)
        if sections.get('ch'):
            updated['CH'] = self._rank_bullets(base_content.get('CH', []), found_keywords, 8)
        if sections.get('env'):
            updated['TD_ENV'] = ', '.join(found_keywords) if found_keywords else base_content.get('TD_ENV', '')

        return Response({
            'updated': updated,
            'original': base_content,
            'keywords': found_keywords,
            'sections_updated': len(updated),
            'ai_powered': False,
            'ai_model': 'keyword-fallback',
        })

    @action(detail=False, methods=['post'], url_path='generate-resume')
    def generate_resume(self, request):
        """POST /api/automation/generate-resume/ — render DOCX and stream download"""
        template_path = self._template_path()
        if not template_path.exists():
            return Response({'error': f'Template not found at {template_path}'}, status=404)

        try:
            from docxtpl import DocxTemplate
            from docx import Document
            from docx.shared import Pt
            import datetime

            doc = DocxTemplate(str(template_path))
            raw_ctx = request.data.get('resume_data', {})
            jd_text = request.data.get('jd_text', '')

            # Build rendering context — lists get a _STR companion for templates
            ctx = {}
            for k, v in raw_ctx.items():
                if isinstance(v, list):
                    ctx[k] = v
                    ctx[f"{k}_STR"] = "\n".join(f"• {item}" for item in v)
                else:
                    ctx[k] = v

            doc.render(ctx)
            buf = BytesIO()
            doc.save(buf)
            buf.seek(0)

            # Post-process: tighten spacing
            d = Document(buf)
            for p in d.paragraphs:
                pf = p.paragraph_format
                pf.space_before = Pt(0)
                pf.space_after = Pt(0)
                pf.line_spacing = 1.0

            final_buf = BytesIO()
            d.save(final_buf)

            # Save a copy to outputs
            try:
                ts = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
                out_dir = self._outputs_root() / ts
                out_dir.mkdir(parents=True, exist_ok=True)
                with open(out_dir / "Ajay_Thota_Tailored.docx", 'wb') as f:
                    f.write(final_buf.getvalue())
                with open(out_dir / "job_description.txt", 'w', encoding='utf-8') as f:
                    f.write(jd_text)
            except Exception:
                pass  # archive failure must never block the download

            final_buf.seek(0)
            filename = f"Ajay_Thota_{datetime.datetime.now().strftime('%Y%m%d')}.docx"
            return FileResponse(
                final_buf,
                as_attachment=True,
                filename=filename,
                content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=False, methods=['get'], url_path='list-generations')
    def list_generations(self, request):
        """GET /api/automation/list-generations/ — list archived resumes"""
        out_root = self._outputs_root()
        generations = []
        try:
            for folder in sorted(out_root.iterdir(), reverse=True):
                if folder.is_dir():
                    files = [f.name for f in folder.iterdir() if f.is_file()]
                    generations.append({
                        'id': folder.name,
                        'title': folder.name,
                        'date': int(folder.stat().st_mtime),
                        'files': files,
                    })
        except Exception:
            pass
        return Response(generations)

    @action(detail=False, methods=['get'], url_path='download-generation-file')
    def download_generation_file(self, request):
        """GET /api/automation/download-generation-file/?id=<folder>&file=<name>"""
        folder_id = request.query_params.get('id', '')
        filename = request.query_params.get('file', '')
        if not folder_id or not filename:
            return Response({'error': 'id and file params required'}, status=400)

        file_path = self._outputs_root() / folder_id / filename
        if not file_path.exists():
            return Response({'error': 'File not found'}, status=404)

        # Security: ensure path stays inside outputs
        try:
            file_path.resolve().relative_to(self._outputs_root().resolve())
        except ValueError:
            return Response({'error': 'Forbidden'}, status=403)

        return FileResponse(open(file_path, 'rb'), as_attachment=True, filename=filename)

    @action(detail=False, methods=['post'], url_path='draft-email')
    def draft_email(self, request):
        """POST /api/automation/draft-email/ — generate mailto URL from JD"""
        jd_text = request.data.get('jd_text', '')

        # Extract a job title hint from the JD
        title_match = re.search(r'(?:position|role|title)[:\s]+([^\n.]{5,60})', jd_text, re.IGNORECASE)
        role = title_match.group(1).strip() if title_match else 'Software Engineer'

        subject = f"Application for {role} – Ajay Purshotam Thota"
        body = (
            f"Hi,\n\nI am writing to express my interest in the {role} position.\n\n"
            "Please find my tailored resume attached.\n\n"
            "I look forward to discussing how my background in Java, Spring Boot, Microservices, "
            "Angular, and cloud-native architectures aligns with your team's needs.\n\n"
            "Best regards,\nAjay Purshotam Thota\najaythota2209@gmail.com"
        )

        import urllib.parse
        mailto_url = (
            "mailto:?subject=" + urllib.parse.quote(subject) +
            "&body=" + urllib.parse.quote(body)
        )
        return Response({'url': mailto_url, 'subject': subject})


# ── Standard CRUD ViewSets ────────────────────────────────────────────────────

class ScrapedJobViewSet(viewsets.ModelViewSet):
    serializer_class = ScrapedJobSerializer
    pagination_class = AngularPagination

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return models.ScrapedJob.objects.none()
        return models.ScrapedJob.objects.filter(user=self.request.user).order_by('-scrapedAt')

    @action(detail=True, methods=['post'], url_path='promote')
    def promote_to_job(self, request, pk=None):
        scraped_job = self.get_object()
        job = models.Job.objects.create(
            user=request.user,
            jobTitle=scraped_job.title,
            companyName=scraped_job.company,
            status='APPLIED'
        )
        return Response(JobSerializer(job).data)


class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return models.User.objects.none()
        return models.User.objects.filter(id=self.request.user.id)


class JobViewSet(viewsets.ModelViewSet):
    serializer_class = JobSerializer
    pagination_class = AngularPagination

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return models.Job.objects.none()
        return models.Job.objects.filter(user=self.request.user).order_by('-createdAt')


class SubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = SubmissionSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return models.Submission.objects.none()
        return models.Submission.objects.filter(user=self.request.user).select_related('job')


class RTRViewSet(viewsets.ModelViewSet):
    serializer_class = RTRSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return models.RTR.objects.none()
        return models.RTR.objects.filter(user=self.request.user).select_related('job')


class ReminderViewSet(viewsets.ModelViewSet):
    serializer_class = ReminderSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return models.Reminder.objects.none()
        return models.Reminder.objects.filter(user=self.request.user).select_related('job')


class StudySessionViewSet(viewsets.ModelViewSet):
    serializer_class = StudySessionSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return models.StudySession.objects.none()
        return models.StudySession.objects.filter(user=self.request.user)
