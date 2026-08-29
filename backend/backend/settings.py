"""
Django settings for E-Botar project.
All configuration is driven by environment variables.
"""

from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
from urllib.parse import urlparse
from corsheaders.defaults import default_headers
import os
import warnings

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables - priority: repo root .env > backend .env
load_dotenv(BASE_DIR.parent / '.env')
load_dotenv(BASE_DIR / '.env', override=True)

# ---------------------------------------------------------------------------
# BASIC SETTINGS
# ---------------------------------------------------------------------------
IS_PRODUCTION = os.getenv('IS_PRODUCTION', 'False').lower() == 'true'
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'

# SECRET KEY
SECRET_KEY = os.getenv('SECRET_KEY')
if not SECRET_KEY:
    if IS_PRODUCTION:
        raise ValueError(
            "SECRET_KEY environment variable must be set in production! "
            "Generate one with: python -c \"from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())\""
        )
    # Fallback for local development only
    SECRET_KEY = 'django-insecure-c^hu1q77a4tnn$dil=sboisr6kk78)&w^99*6l#(_+z^!t&))6'
    warnings.warn(
        "Using insecure default SECRET_KEY. Set SECRET_KEY environment variable for production!",
        UserWarning
    )

# ALLOWED HOSTS - Parse from environment variable
_allowed_hosts_raw = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1,*')
ALLOWED_HOSTS = [host.strip() for host in _allowed_hosts_raw.split(',') if host.strip()]

# ---------------------------------------------------------------------------
# DJANGO REST FRAMEWORK
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "EXCEPTION_HANDLER": "apps.common.http.exception_handlers.media_aware_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "user": os.getenv('THROTTLE_USER', '1000/hour'),
        "vote_submit": os.getenv('THROTTLE_VOTE_SUBMIT', '3/minute'),
        "registration_submit": os.getenv('THROTTLE_REGISTRATION_SUBMIT', '2/minute'),
        "google_auth_submit": os.getenv('THROTTLE_GOOGLE_AUTH_SUBMIT', '10/minute'),
        "application_submit": os.getenv('THROTTLE_APPLICATION_SUBMIT', '6/minute'),
        "program_submit": os.getenv('THROTTLE_PROGRAM_SUBMIT', '15/minute'),
        "program_import": os.getenv('THROTTLE_PROGRAM_IMPORT', '3/minute'),
        "login_submit": os.getenv('THROTTLE_LOGIN_SUBMIT', '10/minute'),
        "receipt_verify": os.getenv('THROTTLE_RECEIPT_VERIFY', '15/minute'),
    },
}

# ---------------------------------------------------------------------------
# JWT SETTINGS
# ---------------------------------------------------------------------------
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=int(os.getenv('JWT_ACCESS_TOKEN_LIFETIME_MINUTES', '30'))
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=int(os.getenv('JWT_REFRESH_TOKEN_LIFETIME_DAYS', '1'))
    ),
}

# ---------------------------------------------------------------------------
# INSTALLED APPS
# ---------------------------------------------------------------------------
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # DRF and third-party
    "rest_framework",
    "corsheaders",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    # Project apps
    "apps.accounts",
    "apps.elections",
    "apps.candidates",
    "apps.voting",
    "apps.common",
]

# Cloudinary - Add if configured
CLOUDINARY_URL = os.getenv('CLOUDINARY_URL', '').strip()
CLOUDINARY_CLOUD_NAME = os.getenv('CLOUDINARY_CLOUD_NAME', '').strip()
USE_CLOUDINARY_MEDIA = bool(CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME)

if USE_CLOUDINARY_MEDIA:
    INSTALLED_APPS += ['cloudinary', 'cloudinary_storage']

# ---------------------------------------------------------------------------
# MIDDLEWARE
# ---------------------------------------------------------------------------
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.gzip.GZipMiddleware',
    'apps.common.http.middleware.DynamicAllowedHostsMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    "corsheaders.middleware.CorsMiddleware",
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'allauth.account.middleware.AccountMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.common.http.middleware.SecurityLoggingMiddleware',
]

# ---------------------------------------------------------------------------
# URLS & TEMPLATES
# ---------------------------------------------------------------------------
ROOT_URLCONF = 'backend.urls'
WSGI_APPLICATION = 'backend.wsgi.application'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'backend' / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# ---------------------------------------------------------------------------
# DATABASE - Universal configuration
# ---------------------------------------------------------------------------
DATABASE_URL = os.getenv('DATABASE_URL')
DATABASE_ENGINE = os.getenv('DATABASE_ENGINE')

