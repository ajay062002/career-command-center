"""
Emergency admin creation + full data migration.
Creates a guaranteed-access admin account and reassigns ALL data from every
existing user to that account. Safe to run multiple times (idempotent).
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from rest_framework.authtoken.models import Token

from core.models import User, Job, RTR, Submission, Reminder, StudySession, ScrapedJob

NEW_USERNAME = 'ajay_admin'
NEW_PASSWORD = 'Career@2024'
NEW_EMAIL    = 'ajaythota2209@gmail.com'


class Command(BaseCommand):
    help = 'Create emergency admin and migrate all user data to it'

    @transaction.atomic
    def handle(self, *args, **options):
        # ── 1. Create / update the admin account ──────────────────────────
        admin, created = User.objects.get_or_create(username=NEW_USERNAME)
        admin.email       = NEW_EMAIL
        admin.role        = 'ROLE_ADMIN'
        admin.is_superuser = True
        admin.is_staff     = True
        admin.set_password(NEW_PASSWORD)
        admin.save()
        Token.objects.get_or_create(user=admin)

        action = 'Created' if created else 'Reset password for'
        self.stdout.write(self.style.SUCCESS(f'{action} admin: {NEW_USERNAME}'))

        # ── 2. Reassign ALL records from every other user ──────────────────
        other_users = User.objects.exclude(pk=admin.pk)
        total = other_users.count()
        self.stdout.write(f'Migrating data from {total} other user(s) → {NEW_USERNAME}')

        jobs_moved        = Job.objects.filter(user__in=other_users).update(user=admin)
        rtrs_moved        = RTR.objects.filter(user__in=other_users).update(user=admin)
        subs_moved        = Submission.objects.filter(user__in=other_users).update(user=admin)
        reminders_moved   = Reminder.objects.filter(user__in=other_users).update(user=admin)
        study_moved       = StudySession.objects.filter(user__in=other_users).update(user=admin)
        scraped_moved     = ScrapedJob.objects.filter(user__in=other_users).update(user=admin)

        # Also grab any records with user=NULL
        Job.objects.filter(user__isnull=True).update(user=admin)
        RTR.objects.filter(user__isnull=True).update(user=admin)
        Submission.objects.filter(user__isnull=True).update(user=admin)
        Reminder.objects.filter(user__isnull=True).update(user=admin)
        StudySession.objects.filter(user__isnull=True).update(user=admin)

        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Migration complete:\n'
            f'   Jobs:          {jobs_moved}\n'
            f'   RTRs:          {rtrs_moved}\n'
            f'   Submissions:   {subs_moved}\n'
            f'   Reminders:     {reminders_moved}\n'
            f'   Study Sessions:{study_moved}\n'
            f'   Scraped Jobs:  {scraped_moved}\n'
            f'\n🔑 Login with:\n'
            f'   Username: {NEW_USERNAME}\n'
            f'   Password: {NEW_PASSWORD}\n'
        ))
