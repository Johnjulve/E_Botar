from django.apps import AppConfig


class ElectionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.elections'
    verbose_name = 'Elections & Positions'
    
    def ready(self):
        """Import signals when app is ready"""
        import apps.elections.signals
