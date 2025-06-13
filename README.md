# GenAI Memoryverse

Welcome to **GenAI Memoryverse** – your AI-powered digital yearbook and creative memory capsule! This app lets you create, personalize, and share AI-generated portraits, music, and time capsules in a beautiful, modern, multi-step experience.

## 🚀 Features
- **Front Page Overview**: Guided, step-by-step flow with progress bar and navigation.
- **Profile Creation**: Upload a selfie, fill out your profile, and choose your style.
- **Voice & Music**: Record your voice, write lyrics, and generate AI music.
- **AI Creation Pipeline**: Generate images, videos, and time capsules with AI.
- **Gallery**: View and manage all created profiles.
- **Edit/Delete/Undo**: Edit or delete profiles with confirmation and undo.
- **Modern UI/UX**: Smooth transitions, progress bar, and responsive design.

## 🛠️ Setup Instructions

### 1. Clone the Repository
```bash
# Clone this repo
git clone <your-repo-url>
cd genAi
```

### 2. Create a Virtual Environment
```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Set Up Environment Variables
Create a `.env` file in the project root with your API keys:
```
FLASK_ENV=development
FLASK_APP=app.py
ELEVENLABS_API_KEY=your_elevenlabs_api_key
GOOGLE_API_KEY=your_google_api_key
SUNO_API_KEY=your_suno_api_key
OPENAI_API_KEY=your_openai_api_key
REPLICATE_API_KEY=your_replicate_api_key
```

### 5. Run the App
```bash
flask run
```
Visit [http://localhost:5000](http://localhost:5000) in your browser.

## 📝 Usage
1. **Start at the front page** and choose a step or view the gallery.
2. **Create your profile** with a photo and details.
3. **Record your voice or create music** in the next step.
4. **Generate your time capsule** with AI visuals and messages.
5. **View, edit, or delete profiles** in the gallery. Undo deletes if needed.
6. **Navigate easily** with Next/Previous/Back buttons and the progress bar.

## 📁 Project Structure
- `app.py` – Flask backend and API routes
- `templates/` – HTML templates for each page/step
- `static/js/` – JavaScript for interactivity
- `static/css/` – Custom styles
- `profiles.json` – Stores all user profiles
- `.env` – Your API keys (not committed)

## 🤖 Credits
- Built with Flask, Tailwind CSS, and modern JavaScript
- AI services: OpenAI, Google Gemini, Suno, ElevenLabs, Replicate
- UI inspired by Netflix, Notion, and modern web apps

---

**Enjoy your journey in the GenAI Memoryverse!**
