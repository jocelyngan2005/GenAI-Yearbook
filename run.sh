#!/bin/bash

# Activate virtual environment
source venv/bin/activate

# Set Flask environment variables
export FLASK_APP=app.py
export FLASK_ENV=development

# Run Flask application
flask run --port 3001 