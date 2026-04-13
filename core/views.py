# -*- coding: utf-8 -*-
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


# Auth
# ------------------------------------------------------------------------------

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


# Analytics
# ------------------------------------------------------------------------------

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


# Automation / Resume Builder
# ------------------------------------------------------------------------------

class AutomationViewSet(viewsets.ViewSet):

    # Paths
    # --------------------------------------------------------------------------

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

    # Claude AI Tailoring
    # --------------------------------------------------------------------------

    def _tailor_with_claude(self, jd_text: str, base_content: dict, _sections: dict):
        """Call Claude claude-sonnet-4-6 to select and rewrite resume bullets."""
        api_key = os.environ.get('ANTHROPIC_API_KEY') or getattr(settings, 'ANTHROPIC_API_KEY', None)
        if not api_key or not anthropic:
            return None

        client = anthropic.Anthropic(api_key=api_key)

        # Pre-extract title hint from JD to inject as a concrete signal
        import re as _re
        title_hint = ''
        for pattern in [
            r'(?:job title|position|role|title)[:\s]+([^\n.]{4,60})',
            r'^([A-Z][A-Za-z /\-]+(?:Developer|Engineer|Architect|Lead|Manager|Analyst|Consultant|Specialist))',
        ]:
            m = _re.search(pattern, jd_text[:2000], _re.IGNORECASE | _re.MULTILINE)
            if m:
                title_hint = m.group(1).strip()
                break

        # Detect AI/ML/NLP in JD for the 12-reference cap instruction
        has_ai = bool(_re.search(r'\b(AI|ML|machine learning|NLP|LLM|deep learning|neural|GPT)\b',
                                  jd_text[:6000], _re.IGNORECASE))

        prompt = f"""Act as a senior resume writer and ATS optimization expert.

Generate a highly tailored resume in JSON format based on the given Job Description (JD).

STRICT RULES:

1. ONLY update the following sections:
   - TD Bank (key: "TD")
   - Cardinal Health (key: "CH")
   - TITLE, TITLE2, SUMMARY, TD_ENV, CH_ENV

2. Each experience section (TD and CH) must contain EXACTLY 36 points.
   - Each point must be 2-3 lines long (2-3 full sentences)
   - Write in paragraph style (NO bullets, NO numbering, NO hyphens at start)
   - Use strong action verbs and achievement-based phrasing
   - Do NOT repeat any concept across the 36 points

3. KEYWORD OPTIMIZATION (VERY IMPORTANT):
   - Identify the most important keywords from the JD (Java, Spring Boot, Microservices, AWS, Kubernetes, APIs, Kafka, REST, CI/CD, etc.)
   - EACH important JD keyword must appear at least 10 times within each 36-point section
   - Distribute keywords naturally across different points — do NOT cluster them
   - Flow must read naturally — never mechanical keyword stuffing

4. SUMMARY SECTION:
   - First 4 points = strong reusable base (generic senior-level, 10+ years profile)
   - Remaining points = tightly tailored to this specific JD
   - Every point 2-3 sentences, senior tone, ATS-rich with JD keywords

5. ROLE ALIGNMENT — TITLE EXTRACTION (DO THIS FIRST):
   Scan the JD. Find the EXACT job title the employer posted.
   {'Pre-extracted hint: "' + title_hint + '" — verify this matches the JD or find the exact string.' if title_hint else 'No hint available — scan the JD yourself for the exact posted title.'}
   - TITLE = EXACT job title from JD, word for word, same capitalisation
   - TITLE2 = same title or minor variant (e.g. drop "Senior" if it appears twice)
   - NEVER paraphrase. If JD says "Java Backend Engineer" output "Java Backend Engineer"
   - NEVER default to "Senior Full Stack Developer" unless the JD says EXACTLY that

6. TECH FOCUS — emphasize these when present in JD:
   - Backend development (Java, Spring Boot)
   - Microservices architecture
   - REST API design and GraphQL
   - Cloud (AWS preferred, Azure/GCP if in JD)
   - Distributed systems and event-driven architecture
   - CI/CD pipelines, Docker, Kubernetes
   - Apache Kafka (if present in JD)
   - Spring Security, OAuth2, JWT

7. AI/ML/NLP:
   {'- JD MENTIONS AI/ML/NLP — include up to 12 references naturally across TD and CH combined. Do not exceed 12.' if has_ai else '- JD does not mention AI/ML — do not add AI/ML content.'}

8. ENVIRONMENT BLOCKS:
   - TD_ENV: comma-separated tech stack for TD Bank role — include every tool from the JD plus standard Java enterprise stack
   - CH_ENV: same format for Cardinal Health role — healthcare-specific tools plus JD stack
   - Both must be comprehensive, not minimal

9. OUTPUT FORMAT — STRICT JSON, no markdown, no explanation, no extra text:
   Return ONLY this structure:
   {{
     "TITLE": "<exact job title from JD>",
     "TITLE2": "<same or minor variant>",
     "SUMMARY": ["point 1", "point 2", "..."],
     "TD": ["point 1", "point 2", "... exactly 36 items"],
     "CH": ["point 1", "point 2", "... exactly 36 items"],
     "TD_ENV": "Java, Spring Boot, ...",
     "CH_ENV": "Java, Spring Boot, ...",
     "KEYWORDS": ["keyword1", "keyword2", "... 8-12 items"]
   }}

10. DO NOT:
    - Add explanations or commentary outside the JSON
    - Add extra sections beyond what is listed above
    - Break the JSON format
    - Reduce TD or CH below 36 points
    - Use bullet characters (•, -, *) inside point text

BASE CONTENT POOL (use as inspiration and starting material — expand and rewrite to reach 36 points each):
{json.dumps(base_content, indent=2)[:9000]}

JOB DESCRIPTION:
{jd_text[:6000]}

OUTPUT:
Valid JSON only."""

        try:
            message = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=16000,
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

    # Keyword fallback ranking
    # --------------------------------------------------------------------------

    def _rank_bullets(self, pool, keywords, limit=6):
        if not pool:
            return []
        scored = [(sum(3 for kw in keywords if kw.lower() in b.lower()), b) for b in pool]
        scored.sort(key=lambda x: x[0], reverse=True)
        return [b for _, b in scored[:limit]]

    # Endpoints
    # --------------------------------------------------------------------------

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
            updated['TD'] = self._rank_bullets(base_content.get('TD', []), found_keywords, 36)
        if sections.get('ch'):
            updated['CH'] = self._rank_bullets(base_content.get('CH', []), found_keywords, 36)
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

        # Pass 2: fix missing {% for b in CH %}.
        # Append {% for b in CH %} as a new run on the paragraph BEFORE the CH bullet paragraph.
        endfor_seen = 0
        all_body_paras = list(tree.iter(f'{{{WNS}}}p'))
        for idx, para in enumerate(all_body_paras):
            t_elems = para.findall(f'.//{{{WNS}}}t')
            combined = ''.join((t.text or '') for t in t_elems)
            if '{% endfor %}' not in combined:
                continue
            endfor_seen += 1
            if endfor_seen == 2 and '{% for b in CH %}' not in combined:
                if idx > 0:
                    prev_para = all_body_paras[idx - 1]
                    new_run = etree.SubElement(prev_para, f'{{{WNS}}}r')
                    new_t = etree.SubElement(new_run, f'{{{WNS}}}t')
                    new_t.text = '{% for b in CH %}'
                    new_t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
                break

        # Pass 3: Fix TD bullet paragraph to exactly match CH (ListParagraph + numPr, no bold, no •)
        # No line-break manipulation — that was breaking the docxtpl for-loop.
        import re as _re
        endfor_p3 = 0
        for para in tree.iter(f'{{{WNS}}}p'):
            t_elems = para.findall(f'.//{{{WNS}}}t')
            combined = ''.join((t.text or '') for t in t_elems)

            if '{% endfor %}' not in combined:
                continue
            endfor_p3 += 1
            if endfor_p3 != 1:
                break  # only fix the first endfor = TD bullet paragraph

            # Completely replace pPr to mirror CH bullet para 72:
            #   <w:pStyle val="ListParagraph"/>
            #   <w:numPr><w:ilvl val="0"/><w:numId val="29"/></w:numPr>
            old_pPr = para.find(f'{{{WNS}}}pPr')
            if old_pPr is not None:
                para.remove(old_pPr)

            new_pPr = etree.Element(f'{{{WNS}}}pPr')
            pStyle_el = etree.SubElement(new_pPr, f'{{{WNS}}}pStyle')
            pStyle_el.set(f'{{{WNS}}}val', 'ListParagraph')
            numPr_el = etree.SubElement(new_pPr, f'{{{WNS}}}numPr')
            ilvl_el = etree.SubElement(numPr_el, f'{{{WNS}}}ilvl')
            ilvl_el.set(f'{{{WNS}}}val', '0')
            numId_val = etree.SubElement(numPr_el, f'{{{WNS}}}numId')
            numId_val.set(f'{{{WNS}}}val', '29')
            pPr_rPr = etree.SubElement(new_pPr, f'{{{WNS}}}rPr')
            rFonts_el = etree.SubElement(pPr_rPr, f'{{{WNS}}}rFonts')
            rFonts_el.set(f'{{{WNS}}}cstheme', 'minorHAnsi')
            etree.SubElement(pPr_rPr, f'{{{WNS}}}bCs')
            sz_el = etree.SubElement(pPr_rPr, f'{{{WNS}}}sz')
            sz_el.set(f'{{{WNS}}}val', '22')
            para.insert(0, new_pPr)

            # Fix run: remove bold + strip leading bullet character (•, ●, -, ▪)
            run = para.find(f'.//{{{WNS}}}r')
            if run is not None:
                rPr = run.find(f'{{{WNS}}}rPr')
                if rPr is not None:
                    for bold_tag in (f'{{{WNS}}}b', f'{{{WNS}}}bCs'):
                        b_el = rPr.find(bold_tag)
                        if b_el is not None:
                            rPr.remove(b_el)
                t = run.find(f'{{{WNS}}}t')
                if t is not None and t.text:
                    t.text = _re.sub(r'^[^\w{]+', '', t.text)
            break

        # Pass 4: Strip all underlines from every run in the document
        for run in tree.iter(f'{{{WNS}}}r'):
            rPr = run.find(f'{{{WNS}}}rPr')
            if rPr is not None:
                u_el = rPr.find(f'{{{WNS}}}u')
                if u_el is not None:
                    rPr.remove(u_el)

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

            # Save a copy to server outputs
            ts = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
            try:
                out_dir = self._outputs_root() / ts
                out_dir.mkdir(parents=True, exist_ok=True)
                with open(out_dir / "Ajay_Thota_Tailored.docx", 'wb') as f:
                    f.write(final_buf.getvalue())
                with open(out_dir / "job_description.txt", 'w', encoding='utf-8') as f:
                    f.write(jd_text)
            except Exception:
                pass  # archive failure must never block the download

            # Also save to C:\Resumes\{title}\Ajay_Thota_{timestamp}.docx
            try:
                title_val = (raw_ctx.get('TITLE') or 'Resume').strip()
                safe_title = re.sub(r'[<>:"/\\|?*\n\r]', '_', title_val)[:80].strip('_ ')
                c_dir = Path('C:/Resumes') / (safe_title or 'Resume')
                c_dir.mkdir(parents=True, exist_ok=True)
                c_path = c_dir / f'Ajay_Thota_{ts}.docx'
                with open(c_path, 'wb') as f:
                    f.write(final_buf.getvalue())
            except Exception:
                pass  # local save failure must never block download

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


# Standard CRUD ViewSets
# ------------------------------------------------------------------------------

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
