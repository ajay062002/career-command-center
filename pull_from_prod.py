"""
Script to pull data from production (ajaylive.com) to local SQLite.
Run with: .venv\Scripts\python.exe pull_from_prod.py
"""
import os
import sys
import django
import requests

# 1. Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_backend.settings')
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from core.models import User, Job, Submission, RTR, Reminder, StudySession, ScrapedJob

PROD = 'https://api.ajaylive.com/api'
# Try credentials from migrate_to_prod script
CREDENTIALS = {'username': 'admin', 'password': 'password123'}

def main():
    print(f"Attempting to log in to {PROD}...")
    r = requests.post(f'{PROD}/auth/login/', json=CREDENTIALS)
    if r.status_code != 200:
        print(f"Login failed: {r.status_code} - {r.text}")
        print("Please check credentials in pull_from_prod.py if you changed your password.")
        return
    
    token = r.json()['token']
    headers = {'Authorization': f'Token {token}'}
    print("Logged in successfully.")

    # Get local superuser to assign data to
    try:
        local_user = User.objects.get(username='admin')
    except User.DoesNotExist:
        local_user = User.objects.first()
        print(f"Local 'admin' not found, using '{local_user.username}' instead.")

    # Helper to fetch all from paginated or non-paginated endpoint
    def fetch_all(endpoint):
        print(f"Fetching {endpoint}...")
        res = requests.get(f'{PROD}/{endpoint}/', headers=headers)
        if res.status_code != 200:
            print(f"  Error fetching {endpoint}: {res.status_code}")
            return []
        data = res.json()
        if isinstance(data, dict) and 'results' in data:
            return data['results']
        return data

    # 1. Jobs (Foundation)
    jobs_data = fetch_all('jobs')
    job_map = {} # remote_id -> local_instance
    for jd in jobs_data:
        # Avoid duplicates
        obj, created = Job.objects.get_or_create(
            user=local_user,
            jobTitle=jd['jobTitle'],
            companyName=jd['companyName'],
            defaults={
                'location': jd.get('location'),
                'jobType': jd.get('jobType'),
                'salaryRange': jd.get('salaryRange'),
                'status': jd.get('status'),
                'description': jd.get('description'),
                'link': jd.get('link'),
                'notes': jd.get('notes'),
            }
        )
        job_map[jd['id']] = obj
    print(f"  Processed {len(jobs_data)} jobs ({len(job_map)} mapped).")

    # 2. Submissions
    subs_data = fetch_all('submissions')
    for sd in subs_data:
        Submission.objects.get_or_create(
            user=local_user,
            job=job_map.get(sd['jobId']), # Assuming jobId is in the response
            appliedDate=sd['appliedDate'],
            defaults={
                'vendor': sd.get('vendor'),
                'portal': sd.get('portal'),
                'notes': sd.get('notes'),
            }
        )
    print(f"  Processed {len(subs_data)} submissions.")

    # 3. RTRs
    rtrs_data = fetch_all('rtrs')
    for rd in rtrs_data:
        RTR.objects.get_or_create(
            user=local_user,
            job=job_map.get(rd['jobId']),
            defaults={
                'vendorName': rd.get('vendorName'),
                'contactPerson': rd.get('contactPerson'),
                'receivedDate': rd.get('receivedDate'),
                'status': rd.get('status'),
                'rate': rd.get('rate'),
                'notes': rd.get('notes'),
            }
        )
    print(f"  Processed {len(rtrs_data)} RTRs.")

    # 4. Reminders
    rems_data = fetch_all('reminders')
    for rd in rems_data:
        Reminder.objects.get_or_create(
            user=local_user,
            title=rd['title'],
            dueDate=rd['dueDate'],
            defaults={
                'job': job_map.get(rd.get('jobId')),
                'description': rd.get('description'),
                'type': rd.get('type', 'FOLLOW_UP'),
                'completed': rd.get('completed', False),
            }
        )
    print(f"  Processed {len(rems_data)} reminders.")

    # 5. Study Sessions
    study_data = fetch_all('study-sessions')
    for sd in study_data:
        StudySession.objects.get_or_create(
            user=local_user,
            topic=sd['topic'],
            startTime=sd['startTime'],
            defaults={
                'durationMinutes': sd.get('durationMinutes', 0),
                'notes': sd.get('notes'),
            }
        )
    print(f"  Processed {len(study_data)} study sessions.")

    print("\nData migration from production to local complete!")

if __name__ == '__main__':
    main()
