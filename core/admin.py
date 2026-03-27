from django.contrib import admin
from .models import User, Job, Submission, RTR, Reminder, StudySession

admin.site.register(User)
admin.site.register(Job)
admin.site.register(Submission)
admin.site.register(RTR)
admin.site.register(Reminder)
admin.site.register(StudySession)
