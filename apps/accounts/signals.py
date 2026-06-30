from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Role, UserProfile


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created and not hasattr(instance, 'profile'):
        role_name = 'admin' if instance.is_staff else 'client'
        role = Role.objects.get(name=role_name)
        UserProfile.objects.create(user=instance, role=role)
