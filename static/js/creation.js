document.addEventListener('DOMContentLoaded', function() {
    // Image Generation
    const imagePrompt = document.getElementById('imagePrompt');
    const generateImageButton = document.getElementById('generateImage');
    const imagePreview = document.getElementById('imagePreview');
    const generatedImage = document.getElementById('generatedImage');
    const selectedImage = document.getElementById('selectedImage');

    // Video Generation
    const selectedAudio = document.getElementById('selectedAudio');
    const generateVideoButton = document.getElementById('generateVideo');
    const videoPreview = document.getElementById('videoPreview');
    const generatedVideo = document.getElementById('generatedVideo');

    // Output Format Selection
    const outputFormats = document.querySelectorAll('[data-format]');
    let selectedFormat = null;

    let selectedTheme = null;
    let capsuleVisualFilename = null;
    let capsuleMusicFilename = null;
    let capsuleVideoFilename = null;
    let enhancedCapsuleMessage = '';

    // Theme Selection
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('bg-indigo-600', 'bg-pink-600', 'bg-green-600', 'bg-yellow-600'));
            this.classList.add('bg-indigo-600');
            selectedTheme = this.dataset.theme;
            
            // Automatically generate content after theme selection
            await generateContent();
        });
    });

    // Automatic content generation
    async function generateContent() {
        try {
            // Generate image
            const imageResponse = await fetch('/generate_image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: imagePrompt.value || selectedTheme,
                    style: selectedTheme
                })
            });
            const imageData = await imageResponse.json();
            if (imageData.success) {
                generatedImage.src = `/static/uploads/${imageData.filename}`;
                imagePreview.classList.remove('hidden');
                
                // Add to select dropdown
                const option = document.createElement('option');
                option.value = imageData.filename;
                option.textContent = `Portrait ${selectedImage.options.length + 1}`;
                selectedImage.appendChild(option);
                selectedImage.value = imageData.filename;

                // Generate music after image is ready
                const musicResponse = await fetch('/generate_music', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ genre: selectedTheme })
                });
                const musicData = await musicResponse.json();
                if (musicData.success) {
                    // Add to select dropdown
                    const audioOption = document.createElement('option');
                    audioOption.value = musicData.filename;
                    audioOption.textContent = `Music ${selectedAudio.options.length + 1}`;
                    selectedAudio.appendChild(audioOption);
                    selectedAudio.value = musicData.filename;

                    // Generate video after music is ready
                    const videoResponse = await fetch('/generate_video', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            image: imageData.filename,
                            audio: musicData.filename
                        })
                    });
                    const videoData = await videoResponse.json();
                    if (videoData.success) {
                        generatedVideo.src = `/static/uploads/${videoData.filename}`;
                        videoPreview.classList.remove('hidden');
                    }
                }
            }
        } catch (error) {
            console.error('Error generating content:', error);
        }
    }

    // Enhance Capsule Message
    document.getElementById('enhanceCapsuleMessageBtn').addEventListener('click', async function() {
        const msg = document.getElementById('capsuleMessageInput').value;
        if (!msg) {
            showError('capsuleMessageError', 'Please write a message first!');
            return;
        }
        try {
            const response = await fetch('/enhance_lyrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lyrics: msg, genre: selectedTheme || 'future', type: 'capsule' })
            });
            const data = await response.json();
            if (data.success) {
                enhancedCapsuleMessage = data.enhanced_lyrics || data.enhanced_text;
                document.getElementById('capsuleMessageInput').value = enhancedCapsuleMessage;
                showToast('Message enhanced!');
            } else {
                showError('capsuleMessageError', data.error || 'Error enhancing message');
            }
        } catch (error) {
            showError('capsuleMessageError', 'Error enhancing message');
        }
    });

    // Generate Capsule Visuals
    document.getElementById('generateCapsuleVisualBtn').addEventListener('click', async function() {
        try {
            const response = await fetch('/generate_image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: enhancedCapsuleMessage || document.getElementById('capsuleMessageInput').value, style: selectedTheme || 'future' })
            });
            const data = await response.json();
            if (data.success) {
                capsuleVisualFilename = data.filename;
                const img = document.getElementById('capsuleVisualImage');
                img.src = `/static/uploads/${data.filename}?t=${Date.now()}`;
                document.getElementById('capsuleVisualPreview').classList.remove('hidden');
                document.getElementById('downloadCapsuleVisual').href = `/static/uploads/${data.filename}`;
                showToast('Visual generated!');
            } else {
                showError('capsuleVisualError', data.error || 'Error generating visual');
            }
        } catch (error) {
            showError('capsuleVisualError', 'Error generating visual');
        }
    });

    // Generate Capsule Music
    document.getElementById('generateCapsuleMusicBtn').addEventListener('click', async function() {
        try {
            const response = await fetch('/generate_music', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lyrics: '', genre: 'ambient' })
            });
            const data = await response.json();
            if (data.success) {
                capsuleMusicFilename = data.filename;
                const audio = document.getElementById('capsuleMusicAudio');
                audio.src = `/static/uploads/${data.filename}?t=${Date.now()}`;
                document.getElementById('capsuleMusicPreview').classList.remove('hidden');
                document.getElementById('downloadCapsuleMusic').href = `/static/uploads/${data.filename}`;
                showToast('Soundtrack generated!');
            } else {
                showError('capsuleMusicError', data.error || 'Error generating soundtrack');
            }
        } catch (error) {
            showError('capsuleMusicError', 'Error generating soundtrack');
        }
    });

    // Generate Capsule Video (Simulated)
    document.getElementById('generateCapsuleVideoBtn').addEventListener('click', function() {
        // Simulate video generation with a placeholder
        capsuleVideoFilename = 'demo_capsule_video.mp4';
        const video = document.getElementById('capsuleVideo');
        video.src = '/static/demo/demo_capsule_video.mp4';
        document.getElementById('capsuleVideoPreview').classList.remove('hidden');
        document.getElementById('downloadCapsuleVideo').href = '/static/demo/demo_capsule_video.mp4';
        showToast('Demo video ready!');
    });

    // Send to Future Me (Demo)
    document.getElementById('sendToFutureMeBtn').addEventListener('click', function() {
        document.getElementById('futureMeConfirmation').classList.remove('hidden');
        showToast('Scheduled for the future! (Demo)');
    });

    // Populate Summary
    function updateSummary() {
        const summary = document.getElementById('capsuleSummary');
        summary.innerHTML = '';
        if (selectedTheme) summary.innerHTML += `<div><b>Theme:</b> ${selectedTheme}</div>`;
        if (enhancedCapsuleMessage) summary.innerHTML += `<div><b>Message:</b> ${enhancedCapsuleMessage}</div>`;
        if (capsuleVisualFilename) summary.innerHTML += `<div><b>Visual:</b> <img src="/static/uploads/${capsuleVisualFilename}" class="w-32 inline-block align-middle"/></div>`;
        if (capsuleMusicFilename) summary.innerHTML += `<div><b>Soundtrack:</b> <audio src="/static/uploads/${capsuleMusicFilename}" controls class="inline-block align-middle"></audio></div>`;
        if (capsuleVideoFilename) summary.innerHTML += `<div><b>Video:</b> <video src="/static/demo/demo_capsule_video.mp4" controls class="w-32 inline-block align-middle"></video></div>`;
    }

    // Show toast
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
        updateSummary();
    }

    // Show error
    function showError(id, msg) {
        const el = document.getElementById(id);
        el.textContent = msg;
        el.classList.remove('hidden');
        setTimeout(() => el.classList.add('hidden'), 4000);
    }

    // Output format selection
    outputFormats.forEach(format => {
        format.addEventListener('click', function() {
            outputFormats.forEach(f => f.classList.remove('bg-indigo-600'));
            this.classList.add('bg-indigo-600');
            selectedFormat = this.dataset.format;
        });
    });

    // Generate Landing Page
    document.getElementById('generateLandingPage').addEventListener('click', async () => {
        if (!selectedFormat) {
            alert('Please select an output format');
            return;
        }

        // Collect all the generated content
        const profileData = {
            format: selectedFormat,
            image: selectedImage.value,
            audio: selectedAudio.value,
            video: generatedVideo.src ? generatedVideo.src.split('/').pop() : null
        };

        try {
            const response = await fetch('/generate_landing_page', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    profile_data: profileData
                })
            });

            const data = await response.json();
            if (data.success) {
                // Open the generated landing page in a new tab
                window.open(data.url, '_blank');
            } else {
                alert('Error generating landing page: ' + data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error generating landing page');
        }
    });

    // Load existing audio files
    loadAudioFiles();
});

// Load available audio files
async function loadAudioFiles() {
    try {
        const response = await fetch('/audio_files');
        const data = await response.json();
        
        if (data.success) {
            data.files.forEach(file => {
                const option = document.createElement('option');
                option.value = file;
                option.textContent = file.split('_').pop().replace('.mp3', '');
                selectedAudio.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading audio files:', error);
    }
} 