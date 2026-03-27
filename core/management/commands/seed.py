from django.core.management.base import BaseCommand
from core.models import User

class Command(BaseCommand):
    help = 'Seeds initial users'

    def handle(self, *args, **options):
        # Create Admin
        if not User.objects.filter(username='admin').exists():
            admin = User.objects.create_superuser(
                username='admin',
                password='password123',
                email='admin@stemsheetz.com'
            )
            admin.role = 'ROLE_ADMIN'
            admin.save()
            self.stdout.write(self.style.SUCCESS('Successfully created admin user'))

        # Create Standard User
        if not User.objects.filter(username='user1').exists():
            user1 = User.objects.create_user(
                username='user1',
                password='password123',
                email='user1@stemsheetz.com'
            )
            user1.role = 'ROLE_USER'
            user1.save()
            self.stdout.write(self.style.SUCCESS('Successfully created user1 user'))
