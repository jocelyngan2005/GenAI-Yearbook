document.addEventListener('DOMContentLoaded', function() {
    // Image Generation
    const imageStyle = document.getElementById('imageStyle');
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

    // Generate Image
    generateImageButton.addEventListener('click', async () => {
        const style = imageStyle.value;
        const prompt = imagePrompt.value.trim();
        
        if (!prompt) {
            alert('Please add some details for your portrait');
            return;
        }

        try {
            const response = await fetch('/generate_image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    style,
                    prompt
                })
            });

            const data = await response.json();
            if (data.success) {
                generatedImage.src = `/audio/${data.filename}`;
                imagePreview.classList.remove('hidden');
                
                // Add to select dropdown
                const option = document.createElement('option');
                option.value = data.filename;
                option.textContent = `Portrait ${selectedImage.options.length + 1}`;
                selectedImage.appendChild(option);
            } else {
                alert('Error generating image: ' + data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error generating image');
        }
    });

    // Generate Video
    generateVideoButton.addEventListener('click', async () => {
        const imageFile = selectedImage.value;
        const audioFile = selectedAudio.value;
        
        if (!imageFile || !audioFile) {
            alert('Please select both an image and audio file');
            return;
        }

        try {
            const response = await fetch('/generate_video', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image_file: imageFile,
                    audio_file: audioFile
                })
            });

            const data = await response.json();
            if (data.success) {
                generatedVideo.src = `/audio/${data.filename}`;
                videoPreview.classList.remove('hidden');
            } else {
                alert('Error generating video: ' + data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error generating video');
        }
    });

    // Output Format Selection
    outputFormats.forEach(format => {
        format.addEventListener('click', () => {
            // Remove selection from other formats
            outputFormats.forEach(f => f.classList.remove('ring-2', 'ring-blue-500'));
            
            // Add selection to clicked format
            format.classList.add('ring-2', 'ring-blue-500');
            selectedFormat = format.dataset.format;
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

    // Initialize
    loadAudioFiles();
}); 