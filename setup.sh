#!/bin/bash

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install requirements
echo "Installing requirements..."
pip install -r requirements.txt

# Create necessary directories
mkdir -p static/uploads

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << EOL
ELEVENLABS_API_KEY=your_elevenlabs_api_key
GOOGLE_API_KEY=your_google_api_key
SUNO_API_KEY=your_suno_api_key
OPENAI_API_KEY=your_openai_api_key
REPLICATE_API_KEY=your_replicate_api_key
EOL
    echo "Please update the API keys in .env file"
fi

echo "Setup complete! You can now run the application using: ./run.sh" 