"""
One-time script: migrates local superuser data to production admin account.
Run with: python migrate_to_prod.py
"""
import os, sys, django, json, requests

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_backend.settings')
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from core.models import User, Submission, RTR, Reminder
from core.serializers import SubmissionSerializer, RTRSerializer, ReminderSerializer

PROD = 'https://career-command-center-api.onrender.com/api'

# ── 1. Login to production ────────────────────────────────────────────────────
print("Logging into production...")
r = requests.post(f'{PROD}/auth/login/', json={'username': 'admin', 'password': 'Test@1234'})
if r.status_code != 200:
    print("Login failed:", r.text)
    sys.exit(1)
token = r.json()['token']
headers = {'Authorization': f'Token {token}'}
print(f"Logged in. Token: {token[:12]}...")

# ── 2. Pull local data ────────────────────────────────────────────────────────
local_user = User.objects.get(username='superuser')
subs = list(SubmissionSerializer(Submission.objects.filter(user=local_user), many=True).data)
rtrs = list(RTRSerializer(RTR.objects.filter(user=local_user), many=True).data)
rems = list(ReminderSerializer(Reminder.objects.filter(user=local_user), many=True).data)
print(f"Local data: {len(subs)} submissions, {len(rtrs)} RTRs, {len(rems)} reminders")

# ── 3. Push each record ───────────────────────────────────────────────────────
def push(endpoint, records, name):
    ok = 0
    for rec in records:
        payload = {k: v for k, v in rec.items() if k != 'id'}
        # remove null jobId — API doesn't need it
        payload.pop('jobId', None)
        r = requests.post(f'{PROD}/{endpoint}/', json=payload, headers=headers)
        if r.status_code in (200, 201):
            ok += 1
        else:
            print(f"  WARN {name}: {r.status_code} - {r.text[:120]}")
    print(f"  {name}: {ok}/{len(records)} migrated")

push('submissions', subs, 'Submissions')
push('rtrs',        rtrs, 'RTRs')
push('reminders',   rems, 'Reminders')

print("\nDone! Log into ajaylive.com with admin / password123 to verify your data.")
