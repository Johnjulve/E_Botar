#!/bin/bash
echo "Setting up E-Botar for local development..."

# Check if backend/.env exists
if [ ! -f backend/.env ]; then
    echo "Creating backend/.env file from backend/.env.example..."
    if [ -f backend/.env.example ]; then
        cp backend/.env.example backend/.env
    else
        echo "SECRET_KEY=" > backend/.env
        echo "DEBUG=True" >> backend/.env
        echo "BACKEND_BASE_URL=http://localhost:8000" >> backend/.env
    fi
    echo ""
    echo "IMPORTANT: Please edit backend/.env and set your SECRET_KEY!"
    echo "You can generate one with: python -c \"from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())\""
    echo ""
    read -p "Press enter to continue..."
fi

# Create virtual environment if it doesn't exist
if [ ! -d "env" ]; then
    echo "Creating virtual environment..."
    python3 -m venv env
fi

# Activate virtual environment
echo "Activating virtual environment..."
source env/bin/activate

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
pip install --upgrade pip
pip install -r requirements.txt

# Run migrations
echo "Running database migrations..."
python manage.py migrate

# Collect static files (optional for local)
echo "Collecting static files..."
python manage.py collectstatic --noinput

cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
cd ..

echo ""
echo "Setup complete!"
echo ""
echo "To start the backend:"
echo "   source env/bin/activate"
echo "   cd backend"
echo "   python manage.py runserver"
echo ""
echo "To start the frontend (in a new terminal):"
echo "   cd frontend"
echo "   npm run dev"
echo ""

