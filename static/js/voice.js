document.addEventListener('DOMContentLoaded', function() {
    // Voice Recording
    const recordButton = document.getElementById('recordButton');
    const recordingTimer = document.getElementById('recordingTimer');
    const recordingStatus = document.getElementById('recordingStatus');
    const audioPreview = document.getElementById('audioPreview');
    let mediaRecorder;
    let audioChunks = [];
    let recordingStartTime;
    let timerInterval;

    // Lyrics Enhancement
    const lyricsInput = document.getElementById('lyricsInput');
    const enhanceLyricsButton = document.getElementById('enhanceLyrics');
    const enhancedLyrics = document.getElementById('enhancedLyrics');

    // Music Generation
    const musicGenre = document.getElementById('musicGenre');
    const generateMusicButton = document.getElementById('generateMusic');
    const musicPreview = document.getElementById('musicPreview');
    const generatedMusic = document.getElementById('generatedMusic');

    // Voice Generation
    const voiceStyle = document.getElementById('voiceStyle');
    const generateVoiceButton = document.getElementById('generateVoice');
    const voicePreview = document.getElementById('voicePreview');
    const generatedVoice = document.getElementById('generatedVoice');

    // Voice Recording Functions
    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);
                audioPreview.src = audioUrl;
                audioPreview.classList.remove('hidden');
            };

            mediaRecorder.start();
            recordingStartTime = Date.now();
            updateTimer();
            timerInterval = setInterval(updateTimer, 1000);
            recordingTimer.classList.remove('hidden');
            recordingStatus.textContent = 'Recording...';
            recordButton.textContent = 'Stop Recording';
            recordButton.classList.remove('bg-red-600');
            recordButton.classList.add('bg-red-800');
        } catch (error) {
            console.error('Error accessing microphone:', error);
            recordingStatus.textContent = 'Error accessing microphone';
        }
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            clearInterval(timerInterval);
            recordingTimer.classList.add('hidden');
            recordingStatus.textContent = 'Recording saved';
            recordButton.textContent = 'Record';
            recordButton.classList.remove('bg-red-800');
            recordButton.classList.add('bg-red-600');
        }
    }

    function updateTimer() {
        const elapsedTime = Math.floor((Date.now() - recordingStartTime) / 1000);
        const minutes = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
        const seconds = (elapsedTime % 60).toString().padStart(2, '0');
        recordingTimer.textContent = `${minutes}:${seconds}`;
    }

    recordButton.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            stopRecording();
        } else {
            startRecording();
        }
    });

    // Lyrics Enhancement
    enhanceLyricsButton.addEventListener('click', async () => {
        const lyrics = lyricsInput.value.trim();
        if (!lyrics) {
            alert('Please enter some lyrics first');
            return;
        }

        try {
            const response = await fetch('/enhance_lyrics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ lyrics })
            });

            const data = await response.json();
            if (data.success) {
                enhancedLyrics.textContent = data.enhanced_lyrics;
                enhancedLyrics.classList.remove('hidden');
            } else {
                alert('Error enhancing lyrics: ' + data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error enhancing lyrics');
        }
    });

    // Music Generation
    generateMusicButton.addEventListener('click', async () => {
        const lyrics = lyricsInput.value.trim();
        if (!lyrics) {
            alert('Please enter some lyrics first');
            return;
        }

        try {
            const response = await fetch('/generate_music', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    lyrics,
                    genre: musicGenre.value
                })
            });

            const data = await response.json();
            if (data.success) {
                generatedMusic.src = `/audio/${data.filename}`;
                musicPreview.classList.remove('hidden');
            } else {
                alert('Error generating music: ' + data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error generating music');
        }
    });

    // Voice Generation
    generateVoiceButton.addEventListener('click', async () => {
        const lyrics = lyricsInput.value.trim();
        if (!lyrics) {
            alert('Please enter some lyrics first');
            return;
        }

        try {
            const response = await fetch('/generate_voice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: lyrics,
                    voice_id: voiceStyle.value
                })
            });

            const data = await response.json();
            if (data.success) {
                generatedVoice.src = `/audio/${data.filename}`;
                voicePreview.classList.remove('hidden');
            } else {
                alert('Error generating voice: ' + data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error generating voice');
        }
    });

    // Save and Continue
    document.getElementById('saveAndContinue').addEventListener('click', () => {
        // Here you would typically save all the generated content
        // and proceed to the next step
        window.location.href = '/creation';  // Next step URL
    });
}); 