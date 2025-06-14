document.addEventListener('DOMContentLoaded', function() {
    let selectedGenre = null;
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;
    let uploadedAudio = null;
    let enhancedLetter = '';

    // Genre Selection
    const genreOptions = ["pop", "rock", "jazz", "classical", "electronic", "folk", "romantic", "inspirational", "nature", "k-pop"];
    document.querySelectorAll('.genre-btn').forEach((btn, i) => {
        if (genreOptions[i]) {
            btn.dataset.genre = genreOptions[i];
            btn.querySelector('span').textContent = genreOptions[i].charAt(0).toUpperCase() + genreOptions[i].slice(1);
        }
        btn.addEventListener('click', function() {
            document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('bg-indigo-600'));
            this.classList.add('bg-indigo-600');
            selectedGenre = this.dataset.genre;
            // Enable lyrics input and enhance button
            document.getElementById('lyricsInput').disabled = false;
            document.getElementById('enhanceLyricsBtn').disabled = false;
        });
    });

    // Enhance Letter
    const enhanceLyricsBtn = document.getElementById('enhanceLyricsBtn');
    enhanceLyricsBtn.addEventListener('click', async function() {
        const letter = document.getElementById('lyricsInput').value;
        const mood = document.getElementById('moodSelector').value;
        const quote = document.getElementById('quoteInput')?.value || '';
        const dream = document.getElementById('dreamInput')?.value || '';
        const template = document.querySelector('.template-btn.bg-indigo-600')?.dataset.template || '';
        if (!letter) {
            alert('Please write your letter first!');
            return;
        }
        try {
            const response = await fetch('/enhance_lyrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lyrics: letter, genre: mood, quote, dream, template })
            });
            const data = await response.json();
            if (data.success) {
                enhancedLetter = data.enhanced_text;
                document.getElementById('enhancedLetterOutput').value = enhancedLetter;
                document.getElementById('enhancedLetterSection').style.display = '';
            } else {
                alert(data.error || 'Error enhancing letter.');
            }
        } catch (error) {
            alert('Error enhancing letter.');
        }
    });

    // Use Enhanced Letter for Email
    const useEnhancedLetterBtn = document.getElementById('useEnhancedLetterBtn');
    useEnhancedLetterBtn.addEventListener('click', function() {
        if (enhancedLetter) {
            document.getElementById('lyricsInput').value = enhancedLetter;
            alert('Enhanced letter is now set for sending to your future self!');
        }
    });

    // Voice Recording
    const recordBtn = document.getElementById('recordBtn');
    const stopBtn = document.getElementById('stopBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const audioPlayer = document.getElementById('audioPlayer');
    const convertBtn = document.getElementById('convertBtn');

    recordBtn.addEventListener('click', async function() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                uploadedAudio = audioBlob;
                const audioUrl = URL.createObjectURL(audioBlob);
                audioPlayer.src = audioUrl;
                audioPlayer.classList.remove('hidden');
                convertBtn.disabled = false;
            };

            mediaRecorder.start();
            isRecording = true;
            recordBtn.classList.add('hidden');
            stopBtn.classList.remove('hidden');
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Error accessing microphone');
        }
    });

    stopBtn.addEventListener('click', function() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            isRecording = false;
            recordBtn.classList.remove('hidden');
            stopBtn.classList.add('hidden');
        }
    });

    uploadBtn.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            uploadedAudio = file;
            const audioUrl = URL.createObjectURL(file);
            audioPlayer.src = audioUrl;
            audioPlayer.classList.remove('hidden');
            convertBtn.disabled = false;
        }
    });

    // Convert to Singing using Bark
    convertBtn.addEventListener('click', async function() {
        if (!uploadedAudio || !selectedGenre) {
            alert('Please record/upload voice and select a genre first!');
            return;
        }

        const letter = document.getElementById('lyricsInput').value;
        if (!letter) {
            alert('Please write or enhance letter first!');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('audio', uploadedAudio);
            formData.append('lyrics', letter);
            formData.append('genre', selectedGenre);

            const response = await fetch('/voice_to_singing', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                const singingAudio = document.getElementById('singingAudio');
                singingAudio.src = `/static/uploads/${data.filename}?t=${Date.now()}`;
                singingAudio.classList.remove('hidden');
                document.getElementById('singingPreview').classList.remove('hidden');
                showToast('Voice converted to singing!');
            } else {
                alert('Error converting voice: ' + data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error converting voice');
        }
    });

    // Letter narration (AI voiceover)
    document.getElementById('narratePoemBtn').addEventListener('click', async function() {
        const letter = document.getElementById('lyricsInput').value;
        if (!letter) {
            alert('Please write or enhance your letter first!');
            return;
        }
        try {
            const response = await fetch('/generate_voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: letter })
            });
            const data = await response.json();
            if (data.success) {
                const audioUrl = `/static/uploads/${data.filename}?t=${Date.now()}`;
                const audio = document.getElementById('poemVoiceAudio');
                audio.src = audioUrl;
                document.getElementById('poemVoicePreview').classList.remove('hidden');
                document.getElementById('downloadPoemVoice').href = audioUrl;
            } else {
                document.getElementById('poemVoiceError').textContent = data.error || 'Error generating voiceover.';
                document.getElementById('poemVoiceError').classList.remove('hidden');
            }
        } catch (error) {
            document.getElementById('poemVoiceError').textContent = 'Error generating voiceover.';
            document.getElementById('poemVoiceError').classList.remove('hidden');
        }
    });

    // Letter Templates
    const templates = {
        career: {
            title: "Career Goals",
            prompts: [
                "Where do you see yourself in your career?",
                "What skills do you want to develop?",
                "What achievements are you working towards?",
                "What advice would you give your future self about work-life balance?"
            ]
        },
        personal: {
            title: "Personal Growth",
            prompts: [
                "What personal qualities do you want to develop?",
                "What habits do you want to build or break?",
                "How do you want to grow as a person?",
                "What relationships are important to you?"
            ]
        },
        lessons: {
            title: "Life Lessons",
            prompts: [
                "What have you learned recently?",
                "What mistakes have taught you the most?",
                "What wisdom would you share with your future self?",
                "What advice would you give your younger self?"
            ]
        },
        dreams: {
            title: "Dreams & Aspirations",
            prompts: [
                "What are your biggest dreams?",
                "Where do you see yourself living?",
                "What experiences do you want to have?",
                "What legacy do you want to leave?"
            ]
        },
        reflection: {
            title: "Self Reflection",
            prompts: [
                "What makes you happy right now?",
                "What are you most proud of?",
                "What challenges are you facing?",
                "What are you grateful for?"
            ]
        }
    };

    // Template Selection
    document.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const template = this.dataset.template;
            document.querySelectorAll('.template-btn').forEach(b => b.classList.remove('bg-indigo-600'));
            this.classList.add('bg-indigo-600');
            
            if (template === 'custom') {
                document.getElementById('templatePrompts').classList.add('hidden');
                return;
            }

            const promptList = document.getElementById('promptList');
            promptList.innerHTML = templates[template].prompts.map(prompt => 
                `<div class="p-2 bg-gray-700 rounded-lg cursor-pointer hover:bg-indigo-600" onclick="addPrompt('${prompt}')">${prompt}</div>`
            ).join('');
            document.getElementById('templatePrompts').classList.remove('hidden');
        });
    });

    // Add Prompt to Letter
    window.addPrompt = function(prompt) {
        const textarea = document.getElementById('lyricsInput');
        const currentText = textarea.value;
        textarea.value = currentText ? `${currentText}\n\n${prompt}\n` : `${prompt}\n`;
    };

    // Time Capsule
    const timeCapsuleItems = {
        photos: [],
        videos: [],
        music: [],
        voice: null
    };

    ['Photos', 'Videos', 'Music', 'Voice'].forEach(type => {
        const input = document.getElementById(`timeCapsule${type}`);
        input.addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            const preview = document.getElementById('timeCapsulePreview');
            
            files.forEach(file => {
                const item = document.createElement('div');
                item.className = 'relative';
                
                if (type === 'Photos' || type === 'Videos') {
                    const media = document.createElement(type === 'Photos' ? 'img' : 'video');
                    media.src = URL.createObjectURL(file);
                    media.className = 'w-full h-32 object-cover rounded-lg';
                    if (type === 'Videos') media.controls = true;
                    item.appendChild(media);
                } else {
                    const audio = document.createElement('audio');
                    audio.src = URL.createObjectURL(file);
                    audio.controls = true;
                    audio.className = 'w-full';
                    item.appendChild(audio);
                }

                const removeBtn = document.createElement('button');
                removeBtn.className = 'absolute top-2 right-2 bg-red-600 text-white rounded-full p-1';
                removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                removeBtn.onclick = () => item.remove();
                item.appendChild(removeBtn);

                preview.appendChild(item);
            });

            if (type === 'Voice') {
                timeCapsuleItems.voice = files[0];
            } else {
                timeCapsuleItems[type.toLowerCase()] = [...timeCapsuleItems[type.toLowerCase()], ...files];
            }
        });
    });

    // Enhanced Letter Art
    document.getElementById('generateLetterArt').addEventListener('click', async function() {
        const letter = document.getElementById('lyricsInput').value;
        const style = document.getElementById('artStyle').value;
        const border = document.getElementById('borderStyle').value;
        const file = document.getElementById('letterArtPicture').files[0];
        
        if (!letter || !file) {
            alert('Please provide your letter and a picture for the letter art!');
            return;
        }

        const formData = new FormData();
        formData.append('letter', letter);
        formData.append('style', style);
        formData.append('border', border);
        formData.append('picture', file);

        try {
            const response = await fetch('/generate_letter_art', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (data.success) {
                const imgUrl = `/static/uploads/${data.filename}?t=${Date.now()}`;
                document.getElementById('letterArtImage').src = imgUrl;
                document.getElementById('letterArtPreview').classList.remove('hidden');
                document.getElementById('downloadLetterArt').href = imgUrl;
            } else {
                document.getElementById('letterArtError').textContent = data.error || 'Error generating letter art.';
                document.getElementById('letterArtError').classList.remove('hidden');
            }
        } catch (error) {
            document.getElementById('letterArtError').textContent = 'Error generating letter art.';
            document.getElementById('letterArtError').classList.remove('hidden');
        }
    });

    // Advanced Scheduling
    const scheduleOptions = {
        date: `
            <div class="p-4 bg-gray-700 rounded-lg">
                <input type="date" class="w-full bg-gray-600 text-white rounded-lg p-2" id="specificDate">
            </div>
        `,
        birthday: `
            <div class="p-4 bg-gray-700 rounded-lg">
                <input type="date" class="w-full bg-gray-600 text-white rounded-lg p-2" id="birthdayDate">
            </div>
        `,
        graduation: `
            <div class="p-4 bg-gray-700 rounded-lg">
                <input type="date" class="w-full bg-gray-600 text-white rounded-lg p-2" id="graduationDate">
            </div>
        `,
        milestone: `
            <div class="p-4 bg-gray-700 rounded-lg">
                <select class="w-full bg-gray-600 text-white rounded-lg p-2" id="milestoneType">
                    <option value="wedding">Wedding</option>
                    <option value="career">Career Change</option>
                    <option value="move">Moving</option>
                    <option value="other">Other</option>
                </select>
                <input type="date" class="w-full bg-gray-600 text-white rounded-lg p-2 mt-2" id="milestoneDate">
            </div>
        `,
        surprise: `
            <div class="p-4 bg-gray-700 rounded-lg">
                <select class="w-full bg-gray-600 text-white rounded-lg p-2" id="surpriseRange">
                    <option value="1-3">1-3 Years</option>
                    <option value="3-5">3-5 Years</option>
                    <option value="5-10">5-10 Years</option>
                </select>
            </div>
        `
    };

    document.querySelectorAll('.schedule-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const type = this.dataset.type;
            document.querySelectorAll('.schedule-btn').forEach(b => b.classList.remove('bg-indigo-800'));
            this.classList.add('bg-indigo-800');
            
            const optionsDiv = document.getElementById('scheduleOptions');
            optionsDiv.innerHTML = scheduleOptions[type];
            optionsDiv.classList.remove('hidden');
        });
    });

    // Track selected years for future delivery
    let selectedYears = null;
    const futureBtns = document.querySelectorAll('.futureBtn');
    futureBtns.forEach((btn, idx) => {
        btn.addEventListener('click', function() {
            futureBtns.forEach(b => {
                b.classList.remove('bg-indigo-800', 'text-white', 'ring-2', 'ring-yellow-400');
                b.classList.add('bg-indigo-600');
            });
            this.classList.remove('bg-indigo-600');
            this.classList.add('bg-indigo-800', 'text-white', 'ring-2', 'ring-yellow-400');
            selectedYears = parseInt(this.dataset.years);
        });
    });

    // Set the first button as selected by default if none is selected
    if (futureBtns.length > 0 && !selectedYears) {
        futureBtns[0].classList.remove('bg-indigo-600');
        futureBtns[0].classList.add('bg-indigo-800', 'text-white', 'ring-2', 'ring-yellow-400');
        selectedYears = parseInt(futureBtns[0].dataset.years);
    }

    // When sending to future, require a time selection
    const sendToFutureBtn = document.getElementById('sendToFutureBtn');
    sendToFutureBtn.addEventListener('click', async function() {
        const email = document.getElementById('futureEmail').value;
        const letter = enhancedLetter || document.getElementById('lyricsInput').value;
        const mood = document.getElementById('moodSelector').value;
        if (!email || !letter) {
            document.getElementById('futureMeError').textContent = 'Please provide your email and letter.';
            document.getElementById('futureMeError').classList.remove('hidden');
            return;
        }
        if (!selectedYears) {
            document.getElementById('futureMeError').textContent = 'Please select when you want to receive your letter (1, 3, or 5 years).';
            document.getElementById('futureMeError').classList.remove('hidden');
            return;
        }
        const scheduleType = document.querySelector('.schedule-btn.bg-indigo-800')?.dataset.type;
        let scheduleData = {};
        
        switch(scheduleType) {
            case 'date':
                scheduleData.date = document.getElementById('specificDate').value;
                break;
            case 'birthday':
                scheduleData.date = document.getElementById('birthdayDate').value;
                break;
            case 'graduation':
                scheduleData.date = document.getElementById('graduationDate').value;
                break;
            case 'milestone':
                scheduleData.type = document.getElementById('milestoneType').value;
                scheduleData.date = document.getElementById('milestoneDate').value;
                break;
            case 'surprise':
                scheduleData.range = document.getElementById('surpriseRange').value;
                break;
            default:
                scheduleData.years = selectedYears;
        }

        try {
            const response = await fetch('/send_to_future_me', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email, 
                    letter, 
                    mood,
                    schedule: scheduleData,
                    timeCapsule: timeCapsuleItems
                })
            });
            const data = await response.json();
            if (data.success) {
                document.getElementById('futureMeStatus').textContent = 'Scheduled! You will receive your letter in the future.';
                document.getElementById('futureMeStatus').classList.remove('hidden');
                document.getElementById('futureMeError').classList.add('hidden');
            } else {
                document.getElementById('futureMeError').textContent = data.error || 'Error scheduling email.';
                document.getElementById('futureMeError').classList.remove('hidden');
            }
        } catch (error) {
            document.getElementById('futureMeError').textContent = 'Error scheduling email.';
            document.getElementById('futureMeError').classList.remove('hidden');
        }
    });

    // Toast notification
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}); 