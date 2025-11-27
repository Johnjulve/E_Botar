# Dynamic Host Configuration Guide

E-Botar now supports **dynamic host configuration** that works across multiple platforms (Railway, Heroku, Render, etc.) without code changes. Simply set environment variables!

## Quick Start

### Option 1: Explicit Configuration (Recommended)
Set `ALLOWED_HOSTS` directly - this takes highest priority:

```bash
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com,api.yourdomain.com
```

### Option 2: Platform-Specific Variables
The system automatically detects and uses platform-specific variables:

**Railway:**
```bash
RAILWAY_PUBLIC_DOMAIN=your-app.railway.app
```

**Heroku:**
```bash
HEROKU_APP_NAME=your-app
```

**Render:**
```bash
RENDER_EXTERNAL_HOSTNAME=your-app.onrender.com
```

### Option 3: Generic Variables (Works on Any Platform)
Use these generic variables that work everywhere:

```bash
PUBLIC_DOMAIN=yourdomain.com
# OR
DOMAIN=yourdomain.com
# OR
CUSTOM_DOMAIN=yourdomain.com
# OR
APP_URL=https://yourdomain.com
# OR
SITE_URL=https://yourdomain.com
```

## Configuration Priority

The system checks environment variables in this order:

1. **`ALLOWED_HOSTS`** (highest priority) - Comma-separated list
2. Platform-specific variables (Railway, Heroku, Render)
3. Generic domain variables (`PUBLIC_DOMAIN`, `DOMAIN`, etc.)
4. Dynamic middleware (if no variables set, adds hosts from requests)

## Supported Platforms

### Railway
- Auto-detects: `RAILWAY_PUBLIC_DOMAIN`
- Also supports: `ALLOWED_HOSTS`, `PUBLIC_DOMAIN`, `DOMAIN`, `CUSTOM_DOMAIN`

### Heroku
- Auto-detects: `HEROKU_APP_NAME`
- Also supports: `ALLOWED_HOSTS`, `PUBLIC_DOMAIN`, `DOMAIN`, `CUSTOM_DOMAIN`

### Render
- Auto-detects: `RENDER_EXTERNAL_HOSTNAME`
- Also supports: `ALLOWED_HOSTS`, `PUBLIC_DOMAIN`, `DOMAIN`, `CUSTOM_DOMAIN`

### Any Other Platform
- Use: `ALLOWED_HOSTS`, `PUBLIC_DOMAIN`, `DOMAIN`, `CUSTOM_DOMAIN`, `APP_URL`, `SITE_URL`
- Or set `PORT` environment variable (triggers production mode)

## CORS Configuration

### Frontend URL
Set your frontend URL for CORS:

```bash
FRONTEND_URL=https://your-frontend.railway.app
# OR
FRONTEND_DOMAIN=your-frontend.railway.app
# OR
CLIENT_URL=https://your-frontend.railway.app
```

### Multiple Frontends
If you have multiple frontends, set `FRONTEND_URL` with comma-separated values (or use `ALLOWED_HOSTS` for CORS).

## CSRF Configuration

### Automatic
CSRF trusted origins are automatically configured from:
- `CSRF_TRUSTED_ORIGINS` (explicit, highest priority)
- Platform domains
- Generic domain variables

