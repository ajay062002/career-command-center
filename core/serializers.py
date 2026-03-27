from rest_framework import serializers
from .models import User, Job, Submission, RTR, Reminder, StudySession, ScrapedJob

class ScrapedJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScrapedJob
        fields = '__all__'


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class JobSerializer(serializers.ModelSerializer):
    class Meta:
        model = Job
        fields = '__all__'

class SubmissionSerializer(serializers.ModelSerializer):
    jobId = serializers.PrimaryKeyRelatedField(source='job', queryset=Job.objects.all(), write_only=False, required=False)
    
    class Meta:
        model = Submission
        fields = ['id', 'jobId', 'submissionStatus', 'submissionDate', 'submittedByVendor', 
                  'vendorPhone', 'vendorEmail', 'rateSubmitted', 'followUpDate', 'notes']

class RTRSerializer(serializers.ModelSerializer):
    jobId = serializers.PrimaryKeyRelatedField(source='job', queryset=Job.objects.all(), write_only=False, required=False)

    class Meta:
        model = RTR
        fields = ['id', 'jobId', 'date', 'vendorName', 'vendorCompany', 'clientName', 
                  'vendorPhone', 'vendorEmail', 'rate', 'role', 'location', 'status']

class ReminderSerializer(serializers.ModelSerializer):
    jobId = serializers.PrimaryKeyRelatedField(source='job', queryset=Job.objects.all(), write_only=False, required=False)

    class Meta:
        model = Reminder
        fields = ['id', 'jobId', 'type', 'title', 'dueDate', 'completed', 'notes']

class StudySessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudySession
        fields = '__all__'
