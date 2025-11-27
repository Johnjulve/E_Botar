@echo off
echo Setting up E-Botar for local development...

REM Check if backend/.env exists
if not exist backend\.env (
    echo Creating backend/.env file from backend/.env.example...
    if exist backend\.env.example (
        copy backend\.env.example backend\.env
    ) else (
        echo SECRET_KEY= > backend\.env
        echo DEBUG=True >> backend\.env
        echo BACKEND_BASE_URL=http://localhost:8000 >> backend\.env
    )
    echo.
    echo IMPORTANT: Please edit backend/.env and set your SECRET_KEY!
    echo You can generate one with: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
    echo.
    pause
)

REM Create virtual environment if it doesn't exist
if not exist env (
    echo Creating virtual environment...
    python -m venv env
)

REM Activate virtual environment
echo Activating virtual environment...
call env\Scripts\activate.bat

REM Install backend dependencies
echo Installing backend dependencies...
cd backend
pip install --upgrade pip
pip install -r requirements.txt

REM Run migrations
echo Running database migrations...
python manage.py migrate

REM Collect static files (optional for local)
echo Collecting static files...
python manage.py collectstatic --noinput

cd ..

REM Install frontend dependencies
echo Installing frontend dependencies...
cd frontend
if not exist node_modules (
    call npm install
)
cd ..

echo.
echo Setup complete!
echo.
echo To start the backend:
echo    env\Scripts\activate.bat
echo    cd backend
echo    python manage.py runserver
echo.
echo To start the frontend (in a new terminal):
echo    cd frontend
echo    npm run dev
echo.
pause

