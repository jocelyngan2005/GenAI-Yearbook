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

    // Music Generation
    const musicGenre = document.getElementById('musicGenre');
    const generateMusicButton = document.getElementById('generateMusic');
    const musicPreview = document.getElementById('musicPreview');
    const generatedMusic = document.getElementById('generatedMusic');

    // Audio Upload
    const uploadAudioInput = document.getElementById('uploadAudioInput');

    // Enhance Lyrics
    const enhanceLyricsButton = document.getElementById('enhanceLyrics');
    const enhancedLyrics = document.getElementById('enhancedLyrics');

    // Voice-to-Singing Conversion
    const convertToSingingBtn = document.getElementById('convertToSinging');
    const singingPreview = document.getElementById('singingPreview');
    const singingAudio = document.getElementById('singingAudio');

    // Album Art Generation
    const generateAlbumArtBtn = document.getElementById('generateAlbumArt');
    const albumArtPreview = document.getElementById('albumArtPreview');
    const albumArtImage = document.getElementById('albumArtImage');

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

    recordButton.addEventListener('click', async () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            stopRecording();
        } else {
            await startRecording();
        }
    });

    // Upload Audio: Send to /generate_voice
    uploadAudioInput.addEventListener('change', async function() {
        const file = this.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('audio', file);
            try {
                const response = await fetch('/generate_voice', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                if (data.success) {
                    audioPreview.src = `/audio/${data.filename}`;
                    audioPreview.classList.remove('hidden');
                    recordingStatus.textContent = 'Audio file uploaded and processed.';
                } else {
                    alert('Error processing audio: ' + data.error);
                }
            } catch (error) {
                alert('Error processing audio');
            }
        }
    });

    // Enhance Lyrics: POST to /enhance_lyrics
    enhanceLyricsButton.addEventListener('click', async () => {
        const lyrics = lyricsInput.value.trim();
        if (!lyrics) {
            alert('Please enter some lyrics first');
            return;
        }
        try {
            const response = await fetch('/enhance_lyrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lyrics })
            });
            const data = await response.json();
            if (data.success) {
                enhancedLyrics.textContent = data.enhanced_text || data.enhanced_lyrics;
                enhancedLyrics.classList.remove('hidden');
            } else {
                alert('Error enhancing lyrics: ' + data.error);
            }
        } catch (error) {
            alert('Error enhancing lyrics');
        }
    });

    // Music Generation: POST to /generate_music
    generateMusicButton.addEventListener('click', async () => {
        const lyrics = lyricsInput.value.trim();
        if (!lyrics) {
            alert('Please enter some lyrics first');
            return;
        }
        try {
            const response = await fetch('/generate_music', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lyrics, genre: musicGenre.value })
            });
            const data = await response.json();
            if (data.success) {
                generatedMusic.src = `/audio/${data.filename}`;
                musicPreview.classList.remove('hidden');
            } else {
                alert('Error generating music: ' + data.error);
            }
        } catch (error) {
            alert('Error generating music');
        }
    });

    // Save and Continue
    document.getElementById('saveAndContinue').addEventListener('click', () => {
        // Here you would typically save all the generated content
        // and proceed to the next step
        window.location.href = '/creation';  // Next step URL
    });

    // Voice-to-Singing Conversion: POST to /voice_to_singing
    convertToSingingBtn.addEventListener('click', async () => {
        if (!audioPreview.src || !lyricsInput.value.trim()) {
            alert('Please record or upload voice and enter lyrics.');
            return;
        }
        try {
            const response = await fetch('/voice_to_singing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lyrics: lyricsInput.value.trim() })
            });
            const data = await response.json();
            if (data.success) {
                singingAudio.src = `/audio/${data.filename}`;
                singingPreview.classList.remove('hidden');
            } else {
                alert('Error converting voice: ' + data.error);
            }
        } catch (error) {
            alert('Error converting voice');
        }
    });

    // Album Art Generation: POST to /generate_album_art
    generateAlbumArtBtn.addEventListener('click', async () => {
        const lyrics = lyricsInput.value.trim();
        if (!lyrics) {
            alert('Please enter some lyrics first');
            return;
        }
        try {
            const response = await fetch('/generate_album_art', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lyrics })
            });
            const data = await response.json();
            if (data.success) {
                albumArtImage.src = `/uploads/${data.filename}`;
                albumArtPreview.classList.remove('hidden');
            } else {
                alert('Error generating album art: ' + data.error);
            }
        } catch (error) {
            alert('Error generating album art');
        }
    });
}); 