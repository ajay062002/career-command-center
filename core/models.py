import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=50, default='ROLE_USER') # ROLE_USER, ROLE_ADMIN

    def __str__(self):
        return self.username

class WorkMode(models.TextChoices):
    REMOTE = 'REMOTE', 'Remote'
    HYBRID = 'HYBRID', 'Hybrid'
    ONSITE = 'ONSITE', 'Onsite'

class JobWorkflowStatus(models.TextChoices):
    APPLIED = 'APPLIED', 'Applied'
    RTR_SENT = 'RTR_SENT', 'RTR Sent'
    RTR_PENDING = 'RTR_PENDING', 'RTR Pending'
    SUBMITTED = 'SUBMITTED', 'Submitted'
    SCREENING = 'SCREENING', 'Screening'
    INTERVIEWING = 'INTERVIEWING', 'Interviewing'
    OFFER = 'OFFER', 'Offer'
    REJECTED = 'REJECTED', 'Rejected'
    ON_HOLD = 'ON_HOLD', 'On Hold'
    CLOSED = 'CLOSED', 'Closed'

class Job(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    jobTitle = models.CharField(max_length=255)
    companyName = models.CharField(max_length=255)
    vendorCompany = models.CharField(max_length=255, null=True, blank=True)
    vendorContactName = models.CharField(max_length=255, null=True, blank=True)
    vendorContactEmail = models.CharField(max_length=255, null=True, blank=True)
    location = models.CharField(max_length=255, null=True, blank=True)
    workMode = models.CharField(max_length=20, choices=WorkMode.choices, null=True, blank=True)
    status = models.CharField(max_length=20, choices=JobWorkflowStatus.choices, null=True, blank=True)
    appliedDate = models.DateField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name='jobs')
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.jobTitle} at {self.companyName}"

class SubmissionStatus(models.TextChoices):
    SUBMITTED = 'SUBMITTED', 'Submitted'
    SCREENING = 'SCREENING', 'Screening'
    INTERVIEW = 'INTERVIEW', 'Interview'
    INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED', 'Interview Scheduled'
    REJECTED = 'REJECTED', 'Rejected'
    WITHDRAWN = 'WITHDRAWN', 'Withdrawn'

class Submission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submissionStatus = models.CharField(max_length=30, choices=SubmissionStatus.choices)
    submissionDate = models.DateField(null=True, blank=True)
    submittedByVendor = models.CharField(max_length=255, null=True, blank=True)
    vendorPhone = models.CharField(max_length=50, null=True, blank=True)
    vendorEmail = models.EmailField(null=True, blank=True)
    rateSubmitted = models.CharField(max_length=100, null=True, blank=True)
    followUpDate = models.DateField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name='submissions')
    job = models.ForeignKey(Job, on_delete=models.SET_NULL, null=True, related_name='submissions')

class RTR(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date = models.DateField(null=True, blank=True)
    vendorName = models.CharField(max_length=255, null=True, blank=True)
    vendorCompany = models.CharField(max_length=255, null=True, blank=True)
    clientName = models.CharField(max_length=255, null=True, blank=True)
    vendorPhone = models.CharField(max_length=50, null=True, blank=True)
    vendorEmail = models.EmailField(null=True, blank=True)
    rate = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    role = models.CharField(max_length=255, null=True, blank=True)
    location = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=100, null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name='rtrs')
    job = models.ForeignKey(Job, on_delete=models.SET_NULL, null=True, related_name='rtrs')

class ReminderType(models.TextChoices):
    FOLLOW_UP = 'FOLLOW_UP', 'Follow Up'
    INTERVIEW = 'INTERVIEW', 'Interview'
    STUDY = 'STUDY', 'Study'
    TASK = 'TASK', 'Task'

class Reminder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    type = models.CharField(max_length=20, choices=ReminderType.choices)
    title = models.CharField(max_length=255)
    dueDate = models.DateField(null=True, blank=True)
    completed = models.BooleanField(default=False)
    notes = models.TextField(null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name='reminders')
    job = models.ForeignKey(Job, on_delete=models.SET_NULL, null=True, related_name='reminders')

class StudySession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date = models.DateField(null=True, blank=True)
    topic = models.CharField(max_length=255, null=True, blank=True)
    timeSpentMinutes = models.IntegerField(null=True, blank=True)
    source = models.CharField(max_length=255, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name='study_sessions')
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

class ScrapedJob(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    company = models.CharField(max_length=255)
    location = models.CharField(max_length=255, null=True, blank=True)
    link = models.URLField(max_length=500)
    summary = models.TextField(null=True, blank=True)
    source = models.CharField(max_length=50, default='nvoids')
    scrapedAt = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='scraped_jobs')
