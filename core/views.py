import json
import re
import os
import datetime
import urllib.parse
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

        week_start = timezone.now().date() - datetime.timedelta(days=7)
        study_minutes = models.StudySession.objects.filter(
            user=user, date__gte=week_start
        ).aggregate(total=Sum('timeSpentMinutes'))['total'] or 0

        overdue_count = models.Reminder.objects.filter(
            user=user, completed=False, dueDate__lt=timezone.now().date()
        ).count()

        data = {
            'totalJobs': models.Job.objects.filter(user=user).count(),
            'activeSubmissions': sub_count,
            'rtrPending': rtr_count,
            'offers': models.Job.objects.filter(user=user, status='OFFER').count(),
            'rejected': models.Job.objects.filter(user=user, status='REJECTED').count(),
            'studyMinutesThisWeek': study_minutes,
            'overdueReminders': overdue_count,
            'totalVendors': vendor_count,
            'submissionRate': round(sub_rate, 1),
            'interviewConversions': models.Submission.objects.filter(
                user=user, submissionStatus__in=['INTERVIEW', 'INTERVIEW_SCHEDULED']
            ).count(),
        }
        if request.user.role == 'ROLE_ADMIN':
            data['totalUsers'] = models.User.objects.count()
        return Response(data)

    @action(detail=False, methods=['get'], url_path='jobs-by-status')
    def jobs_by_status(self, request):
        user = self._get_user(request)
        if not user.is_authenticated:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
        counts = (
            models.Job.objects.filter(user=user)
            .values('status')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        return Response([{'status': r['status'], 'count': r['count']} for r in counts])

    @action(detail=False, methods=['get'], url_path='study-trend')
    def study_trend(self, request):
        user = self._get_user(request)
        if not user.is_authenticated:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
        week_start = timezone.now().date() - datetime.timedelta(days=6)
        rows = (
            models.StudySession.objects.filter(user=user, date__gte=week_start)
            .values('date')
            .annotate(totalMinutes=Sum('timeSpentMinutes'))
            .order_by('date')
        )
        return Response([{'date': str(r['date']), 'totalMinutes': r['totalMinutes'] or 0} for r in rows])

    @action(detail=False, methods=['get'], url_path='rtr-timeline')
    def rtr_timeline(self, request):
        user = self._get_user(request)
        if not user.is_authenticated:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
        week_start = timezone.now().date() - datetime.timedelta(days=6)
        rtr_map = {
            str(r['date']): r['count']
            for r in models.RTR.objects.filter(user=user, date__gte=week_start)
            .values('date').annotate(count=Count('id'))
        }
        sub_map = {
            str(r['submissionDate']): r['count']
            for r in models.Submission.objects.filter(user=user, submissionDate__gte=week_start)
            .values('submissionDate').annotate(count=Count('id'))
        }
        all_dates = sorted(set(rtr_map) | set(sub_map))
        return Response([
            {'date': d, 'rtrs': rtr_map.get(d, 0), 'submissions': sub_map.get(d, 0)}
            for d in all_dates
        ])

    @action(detail=False, methods=['get'], url_path='vendor-performance')
    def vendor_performance(self, request):
        user = self._get_user(request)
        if not user.is_authenticated:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
        vendors = (
            models.RTR.objects.filter(user=user)
            .values('vendorCompany').annotate(totalRtrs=Count('id')).order_by('-totalRtrs')
        )
        result = []
        for v in vendors:
            company = v['vendorCompany']
            if not company:
                continue
            subs = models.Submission.objects.filter(user=user, submittedByVendor=company).count()
            interviews = models.Submission.objects.filter(
                user=user, submittedByVendor=company,
                submissionStatus__in=['INTERVIEW', 'INTERVIEW_SCHEDULED']
            ).count()
            result.append({
                'vendorCompany': company,
                'totalRtrs': v['totalRtrs'],
                'totalSubmissions': subs,
                'interviewsOrOffers': interviews,
            })
        return Response(result)


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

        prompt = f"""You are a senior resume writer specializing in enterprise banking and healthcare clients (TD Bank, Cardinal Health, etc.).

TASK: Tailor Ajay Purshotam Thota's resume for the following Job Description.

JOB DESCRIPTION:
{jd_text[:4000]}

BASE RESUME CONTENT (your bullet pool — select and rewrite from this only):
{json.dumps(base_content, indent=2)[:6000]}

SECTIONS TO UPDATE:
{chr(10).join(section_instructions) if section_instructions else "All sections"}

STRICT OUTPUT REQUIREMENTS:
- SUMMARY: exactly 25 points — strong, ATS-optimized, covers full-stack, microservices, APIs, cloud
- TD (TD Bank experience): exactly 30 points — senior-level, real production tone
  * First 4 points: generic Senior Java Full Stack / API Engineer points, reusable across any project
  * Remaining 26: heavy focus on REST APIs (primary) and GraphQL (secondary), banking/payment systems context
  * Naturally weave in: Java, Spring Boot, REST, GraphQL, Microservices, API security, resilience patterns, CI/CD (Jenkins), Git, JUnit, Cucumber, Azure
  * Write about: failure handling, latency, API contracts, schema evolution, real problems solved
- CH (Cardinal Health experience): exactly 30 points — healthcare/capital markets context, same quality level
- TD_ENV / CH_ENV: comma-separated tech stacks for each company matched to JD

WRITING RULES (MANDATORY):
- Each point must be 2-3 lines, detailed, not short one-liners
- No numbering, no bullet characters, no headings in the text
- Strong senior-level tone — avoid "worked on", "responsible for", "helped with"
- Every point introduces a new concept — zero repetition
- Mix: design, development, performance tuning, security, testing, deployment, troubleshooting
- Use real engineering language: mention specific patterns, tools, decisions, outcomes
- Banking context for TD: payment processing, transaction APIs, PCI compliance, financial data
- Healthcare context for CH: pharmacy systems, supply chain APIs, healthcare data, HIPAA

KEYWORDS: Extract 8-12 technical keywords from the JD.

Return ONLY a valid JSON object, no markdown, no explanation:
{{
  "TITLE": "...",
  "TITLE2": "...",
  "SUMMARY": ["point 1", "point 2", "... 25 total"],
  "TD": ["point 1", "... 30 total"],
  "CH": ["point 1", "... 30 total"],
  "TD_ENV": "Java, Spring Boot, ...",
  "CH_ENV": "...",
  "KEYWORDS": ["keyword1", "..."]
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
            updated['SUMMARY'] = self._rank_bullets(base_content.get('SUMMARY', []), found_keywords, 25)
        if sections.get('td'):
            updated['TD'] = self._rank_bullets(base_content.get('TD', []), found_keywords, 30)
        if sections.get('ch'):
            updated['CH'] = self._rank_bullets(base_content.get('CH', []), found_keywords, 30)
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

    def _repair_template(self, src_path: Path) -> Path:
        """
        Fix DOCX templates where Word has split Jinja2 tags across multiple XML runs.
        Returns path to a temporary repaired copy.
        """
        import zipfile, tempfile, shutil
        from lxml import etree

        tmp = Path(tempfile.mktemp(suffix='.docx'))
        shutil.copy2(str(src_path), str(tmp))

        WNS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

        with zipfile.ZipFile(str(tmp), 'r') as z:
            all_files = {n: z.read(n) for n in z.namelist()}

        xml_bytes = all_files.get('word/document.xml', b'')
        tree = etree.fromstring(xml_bytes)

        # Pass 1: merge broken Jinja2 tags (Word splits {{ }} across XML runs)
        endfor_count = 0
        for para in tree.iter(f'{{{WNS}}}p'):
            t_elems = para.findall(f'.//{{{WNS}}}t')
            combined = ''.join((t.text or '') for t in t_elems)

            if '{{' not in combined and '{%' not in combined:
                continue

            runs = para.findall(f'.//{{{WNS}}}r')
            if not runs:
                continue

            first_run = runs[0]
            first_t_elems = first_run.findall(f'{{{WNS}}}t')

            if first_t_elems:
                first_t_elems[0].text = combined
                first_t_elems[0].set(
                    '{http://www.w3.org/XML/1998/namespace}space', 'preserve'
                )
                for t in first_t_elems[1:]:
                    first_run.remove(t)
            else:
                t_new = etree.SubElement(first_run, f'{{{WNS}}}t')
                t_new.text = combined
                t_new.set(
                    '{http://www.w3.org/XML/1998/namespace}space', 'preserve'
                )

            for child in list(para):
                tag = etree.QName(child.tag).localname
                if tag in ('r', 'proofErr', 'bookmarkStart', 'bookmarkEnd') and child is not first_run:
                    para.remove(child)

            if '{% endfor %}' in combined:
                endfor_count += 1

        # Pass 2: fix missing {% for b in CH %} — the template has endfor for CH
        # but is missing its for opener. Prepend it to the second endfor paragraph.
        endfor_seen = 0
        for para in tree.iter(f'{{{WNS}}}p'):
            t_elems = para.findall(f'.//{{{WNS}}}t')
            combined = ''.join((t.text or '') for t in t_elems)
            if '{% endfor %}' not in combined:
                continue
            endfor_seen += 1
            if endfor_seen == 2:
                # This is the CH endfor paragraph — prepend the missing for tag
                first_t = para.find(f'.//{{{WNS}}}t')
                if first_t is not None and '{% for b in CH %}' not in (first_t.text or ''):
                    first_t.text = '{% for b in CH %}' + (first_t.text or '')
                break

        fixed_xml = etree.tostring(tree, xml_declaration=True, encoding='UTF-8', standalone=True)
        all_files['word/document.xml'] = fixed_xml

        with zipfile.ZipFile(str(tmp), 'w', zipfile.ZIP_DEFLATED) as zout:
            for name, data in all_files.items():
                zout.writestr(name, data)

        return tmp

    @action(detail=False, methods=['post'], url_path='generate-resume')
    def generate_resume(self, request):
        """POST /api/automation/generate-resume/ — render DOCX and stream download"""
        template_path = self._template_path()
        if not template_path.exists():
            return Response({'error': f'Template not found at {template_path}'}, status=404)

        repaired_path = None
        try:
            from docxtpl import DocxTemplate
            from docx import Document
            from docx.shared import Pt

            # Repair broken Jinja2 tags in the template XML
            repaired_path = self._repair_template(template_path)

            doc = DocxTemplate(str(repaired_path))
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
        finally:
            # Always clean up the temp repaired file
            if repaired_path and repaired_path.exists():
                try:
                    repaired_path.unlink()
                except Exception:
                    pass

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

    @action(detail=False, methods=['get'], url_path='overdue')
    def overdue(self, request):
        if not request.user.is_authenticated:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
        qs = models.Reminder.objects.filter(
            user=request.user,
            completed=False,
            dueDate__lt=timezone.now().date()
        ).select_related('job')
        return Response(ReminderSerializer(qs, many=True).data)

    @action(detail=True, methods=['put', 'patch'], url_path='complete')
    def complete(self, request, pk=None):
        reminder = self.get_object()
        reminder.completed = True
        reminder.save()
        return Response(ReminderSerializer(reminder).data)


class StudySessionViewSet(viewsets.ModelViewSet):
    serializer_class = StudySessionSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return models.StudySession.objects.none()
        return models.StudySession.objects.filter(user=self.request.user)
