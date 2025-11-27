# Railway Deployment Guide for E-Botar

This guide explains how to deploy E-Botar to Railway while maintaining local development capability.

## Prerequisites

1. A Railway account (sign up at https://railway.app)
2. Your project repository connected to Railway
3. A PostgreSQL database service on Railway

## Architecture

E-Botar consists of:
- **Backend**: Django REST Framework API (`backend/` folder)
- **Frontend**: React + Vite application (`frontend/` folder)

For Railway, you can deploy:
1. **Backend only** (recommended for API-first approach)
2. **Backend + Frontend** (monorepo deployment)

This guide covers **Backend deployment**. For frontend, you can deploy separately or use a static hosting service.

## Automatic Configuration

The project automatically detects Railway environment and adjusts settings:

- **Database**: Automatically uses PostgreSQL when `DATABASE_URL` is present (Railway provides this)
- **Static Files**: Uses WhiteNoise for efficient static file serving
- **Security**: Production security settings enabled on Railway
- **Debug Mode**: Automatically disabled on Railway
- **CORS**: Configured based on environment

## Required Environment Variables

Set these in your Railway project settings:

### Required Variables

1. **SECRET_KEY** (Required)
   - Generate a new secret key: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`
   - Or use: `openssl rand -base64 32`
   - **Important**: Never commit this to version control!

2. **DATABASE_URL** (Auto-provided by Railway)
   - Railway automatically provides this when you add a PostgreSQL service
   - No manual configuration needed

3. **DEBUG** (Optional, defaults to False on Railway)
   - Set to `False` for production
   - Set to `True` only for debugging (not recommended in production)

### Optional Variables

4. **FRONTEND_URL** (Recommended if frontend is separate)
   - Your frontend URL for CORS configuration
   - Example: `https://your-frontend.railway.app` or `https://yourdomain.com`

5. **ALLOWED_HOSTS** (Optional)
   - Comma-separated list of allowed hosts
   - Railway domain is automatically added if `RAILWAY_PUBLIC_DOMAIN` is set

6. **CUSTOM_DOMAIN** (Optional)
   - Your custom domain if you're using one
   - Example: `yourdomain.com`

7. **SECURE_SSL_REDIRECT** (Optional, defaults to False)
   - Set to `True` to force HTTPS redirects

## Deployment Steps

### 1. Add PostgreSQL Database

1. In your Railway project, click "New" → "Database" → "Add PostgreSQL"
2. Railway will automatically create a `DATABASE_URL` environment variable

### 2. Set Environment Variables

1. Go to your Railway project → Settings → Variables
2. Add the following variables:

```
SECRET_KEY=your-generated-secret-key-here
DEBUG=False
FRONTEND_URL=https://your-frontend-url.com  # If frontend is separate
```

### 3. Configure Root Directory (Important!)

Since your backend is in the `backend/` folder:

1. Go to your Railway service → Settings
2. Set **Root Directory** to: `backend`
3. This tells Railway where your `manage.py` is located

### 4. Deploy

1. Railway will automatically detect the `Procfile` or `nixpacks.toml` in the `backend/` folder and deploy
2. The deployment will:
   - Run migrations automatically
   - Collect static files
   - Start the Gunicorn server

### 5. Verify Deployment

1. Check the Railway logs for any errors
2. Visit your Railway-provided domain
3. Test the API: `https://your-app.railway.app/api/auth/health/`
4. Test the application functionality

## Local Development vs Railway

The system automatically detects the environment:

- **Local Development**: 
  - Uses SQLite
  - DEBUG=True
  - Relaxed security
  - CORS allows all origins
  
- **Railway Production**: 
  - Uses PostgreSQL (from DATABASE_URL)
  - DEBUG=False
  - Production security enabled
  - CORS restricted to FRONTEND_URL

**No code changes needed** - it just works! 🎉

## Frontend Deployment

### Option 1: Deploy Frontend Separately (Recommended)

1. Build the frontend: `cd frontend && npm run build`
2. Deploy `frontend/dist` to a static hosting service (Vercel, Netlify, Railway Static)
3. Set `VITE_API_BASE_URL` environment variable to your backend URL
4. Update Railway `FRONTEND_URL` to match your frontend URL

### Option 2: Deploy Frontend on Railway

1. Create a new Railway service for frontend
2. Set Root Directory to `frontend`
3. Use a Node.js buildpack
4. Set build command: `npm run build`
5. Set start command: `npm run preview` or use a static file server

## Database Migration

The `Procfile` automatically runs migrations on each deployment. If you need to run migrations manually:

```bash
railway run python manage.py migrate
```

## Static Files

Static files are automatically collected during deployment. If you need to collect them manually:

```bash
railway run python manage.py collectstatic --noinput
```

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` is set in Railway environment variables
- Check that PostgreSQL service is running
- Verify database credentials in Railway dashboard
- Ensure Root Directory is set to `backend`

### Static Files Not Loading

- Ensure `collectstatic` ran successfully (check deployment logs)
- Verify `STATIC_ROOT` directory exists
- Check WhiteNoise middleware is in `MIDDLEWARE` list

### CORS Errors

- Verify `FRONTEND_URL` is set correctly in Railway
- Check that your frontend URL matches the CORS configuration
- Ensure `CORS_ALLOW_CREDENTIALS` is True

### CSRF Errors

- Verify `CSRF_TRUSTED_ORIGINS` includes your Railway domain
- Check that `RAILWAY_PUBLIC_DOMAIN` is set correctly
- If using custom domain, add it to `CUSTOM_DOMAIN` environment variable

### Port Issues

- Railway automatically sets `$PORT` environment variable
- Ensure your Procfile uses `$PORT` (not hardcoded port)
- Check that Gunicorn binds to `0.0.0.0:$PORT`

## Security Checklist

- [ ] `SECRET_KEY` is set and secure
- [ ] `DEBUG=False` in production
- [ ] `ALLOWED_HOSTS` includes your domain
- [ ] HTTPS is enabled (Railway provides this automatically)
- [ ] Database credentials are secure
- [ ] No sensitive data in code or logs
- [ ] CORS is properly configured
- [ ] CSRF protection is enabled

## Support

For Railway-specific issues, check:
- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway

For E-Botar-specific issues, refer to the main README.md

