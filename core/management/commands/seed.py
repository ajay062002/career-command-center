import os
from django.core.management.base import BaseCommand
from core.models import User
from rest_framework.authtoken.models import Token


class Command(BaseCommand):
    help = 'Seeds initial users'

    def handle(self, *args, **options):
        admin_password = os.environ.get('ADMIN_PASSWORD', 'password123')

        # Always ensure admin exists with correct password and role
        admin, created = User.objects.get_or_create(
            username='admin',
            defaults={'email': 'admin@stemsheetz.com'}
        )
        admin.set_password(admin_password)
        admin.role = 'ROLE_ADMIN'
        admin.is_superuser = True
        admin.is_staff = True
        admin.save()
        Token.objects.get_or_create(user=admin)
        action = 'Created' if created else 'Updated'
        self.stdout.write(self.style.SUCCESS(f'{action} admin user'))

        # Create standard user if missing
        if not User.objects.filter(username='user1').exists():
            user1 = User.objects.create_user(
                username='user1',
                password='password123',
                email='user1@stemsheetz.com'
            )
            user1.role = 'ROLE_USER'
            user1.save()
            Token.objects.get_or_create(user=user1)
            self.stdout.write(self.style.SUCCESS('Created user1'))
