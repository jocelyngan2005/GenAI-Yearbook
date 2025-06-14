from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
from werkzeug.utils import secure_filename
import os
from datetime import datetime, timedelta
import google.generativeai as genai
from elevenlabs import generate, set_api_key
import json
import tempfile
import requests
from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageFont
import io
import time
import openai
import replicate
import random

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
os.environ["REPLICATE_API_TOKEN"] = REPLICATE_API_KEY

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

# Letter Templates
LETTER_TEMPLATES = {
    'career': {
        'title': 'Career Goals',
        'prompts': [
            'Where do you see yourself in your career?',
            'What skills do you want to develop?',
            'What achievements are you working towards?',
            'What advice would you give your future self about work-life balance?'
        ]
    },
    'personal': {
        'title': 'Personal Growth',
        'prompts': [
            'What personal qualities do you want to develop?',
            'What habits do you want to build or break?',
            'How do you want to grow as a person?',
            'What relationships are important to you?'
        ]
    },
    'lessons': {
        'title': 'Life Lessons',
        'prompts': [
            'What have you learned recently?',
            'What mistakes have taught you the most?',
            'What wisdom would you share with your future self?',
            'What advice would you give your younger self?'
        ]
    },
    'dreams': {
        'title': 'Dreams & Aspirations',
        'prompts': [
            'What are your biggest dreams?',
            'Where do you see yourself living?',
            'What experiences do you want to have?',
            'What legacy do you want to leave?'
        ]
    },
    'reflection': {
        'title': 'Self Reflection',
        'prompts': [
            'What makes you happy right now?',
            'What are you most proud of?',
            'What challenges are you facing?',
            'What are you grateful for?'
        ]
    }
}

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
        # If editing/undo, preserve voice_filename
        if 'voice_filename' in data:
            new_profile['voice_filename'] = data['voice_filename']

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
    try:
        data = request.get_json()
        text = data.get('lyrics', '')
        mood = data.get('genre', 'reflective')  # Now using mood instead of genre
        quote = data.get('quote', '')
        dream = data.get('dream', '')
        template = data.get('template', '')
        if not text or not mood:
            return jsonify({'success': False, 'error': 'Text and mood are required'})
        template_prompts = []
        if template and template in LETTER_TEMPLATES:
            template_prompts = LETTER_TEMPLATES[template]['prompts']
        prompt = f"""Create a heartfelt letter to my future self. The letter should have a {mood} tone.

Context from my profile:
- My favorite quote: \"{quote}\"
- My dream: \"{dream}\"

If template prompts are provided, incorporate them naturally into the letter:
{chr(10).join(f'- {prompt}' for prompt in template_prompts)}

Original text to enhance:
{text}

The enhanced letter should:
1. Be personal and emotional
2. Include specific details and memories
3. Express hopes and dreams for the future
4. Maintain a {mood} tone throughout
5. Be structured like a proper letter with greeting and closing
6. Be between 200-300 words
7. Include both reflection on the past and vision for the future
8. Incorporate the quote and dream naturally
9. Address the template prompts if provided

Please enhance this into a beautiful letter that I'll be excited to read in the future."""
        try:
            model = genai.GenerativeModel('gemini-pro')
            response = model.generate_content(prompt)
            enhanced_text = response.text
        except Exception as e:
            print(f"Error using Gemini API: {str(e)}")
            enhanced_text = f"""Dear Future Me,\n\n{text}\n\nI hope this letter finds you well. As I write this, I'm thinking about my favorite quote: \"{quote}\" and my dream to {dream}. I wonder how these have shaped your journey.\n\nLooking forward to reading this in the future,\nPresent Me"""
        return jsonify({'success': True, 'enhanced_text': enhanced_text})
    except Exception as e:
        print(f"Error in enhance_lyrics: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

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
        # If no lyrics, generate instrumental/background music only
        if not lyrics:
            # Try to use Suno API for instrumental music, or fallback to dummy file
            headers = {
                'Authorization': f'Bearer {SUNO_API_KEY}',
                'Content-Type': 'application/json'
            }
            payload = {
                'genre': genre,
                'instrumental': True,  # If Suno supports this
                'duration': 30
            }
            response = requests.post(
                'https://api.suno.ai/v1/generate',
                headers=headers,
                json=payload
            )
            print('Suno API response (instrumental):', response.status_code, response.text)
            if response.status_code == 200:
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                filename = f"music_{timestamp}.mp3"
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                with open(filepath, 'wb') as f:
                    f.write(response.content)
                return jsonify({'success': True, 'filename': filename})
            else:
                # Fallback: create a 1-second silent mp3 as dummy output
                import wave
                import numpy as np
                import soundfile as sf
                dummy_wav = np.zeros(44100, dtype=np.float32)
                dummy_mp3_path = os.path.join(app.config['UPLOAD_FOLDER'], f"music_{timestamp}_dummy.mp3")
                sf.write(dummy_mp3_path, dummy_wav, 44100, format='MP3')
                filename = os.path.basename(dummy_mp3_path)
                return jsonify({'success': True, 'filename': filename})
        # Otherwise, generate music with lyrics as before
        headers = {
            'Authorization': f'Bearer {SUNO_API_KEY}',
            'Content-Type': 'application/json'
        }
        payload = {
            'lyrics': lyrics,
            'genre': genre,
            'duration': 30
        }
        response = requests.post(
            'https://api.suno.ai/v1/generate',
            headers=headers,
            json=payload
        )
        print('Suno API response:', response.status_code, response.text)
        if response.status_code == 200:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"music_{timestamp}.mp3"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            with open(filepath, 'wb') as f:
                f.write(response.content)
            return jsonify({'success': True, 'filename': filename})
        else:
            return jsonify({'error': f'Failed to generate music: {response.text}'}), 500
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
            # Preserve voice_filename if present
            if 'voice_filename' in profile:
                profile['voice_filename'] = profile['voice_filename']
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
    new_profiles = []
    deleted_voice_filename = None
    for p in profiles:
        if p['id'] == profile_id:
            deleted_voice_filename = p.get('voice_filename')
        else:
            new_profiles.append(p)
    if len(new_profiles) != len(profiles):
        save_profiles(new_profiles)
        # Delete voice file if exists
        if deleted_voice_filename:
            try:
                os.remove(os.path.join(app.config['UPLOAD_FOLDER'], deleted_voice_filename))
            except Exception:
                pass
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'error': 'Profile not found'}), 404

