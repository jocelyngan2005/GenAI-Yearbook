from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
from werkzeug.utils import secure_filename
import os
from datetime import datetime
import google.generativeai as genai
from elevenlabs import generate, set_api_key
import json
import tempfile
import requests
from dotenv import load_dotenv
from PIL import Image
import io
import time

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'wav', 'mp3'}

# Configure API keys
ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
SUNO_API_KEY = os.getenv('SUNO_API_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')  # For DALL-E
REPLICATE_API_KEY = os.getenv('REPLICATE_API_KEY')

# Configure Gemini
genai.configure(api_key=GOOGLE_API_KEY)
set_api_key(ELEVENLABS_API_KEY)

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Create profiles directory and file if they don't exist
PROFILES_FILE = 'profiles.json'
if not os.path.exists(PROFILES_FILE):
    with open(PROFILES_FILE, 'w') as f:
        json.dump([], f)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def load_profiles():
    try:
        with open(PROFILES_FILE, 'r') as f:
            return json.load(f)
    except:
        return []

def save_profiles(profiles):
    with open(PROFILES_FILE, 'w') as f:
        json.dump(profiles, f)

@app.route('/')
def front():
    return render_template('front.html')

@app.route('/profile')
def profile():
    profiles = load_profiles()
    return render_template('index.html', profiles=profiles)

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'photo' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['photo']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{timestamp}_{filename}"
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        return jsonify({'success': True, 'filename': filename})
    
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/save_profile', methods=['POST'])
def save_profile():
    try:
        data = request.json
        print('SAVE_PROFILE received:', data)
    
        profiles = load_profiles()
    
        # Create new profile
        new_profile = {
            'id': len(profiles) + 1,
            'photo': data.get('photo'),
            'firstName': data.get('firstName'),
            'lastName': data.get('lastName'),
            'style': data.get('style'),
            'quote': data.get('quote'),
            'funFact': data.get('funFact'),
            'dream': data.get('dream'),
            'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }

        print('Saving new profile:', new_profile)

        profiles.append(new_profile)
        save_profiles(profiles)
        
        return jsonify({'success': True, 'profile': new_profile})

    except Exception as e:
        print('Error saving profile:', str(e))
        return jsonify({'success': False, 'error': str(e)})


@app.route('/get_profiles', methods=['GET'])
def get_profiles():
    profiles = load_profiles()
    return jsonify({'success': True, 'profiles': profiles})

@app.route('/enhance_lyrics', methods=['POST'])
def enhance_lyrics():
    data = request.json
    lyrics = data.get('lyrics', '')
    try:
        # Initialize Gemini model
        model = genai.GenerativeModel('gemini-1.5-flash')
        # Generate enhanced lyrics only, no description
        prompt = f"Rewrite these song lyrics to be more poetic, catchy, or creative. Only return the improved lyrics, do not add any explanation or description.\n\nLyrics:\n{lyrics}"
        response = model.generate_content(prompt)
        return jsonify({
            'success': True,
            'enhanced_text': response.text.strip()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/generate_voice', methods=['POST'])
def generate_voice():
    data = request.json
    text = data.get('text', '')
    voice_id = data.get('voice_id', '21m00Tcm4TlvDq8ikWAM')  # Default voice ID
    
    try:
        # Generate voice using ElevenLabs
        audio = generate(
            text=text,
            voice=voice_id,
            model="eleven_monolingual_v1"
        )
        
        # Save the audio file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"voice_{timestamp}.mp3"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        with open(filepath, 'wb') as f:
            f.write(audio)
        
        return jsonify({
            'success': True,
            'filename': filename
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/generate_music', methods=['POST'])
def generate_music():
    data = request.json
    lyrics = data.get('lyrics', '')
    genre = data.get('genre', 'pop')
    
    try:
        # Call Suno AI API to generate music
        headers = {
            'Authorization': f'Bearer {SUNO_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'lyrics': lyrics,
            'genre': genre,
            'duration': 30  # 30 seconds
        }
        
        response = requests.post(
            'https://api.suno.ai/v1/generate',
            headers=headers,
            json=payload
        )
        
        if response.status_code == 200:
            # Save the music file
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"music_{timestamp}.mp3"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            
            with open(filepath, 'wb') as f:
                f.write(response.content)
            
            return jsonify({
                'success': True,
                'filename': filename
            })
        else:
            return jsonify({'error': 'Failed to generate music'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/audio/<filename>')
def serve_audio(filename):
    return send_file(os.path.join(app.config['UPLOAD_FOLDER'], filename))

@app.route('/creation')
def creation():
    return render_template('creation.html')

@app.route('/generate_image', methods=['POST'])
def generate_image():
    data = request.json
    prompt = data.get('prompt', '')
    style = data.get('style', 'pixar')
    
    try:
        # Call DALL-E API to generate image
        headers = {
            'Authorization': f'Bearer {OPENAI_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'prompt': f"Create a {style} style portrait: {prompt}",
            'n': 1,
            'size': '1024x1024'
        }
        
        response = requests.post(
            'https://api.openai.com/v1/images/generations',
            headers=headers,
            json=payload
        )
        
        if response.status_code == 200:
            image_url = response.json()['data'][0]['url']
            
            # Download the image
            image_response = requests.get(image_url)
            image_data = image_response.content
            
            # Save the image
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"image_{timestamp}.png"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            
            with open(filepath, 'wb') as f:
                f.write(image_data)
            
            return jsonify({
                'success': True,
                'filename': filename
            })
        else:
            return jsonify({'error': 'Failed to generate image'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/generate_video', methods=['POST'])
def generate_video():
    data = request.json
    image_file = data.get('image_file', '')
    audio_file = data.get('audio_file', '')
    
    try:
        # Call Runway ML API to generate video
        headers = {
            'Authorization': f'Bearer {REPLICATE_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        # Read the image and audio files
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], image_file)
        audio_path = os.path.join(app.config['UPLOAD_FOLDER'], audio_file)
        
        with open(image_path, 'rb') as img, open(audio_path, 'rb') as aud:
            files = {
                'image': ('image.png', img, 'image/png'),
                'audio': ('audio.mp3', aud, 'audio/mpeg')
            }
            
            response = requests.post(
                'https://api.runwayml.com/v1/generate',
                headers=headers,
                files=files
            )
        
        if response.status_code == 200:
            # Save the video file
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"video_{timestamp}.mp4"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            
            with open(filepath, 'wb') as f:
                f.write(response.content)
            
            return jsonify({
                'success': True,
                'filename': filename
            })
        else:
            return jsonify({'error': 'Failed to generate video'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/generate_landing_page', methods=['POST'])
def generate_landing_page():
    data = request.json
    profile_data = data.get('profile_data', {})
    
    try:
        # Generate a unique ID for the landing page
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        page_id = f"memory_{timestamp}"
        
        # Create a directory for the landing page
        page_dir = os.path.join(app.config['UPLOAD_FOLDER'], page_id)
        os.makedirs(page_dir, exist_ok=True)
        
        # Generate the landing page HTML
        html_content = render_template(
            'landing_page.html',
            profile_data=profile_data,
            page_id=page_id
        )
        
        # Save the HTML file
        with open(os.path.join(page_dir, 'index.html'), 'w') as f:
            f.write(html_content)
        
        return jsonify({
            'success': True,
            'page_id': page_id,
            'url': f'/memory/{page_id}'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/memory/<page_id>')
def view_memory(page_id):
    return send_file(os.path.join(app.config['UPLOAD_FOLDER'], page_id, 'index.html'))

@app.route('/update_profile', methods=['POST'])
def update_profile():
    data = request.json
    print('UPDATE_PROFILE received:', data)
    profile_id = data.get('id')
    profiles = load_profiles()
    updated = False
    for profile in profiles:
        if int(profile['id']) == int(profile_id):
            print('Updating profile:', profile)
            profile['firstName'] = data.get('firstName', profile.get('firstName'))
            profile['lastName'] = data.get('lastName', profile.get('lastName'))
            profile['style'] = data.get('style', profile.get('style'))
            profile['quote'] = data.get('quote', profile.get('quote'))
            profile['funFact'] = data.get('funFact', profile.get('funFact'))
            profile['dream'] = data.get('dream', profile.get('dream'))
            updated = True
            break
    if updated:
        save_profiles(profiles)
        print('Profile updated successfully.')
        return jsonify({'success': True, 'profile': profile})
    else:
        print('Profile not found for update:', profile_id)
        return jsonify({'success': False, 'error': 'Profile not found'}), 404

@app.route('/delete_profile', methods=['POST'])
def delete_profile():
    data = request.json
    profile_id = data.get('id')
    profiles = load_profiles()
    new_profiles = [p for p in profiles if p['id'] != profile_id]
    if len(new_profiles) != len(profiles):
        save_profiles(new_profiles)
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'error': 'Profile not found'}), 404

@app.route('/voice')
def voice():
    return render_template('voice.html')

@app.route('/voice_to_singing', methods=['POST'])
def voice_to_singing():
    lyrics = request.json.get('lyrics', '')
    # TODO: Process audio file from request
    # For now, use Gemini API to simulate voice-to-singing
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(f"Convert the following lyrics to singing: {lyrics}")
        # Simulate saving the result
        filename = f"singing_{int(time.time())}.mp3"
        return jsonify({'success': True, 'filename': filename})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/generate_album_art', methods=['POST'])
def generate_album_art():
    lyrics = request.json.get('lyrics', '')
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(f"Generate album art for the following lyrics: {lyrics}")
        # Simulate saving the result
        filename = f"album_art_{int(time.time())}.png"
        return jsonify({'success': True, 'filename': filename})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory('static/uploads', filename)

if __name__ == '__main__':
    app.run(debug=True)
