# 🎭 GenAI Memoryverse

Capture Your Story. Remix Your Identity. Immortalize the Moment.

## 🌟 Features

- Create personalized digital memories with AI-enhanced content
- Upload and transform photos with various artistic styles
- Add quotes and fun facts to your profile
- Generate AI-enhanced content across multiple formats
- Netflix-inspired UI for an intuitive user experience

## 🚀 Getting Started

### Prerequisites

- Python 3.8 or higher
- pip (Python package installer)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/genai-memoryverse.git
cd genai-memoryverse
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create necessary directories:
```bash
mkdir -p static/uploads
```

### Running the Application

1. Start the Flask server:
```bash
python app.py
```

2. Open your browser and navigate to:
```
http://localhost:5000
```

## 🎨 Usage

1. Click the "Add New Profile" card to create your first memory
2. Upload a photo and choose your preferred style
3. Add your personal quote and fun fact
4. Submit to generate your AI-enhanced memory

## 🔧 Configuration

The application uses environment variables for configuration. Create a `.env` file in the root directory with the following variables:

```
FLASK_ENV=development
FLASK_APP=app.py
```

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Flask for the web framework
- Tailwind CSS for styling
- Various AI services for content generation 