@app.route('/voice')
def voice():
    return render_template('voice.html')

@app.route('/voice_to_singing', methods=['POST'])
def voice_to_singing():
    if 'audio' not in request.files or 'lyrics' not in request.form or 'genre' not in request.form:
        return jsonify({'success': False, 'error': 'Audio file, lyrics, and genre are required'})
    try:
        audio_file = request.files['audio']
        lyrics = request.form['lyrics']
        genre = request.form['genre']
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        input_filename = f"input_voice_{timestamp}.wav"
        input_path = os.path.join(app.config['UPLOAD_FOLDER'], input_filename)
        audio_file.save(input_path)
        bark_prompt = f"Convert this voice recording to a singing style. Make it {genre}-inspired, expressive, and energetic.\n\nLyrics:\n{lyrics}"
        try:
            with open(input_path, "rb") as audio_f:
                output = replicate.run(
                    "suno-ai/bark:<your_version_hash_here>",  # Replace with actual version hash
                    input={
                        "text": bark_prompt,
                        "audio": audio_f,
                        "style": genre
                    }
                )
            print('Replicate output:', output)
            output_filename = f"singing_{timestamp}.wav"
            output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)
            response = requests.get(output)
            print('Replicate response status:', response.status_code)
            with open(output_path, 'wb') as f:
                f.write(response.content)
            print('Saved singing file:', output_path, 'size:', os.path.getsize(output_path))
            os.remove(input_path)
            return jsonify({'success': True, 'filename': output_filename})
        except Exception as e:
            print('Replicate error:', str(e))
            # Fallback: return a dummy file for demo
            import wave
            import numpy as np
            import soundfile as sf
            dummy_wav = np.zeros(44100, dtype=np.float32)
            dummy_mp3_path = os.path.join(app.config['UPLOAD_FOLDER'], f"singing_{timestamp}_dummy.mp3")
            sf.write(dummy_mp3_path, dummy_wav, 44100, format='MP3')
            filename = os.path.basename(dummy_mp3_path)
            os.remove(input_path)
            return jsonify({'success': True, 'filename': filename, 'fallback': True, 'error': str(e)})
    except Exception as e:
        print('Error converting voice to singing:', str(e))
        return jsonify({'success': False, 'error': str(e)})

@app.route('/generate_album_art', methods=['POST'])
def generate_album_art():
    if 'picture' not in request.files or 'poem' not in request.form or 'style' not in request.form:
        return jsonify({'success': False, 'error': 'Picture, letter, and style are required.'})
    try:
        picture = request.files['picture']
        letter = request.form['poem']
        style = request.form['style']
        # Simulate letter art generation: save the uploaded picture as the cover, could overlay text for demo
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"letter_art_{timestamp}.png"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        image = Image.open(picture)
        image.save(filepath)
        return jsonify({'success': True, 'filename': filename})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory('static/uploads', filename)