### Manual Override
```bash
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## Examples

### Example 1: Railway with Custom Domain
```bash
# Railway automatically sets RAILWAY_PUBLIC_DOMAIN
# But you can override with:
CUSTOM_DOMAIN=api.yourdomain.com
FRONTEND_URL=https://app.yourdomain.com
```

### Example 2: Heroku
```bash
# Heroku automatically sets HEROKU_APP_NAME
# Add custom domain:
CUSTOM_DOMAIN=api.yourdomain.com
FRONTEND_URL=https://app.yourdomain.com
```

### Example 3: Generic Platform
```bash
# Works on any platform:
ALLOWED_HOSTS=api.yourdomain.com,www.api.yourdomain.com
FRONTEND_URL=https://app.yourdomain.com
PUBLIC_DOMAIN=api.yourdomain.com
```

### Example 4: Multiple Domains
```bash
# Support multiple domains:
ALLOWED_HOSTS=api.yourdomain.com,api2.yourdomain.com,staging.yourdomain.com
FRONTEND_URL=https://app.yourdomain.com,https://staging-app.yourdomain.com
```

## Dynamic Middleware

If no environment variables are set, the `DynamicAllowedHostsMiddleware` will:
- Automatically add incoming request hosts to `ALLOWED_HOSTS`
- Only works in production mode (when `PORT` is set)
- Safe because cloud platforms handle routing

## Local Development

For local development, defaults are used:
- `ALLOWED_HOSTS`: `['localhost', '127.0.0.1', '0.0.0.0']`
- CORS: Allows all origins
- No CSRF restrictions

## Migration Guide

### From Static Configuration
If you had hardcoded hosts, simply set environment variables:

**Before:**
```python
ALLOWED_HOSTS = ['yourdomain.com']
```

**After:**
```bash
ALLOWED_HOSTS=yourdomain.com
# OR
PUBLIC_DOMAIN=yourdomain.com
```

### From Railway-Specific
If you had Railway-specific code, it now works automatically:

**Before:**
```python
if IS_RAILWAY:
    ALLOWED_HOSTS = [os.environ.get('RAILWAY_PUBLIC_DOMAIN')]
```

**After:**
```bash
# Just set the variable - no code changes needed!
RAILWAY_PUBLIC_DOMAIN=your-app.railway.app
# OR use generic:
PUBLIC_DOMAIN=your-app.railway.app
```

## Troubleshooting

### Host Not Allowed Error
1. Check that `ALLOWED_HOSTS` or domain variables are set
2. Verify the domain matches exactly (no trailing slashes, correct protocol)
3. Check Railway/Heroku/Render logs for the actual domain being used

### CORS Errors
1. Set `FRONTEND_URL` environment variable
2. Ensure it matches your frontend's actual URL
3. Check that CORS credentials are enabled

### CSRF Errors
1. Verify `CSRF_TRUSTED_ORIGINS` includes your domain
2. Check that domain variables are set correctly
3. Ensure HTTPS is used in production

## Best Practices

1. **Use `ALLOWED_HOSTS` for explicit control** - Most reliable
2. **Set `FRONTEND_URL` for CORS** - Prevents CORS warnings
3. **Use platform-specific variables when available** - Automatic detection
4. **Test locally first** - Use same environment variables locally
5. **Document your setup** - Note which variables you're using

## Environment Variable Reference

### Host Configuration
- `ALLOWED_HOSTS` - Comma-separated list (highest priority)
- `PUBLIC_DOMAIN` - Single domain
- `DOMAIN` - Single domain
- `CUSTOM_DOMAIN` - Single domain
- `APP_URL` - Full URL
- `SITE_URL` - Full URL

### Platform-Specific
- `RAILWAY_PUBLIC_DOMAIN` - Railway
- `HEROKU_APP_NAME` - Heroku
- `RENDER_EXTERNAL_HOSTNAME` - Render

### CORS Configuration
- `FRONTEND_URL` - Frontend URL (highest priority)
- `FRONTEND_DOMAIN` - Frontend domain
- `CLIENT_URL` - Client URL

### CSRF Configuration
- `CSRF_TRUSTED_ORIGINS` - Comma-separated list (highest priority)

## Summary

✅ **No code changes needed** - Just set environment variables  
✅ **Works on any platform** - Railway, Heroku, Render, etc.  
✅ **Easy to change** - Update environment variables, redeploy  
✅ **Automatic detection** - Platform-specific variables work automatically  
✅ **Fallback support** - Middleware handles missing configuration  