if DATABASE_URL:
    parsed = urlparse(DATABASE_URL)

    if DATABASE_ENGINE:
        engine = DATABASE_ENGINE
    else:
        scheme_to_engine = {
            'postgresql': 'django.db.backends.postgresql',
            'postgres': 'django.db.backends.postgresql',
            'mysql': 'django.db.backends.mysql',
            'sqlite': 'django.db.backends.sqlite3',
        }
        engine = scheme_to_engine.get(parsed.scheme, 'django.db.backends.postgresql')

    database_config = {
        'ENGINE': engine,
        'NAME': parsed.path[1:] if parsed.path else os.getenv('DATABASE_NAME', ''),
        'USER': parsed.username or os.getenv('DATABASE_USER', ''),
        'PASSWORD': parsed.password or os.getenv('DATABASE_PASSWORD', ''),
        'HOST': parsed.hostname or os.getenv('DATABASE_HOST', ''),
        'PORT': parsed.port or os.getenv('DATABASE_PORT', ''),
    }

    if 'postgresql' in engine:
        database_config['OPTIONS'] = {
            'sslmode': os.getenv('DATABASE_SSLMODE', 'require'),
        }

    if 'mysql' in engine:
        database_config['OPTIONS'] = {
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        }

    if 'sqlite' in engine:
        database_config['NAME'] = parsed.path[1:] or str(BASE_DIR / 'db.sqlite3')
        database_config.pop('USER', None)
        database_config.pop('PASSWORD', None)
        database_config.pop('HOST', None)
        database_config.pop('PORT', None)

    DATABASES = {'default': database_config}
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# ---------------------------------------------------------------------------
# CACHE
# ---------------------------------------------------------------------------
CACHE_BACKEND = os.getenv('CACHE_BACKEND', 'django.core.cache.backends.locmem.LocMemCache')
CACHES = {
    "default": {
        "BACKEND": CACHE_BACKEND,
        "LOCATION": os.getenv('CACHE_LOCATION', 'unique-ebotar-cache'),
        "TIMEOUT": int(os.getenv('CACHE_TIMEOUT', '300')) if os.getenv('CACHE_TIMEOUT') else None,
        "OPTIONS": {
            "MAX_ENTRIES": int(os.getenv('CACHE_MAX_ENTRIES', '300')),
        },
    }
}

# ---------------------------------------------------------------------------
# AUTHENTICATION
# ---------------------------------------------------------------------------
AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ---------------------------------------------------------------------------
# ALLAUTH & SOCIAL ACCOUNT
# ---------------------------------------------------------------------------
SITE_ID = int(os.getenv("SITE_ID", "1"))

ACCOUNT_UNIQUE_EMAIL = True
ACCOUNT_EMAIL_VERIFICATION = os.getenv('ACCOUNT_EMAIL_VERIFICATION', 'optional')
ACCOUNT_SIGNUP_FIELDS = ["email*", "username*", "password1*", "password2*"]

_registration_domains_raw = os.getenv(
    'REGISTRATION_ALLOWED_EMAIL_DOMAINS',
    'snsu.edu.ph,ssct.edu.ph'
).strip()
REGISTRATION_ALLOWED_EMAIL_DOMAINS = tuple(
    part.strip().lower()
    for part in _registration_domains_raw.replace(';', ',').split(',')
    if part.strip()
) or ('snsu.edu.ph', 'ssct.edu.ph')

SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "SCOPE": ["profile", "email"],
        "AUTH_PARAMS": {"access_type": "online"},
    }
}
SOCIALACCOUNT_LOGIN_ON_GET = True
SOCIALACCOUNT_FORMS = {
    "signup": "apps.accounts.social_forms.GoogleSocialSignupForm",
}

# ---------------------------------------------------------------------------
# INTERNATIONALIZATION
# ---------------------------------------------------------------------------
LANGUAGE_CODE = os.getenv('LANGUAGE_CODE', 'en-us')
TIME_ZONE = os.getenv('TIME_ZONE', 'Asia/Manila')
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# STATIC & MEDIA FILES
# ---------------------------------------------------------------------------
STATIC_URL = os.getenv('STATIC_URL', 'static/')
STATIC_ROOT = os.getenv('STATIC_ROOT', BASE_DIR / 'staticfiles')

MEDIA_URL = os.getenv('MEDIA_URL', '/media/')
MEDIA_ROOT = os.getenv('MEDIA_ROOT', BASE_DIR / 'media')

CLOUDINARY_MEDIA_FOLDER = os.getenv('CLOUDINARY_FOLDER', 'E-Botar').strip()

# Detect PythonAnywhere hosting environment for outbound proxy routing
IS_PYTHONANYWHERE = bool(
    os.getenv('PYTHONANYWHERE_DOMAIN')
    or os.getenv('PYTHONANYWHERE_SITE')
    or 'pythonanywhere' in os.getenv('VIRTUAL_ENV', '').lower()
)

CLOUDINARY_API_PROXY = os.getenv(
    'CLOUDINARY_API_PROXY',
    'http://proxy.server:3128' if IS_PYTHONANYWHERE else None
)