@app.route('/save_voice', methods=['POST'])
def save_voice():
    profile_id = request.form.get('profile_id')
    audio_file = request.files.get('audio')
    if not profile_id or not audio_file:
        return jsonify({'success': False, 'error': 'Profile ID and audio file are required.'}), 400
    try:
        # Save the audio file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"voice_{profile_id}_{timestamp}.wav"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        audio_file.save(filepath)
        # Update the profile with the voice filename
        profiles = load_profiles()
        for profile in profiles:
            if str(profile['id']) == str(profile_id):
                profile['voice_filename'] = filename
                break
        save_profiles(profiles)
        return jsonify({'success': True, 'filename': filename})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/get_profile_voice/<profile_id>', methods=['GET'])
def get_profile_voice(profile_id):
    profiles = load_profiles()
    for profile in profiles:
        if str(profile['id']) == str(profile_id):
            filename = profile.get('voice_filename')
            if filename:
                return jsonify({'success': True, 'filename': filename})
            else:
                return jsonify({'success': False, 'error': 'No voice file found.'})
    return jsonify({'success': False, 'error': 'Profile not found.'})

@app.route('/send_to_future_me', methods=['POST'])
def send_to_future_me():
    try:
        data = request.get_json()
        email = data.get('email')
        letter = data.get('letter')
        mood = data.get('mood', 'neutral')
        schedule = data.get('schedule', {})
        time_capsule = data.get('timeCapsule', {})
        
        if not email or not letter:
            return jsonify({'success': False, 'error': 'Email and letter are required'})

        # Calculate delivery date based on schedule type
        delivery_date = None
        if 'date' in schedule:
            delivery_date = datetime.strptime(schedule['date'], '%Y-%m-%d')
        elif 'range' in schedule:
            range_parts = schedule['range'].split('-')
            years = random.randint(int(range_parts[0]), int(range_parts[1]))
            delivery_date = datetime.now() + timedelta(days=years*365)
        else:
            years = schedule.get('years', 1)
            delivery_date = datetime.now() + timedelta(days=years*365)

        # Save time capsule items
        time_capsule_path = os.path.join(app.config['UPLOAD_FOLDER'], 'time_capsule')
        os.makedirs(time_capsule_path, exist_ok=True)
        
        for item_type, items in time_capsule.items():
            if not items:
                continue
                
            item_path = os.path.join(time_capsule_path, item_type)
            os.makedirs(item_path, exist_ok=True)
            
            if isinstance(items, list):
                for item in items:
                    filename = secure_filename(item['name'])
                    filepath = os.path.join(item_path, filename)
                    with open(filepath, 'wb') as f:
                        f.write(item['data'])
            else:
                filename = secure_filename(items['name'])
                filepath = os.path.join(item_path, filename)
                with open(filepath, 'wb') as f:
                    f.write(items['data'])

        # In a real application, this would:
        # 1. Store the letter and time capsule in a database
        # 2. Schedule an email to be sent on the delivery date
        # 3. Set up reminders and notifications
        # 4. Handle email verification and updates
        
        # For demo purposes, we'll just log the information
        print(f"""
        Future Letter Scheduled:
        - Email: {email}
        - Delivery Date: {delivery_date}
        - Mood: {mood}
        - Schedule Type: {schedule.get('type', 'default')}
        - Time Capsule Items: {list(time_capsule.keys())}
        """)

        return jsonify({
            'success': True,
            'message': f'Letter scheduled for delivery on {delivery_date.strftime("%Y-%m-%d")}'
        })

    except Exception as e:
        print(f"Error in send_to_future_me: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/generate_letter_art', methods=['POST'])
def generate_letter_art():
    try:
        if 'picture' not in request.files or 'letter' not in request.form or 'style' not in request.form:
            return jsonify({'success': False, 'error': 'Picture, letter, and style are required'})

        file = request.files['picture']
        letter = request.form['letter']
        style = request.form['style']
        border = request.form.get('border', 'classic')

        if file.filename == '':
            return jsonify({'success': False, 'error': 'No picture selected'})

        # Save the uploaded picture
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{timestamp}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        # Create letter art using Gemini Vision
        try:
            model = genai.GenerativeModel('gemini-pro-vision')
            image = Image.open(filepath)
            
            prompt = f"""Create a beautiful letter art design based on this image and letter.
            Style: {style}
            Border: {border}
            Letter content: {letter}
            
            The design should:
            1. Incorporate the image as a background or decorative element
            2. Use the {style} style for the overall design
            3. Add a {border} border around the letter
            4. Make the text readable and elegant
            5. Include decorative elements that match the style
            6. Create a cohesive and beautiful composition
            
            Please describe the design in detail."""

            response = model.generate_content([prompt, image])
            design_description = response.text

            # For demo purposes, we'll create a simple letter art
            # In production, this would use Stable Diffusion or similar
            letter_art = create_letter_art(filepath, letter, style, border, design_description)
            
            return jsonify({
                'success': True,
                'filename': letter_art,
                'design_description': design_description
            })

        except Exception as e:
            print(f"Error using Gemini Vision: {str(e)}")
            # Fallback to simple letter art
            letter_art = create_simple_letter_art(filepath, letter, style, border)
            return jsonify({
                'success': True,
                'filename': letter_art,
                'design_description': 'Simple letter art design with border and text overlay'
            })

    except Exception as e:
        print(f"Error in generate_letter_art: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

def create_letter_art(image_path, letter, style, border, design_description):
    try:
        # Create a new image with the uploaded picture as background
        img = Image.open(image_path)
        width, height = img.size
        
        # Create a new image with padding for the border
        border_width = 20
        new_img = Image.new('RGB', (width + border_width*2, height + border_width*2), 'white')
        new_img.paste(img, (border_width, border_width))
        
        # Add border
        if border == 'classic':
            draw = ImageDraw.Draw(new_img)
            draw.rectangle([(0, 0), (new_img.width-1, new_img.height-1)], outline='black', width=2)
        elif border == 'decorative':
            # Add decorative border
            draw = ImageDraw.Draw(new_img)
            for i in range(0, new_img.width, 20):
                draw.rectangle([(i, 0), (i+10, 10)], fill='black')
                draw.rectangle([(i, new_img.height-10), (i+10, new_img.height)], fill='black')
            for i in range(0, new_img.height, 20):
                draw.rectangle([(0, i), (10, i+10)], fill='black')
                draw.rectangle([(new_img.width-10, i), (new_img.width, i+10)], fill='black')
        
        # Add letter text
        draw = ImageDraw.Draw(new_img)
        font = ImageFont.truetype("arial.ttf", 24)
        
        # Split letter into lines
        lines = []
        current_line = []
        words = letter.split()
        for word in words:
            current_line.append(word)
            if draw.textlength(' '.join(current_line), font=font) > width - 100:
                current_line.pop()
                lines.append(' '.join(current_line))
                current_line = [word]
        if current_line:
            lines.append(' '.join(current_line))
        
        # Draw text
        y = height // 2 - (len(lines) * 30) // 2
        for line in lines:
            x = width // 2 - draw.textlength(line, font=font) // 2
            draw.text((x + border_width, y + border_width), line, font=font, fill='black')
            y += 30
        
        # Save the letter art
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        letter_art_filename = f"letter_art_{timestamp}.png"
        letter_art_path = os.path.join(app.config['UPLOAD_FOLDER'], letter_art_filename)
        new_img.save(letter_art_path)
        
        return letter_art_filename
    except Exception as e:
        print(f"Error creating letter art: {str(e)}")
        return create_simple_letter_art(image_path, letter, style, border)

def create_simple_letter_art(image_path, letter, style, border):
    try:
        # Create a simple letter art with the uploaded picture and text overlay
        img = Image.open(image_path)
        width, height = img.size
        
        # Create a new image with padding for the border
        border_width = 20
        new_img = Image.new('RGB', (width + border_width*2, height + border_width*2), 'white')
        new_img.paste(img, (border_width, border_width))
        
        # Add simple border
        draw = ImageDraw.Draw(new_img)
        draw.rectangle([(0, 0), (new_img.width-1, new_img.height-1)], outline='black', width=2)
        
        # Add letter text
        font = ImageFont.truetype("arial.ttf", 24)
        text = "Your Letter to Future Self"
        x = width // 2 - draw.textlength(text, font=font) // 2
        draw.text((x + border_width, height // 2 + border_width), text, font=font, fill='black')
        
        # Save the letter art
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        letter_art_filename = f"letter_art_{timestamp}.png"
        letter_art_path = os.path.join(app.config['UPLOAD_FOLDER'], letter_art_filename)
        new_img.save(letter_art_path)
        
        return letter_art_filename
    except Exception as e:
        print(f"Error creating simple letter art: {str(e)}")
        return None

if __name__ == '__main__':
    app.run(debug=True)
