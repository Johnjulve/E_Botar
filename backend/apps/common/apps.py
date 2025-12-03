from django.apps import AppConfig


class CommonConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.common'
    verbose_name = 'Common Services'
    
    def ready(self):
        """Import signal handlers when app is ready"""
        import apps.common.middleware  # noqa