if USE_CLOUDINARY_MEDIA:
    CLOUDINARY_STORAGE = {
        'CLOUD_NAME': CLOUDINARY_CLOUD_NAME,
        'API_KEY': os.getenv('CLOUDINARY_API_KEY', ''),
        'API_SECRET': os.getenv('CLOUDINARY_API_SECRET', ''),
    }
    if CLOUDINARY_API_PROXY:
        CLOUDINARY_STORAGE['API_PROXY'] = CLOUDINARY_API_PROXY

    try:
        import cloudinary
        cloudinary_kwargs = {'secure': True}
        if CLOUDINARY_API_PROXY:
            cloudinary_kwargs['api_proxy'] = CLOUDINARY_API_PROXY

        if CLOUDINARY_URL:
            cloudinary.config(cloudinary_url=CLOUDINARY_URL, **cloudinary_kwargs)
        elif CLOUDINARY_CLOUD_NAME:
            cloudinary.config(
                cloud_name=CLOUDINARY_CLOUD_NAME,
                api_key=os.getenv('CLOUDINARY_API_KEY', ''),
                api_secret=os.getenv('CLOUDINARY_API_SECRET', ''),
                **cloudinary_kwargs
            )
    except Exception:
        pass

    _DEFAULT_FILE_STORAGE_BACKEND = 'apps.common.files.storage.ResilientMediaCloudinaryStorage'
else:
    _DEFAULT_FILE_STORAGE_BACKEND = 'django.core.files.storage.FileSystemStorage'

STORAGES = {
    'default': {
        'BACKEND': _DEFAULT_FILE_STORAGE_BACKEND,
    },
    'staticfiles': {
        'BACKEND': os.getenv('STATICFILES_STORAGE', 'whitenoise.storage.CompressedManifestStaticFilesStorage'),
    },
}

# ---------------------------------------------------------------------------
# VERSIONING
# ---------------------------------------------------------------------------
BACKEND_BASE_URL = os.getenv('BACKEND_BASE_URL', None)
API_VERSION = os.getenv('API_VERSION', 'v1')
BACKEND_VERSION = os.getenv('BACKEND_VERSION', '3.1.0')
MIN_FRONTEND_VERSION = os.getenv('MIN_FRONTEND_VERSION', '3.1.0')

# ---------------------------------------------------------------------------
# DEFAULT PRIMARY KEY
# ---------------------------------------------------------------------------
DEFAULT_AUTO_FIELD = os.getenv('DEFAULT_AUTO_FIELD', 'django.db.models.BigAutoField')

# ---------------------------------------------------------------------------
# CORS CONFIGURATION
# ---------------------------------------------------------------------------
CORS_ALLOW_ALL_ORIGINS = os.getenv('CORS_ALLOW_ALL_ORIGINS', 'True').lower() == 'true'

if not CORS_ALLOW_ALL_ORIGINS:
    CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', '').split(',')

CORS_ALLOW_CREDENTIALS = os.getenv('CORS_ALLOW_CREDENTIALS', 'True').lower() == 'true'
CORS_ALLOW_HEADERS = list(default_headers) + ['x-frontend-version']

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# ---------------------------------------------------------------------------
# SECURITY SETTINGS
# ---------------------------------------------------------------------------
SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'False').lower() == 'true'
SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'False').lower() == 'true' if not IS_PRODUCTION else True
CSRF_COOKIE_SECURE = os.getenv('CSRF_COOKIE_SECURE', 'False').lower() == 'true' if not IS_PRODUCTION else True
SECURE_BROWSER_XSS_FILTER = os.getenv('SECURE_BROWSER_XSS_FILTER', 'True').lower() == 'true'
SECURE_CONTENT_TYPE_NOSNIFF = os.getenv('SECURE_CONTENT_TYPE_NOSNIFF', 'True').lower() == 'true'
X_FRAME_OPTIONS = os.getenv('X_FRAME_OPTIONS', 'DENY')

if os.getenv('SECURE_HSTS_ENABLE', 'False' if not IS_PRODUCTION else 'True').lower() == 'true':
    SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', '31536000'))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = os.getenv('SECURE_HSTS_INCLUDE_SUBDOMAINS', 'True').lower() == 'true'
    SECURE_HSTS_PRELOAD = os.getenv('SECURE_HSTS_PRELOAD', 'True').lower() == 'true'

if os.getenv('SECURE_PROXY_SSL_HEADER', 'False').lower() == 'true':
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

_csrf_origins = os.getenv('CSRF_TRUSTED_ORIGINS', '')
if _csrf_origins:
    CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in _csrf_origins.split(',') if origin.strip()]
elif IS_PRODUCTION and BACKEND_BASE_URL:
    CSRF_TRUSTED_ORIGINS = [BACKEND_BASE_URL]
