document.addEventListener('DOMContentLoaded', function() {
    let selectedGenre = null;
    let enhancedLetter = '';

    // Function to get the latest profile
    async function getLatestProfile() {
        try {
            const response = await fetch('/get_profiles');
            const data = await response.json();
            if (data.success && data.profiles && data.profiles.length > 0) {
                // Get the most recent profile
                return data.profiles[data.profiles.length - 1];
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
        return null;
    }

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
    if (enhanceLyricsBtn) {
        enhanceLyricsBtn.addEventListener('click', async function() {
            // Show loading state
            const button = this;
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating Letter...';
            button.disabled = true;
            const mood = document.getElementById('moodSelector').value;
            try {
                // Get the latest profile data
                const profile = await getLatestProfile();
                const quote = profile ? profile.quote : '';
                
                const response = await fetch('/enhance_lyrics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        genre: mood,
                        quote: quote
                    })
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
                alert('Error generating letter.');
            } finally {
                // Restore button state
                button.innerHTML = originalText;
                button.disabled = false;
            }
        });
    }

    // Use Enhanced Letter for Email
    const useEnhancedLetterBtn = document.getElementById('useEnhancedLetterBtn');
    if (useEnhancedLetterBtn) {
        useEnhancedLetterBtn.addEventListener('click', async function() {
            if (enhancedLetter) {
                
                // Show the confirmation message with animation
                const confirmationDiv = document.getElementById('enhancedLetterConfirmation');
                confirmationDiv.classList.remove('hidden');
                confirmationDiv.classList.add('animate-fadeIn');
                
                // Scroll the confirmation message into view
                confirmationDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                
                // Highlight the email section to guide the user
                const emailSection = document.getElementById('futureEmail');
                if (emailSection) {
                    emailSection.classList.add('border-2', 'border-green-500', 'animate-pulse');
                    setTimeout(() => {
                        emailSection.classList.remove('border-2', 'border-green-500', 'animate-pulse');
                    }, 3000);
                }
            }
        });
    }

    // Letter narration (AI voiceover)
    const narratePoemBtn = document.getElementById('narratePoemBtn');
    if (narratePoemBtn) {
        narratePoemBtn.addEventListener('click', async function() {
            console.log('=== Generate Voiceover Process ===');
            console.log('1. Button clicked');
            
            const enhancedLetterText = document.getElementById('enhancedLetterOutput')?.value || '';
            const originalLetterText = document.getElementById('lyricsInput')?.value || '';
            const letter = enhancedLetterText || originalLetterText;
            
            console.log('2. Letter content:');
            console.log('- Enhanced letter available:', Boolean(enhancedLetterText));
            console.log('- Original letter available:', Boolean(originalLetterText));
            console.log('- Final text length:', letter.length);
            console.log('- First 100 chars:', letter.substring(0, 100));
            
            if (!letter) {
                console.log('Error: No letter content available');
                alert('Please write or enhance your letter first!');
                return;
            }

            // Show loading state
            const button = this;
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            button.disabled = true;

            try {
                console.log('3. Sending request to /generate_voice');
                const response = await fetch('/generate_voice', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: letter })
                });

                console.log('4. Received response');
                const data = await response.json();
                console.log('5. Response data:', data);

                if (data.success && data.filename) {
                    console.log('6. Success! Audio filename:', data.filename);
                    const audioUrl = `/static/uploads/${data.filename}?t=${Date.now()}`;
                    console.log('Generated audio URL:', audioUrl);
                    
                    const audioElement = document.getElementById('poemVoiceAudio');
                    const downloadLink = document.getElementById('downloadPoemVoice');
                    const previewDiv = document.getElementById('poemVoicePreview');
                    
                    if (audioElement && downloadLink && previewDiv) {
                        audioElement.src = audioUrl;
                        downloadLink.href = audioUrl;
                        previewDiv.classList.remove('hidden');
                        document.getElementById('poemVoiceError')?.classList.add('hidden');
                    } else {
                        console.error('Missing audio elements:', { audioElement, downloadLink, previewDiv });
                        throw new Error('Missing audio elements in the DOM');
                    }
                } else {
                    console.log('6. Error: Missing filename in response');
                    const errorDiv = document.getElementById('poemVoiceError');
                    if (errorDiv) {
                        errorDiv.textContent = data.error || 'Error generating voiceover: No audio file received';
                        errorDiv.classList.remove('hidden');
                    }
                }
            } catch (error) {
                console.log('6. Catch block error:', error);
                const errorDiv = document.getElementById('poemVoiceError');
                if (errorDiv) {
                    errorDiv.textContent = 'Error generating voiceover';
                    errorDiv.classList.remove('hidden');
                }
            } finally {
                // Restore button state
                button.innerHTML = originalText;
                button.disabled = false;
            }
        });
    }

    // Send to Future Me
    const sendToFutureBtn = document.getElementById('sendToFutureBtn');
    if (sendToFutureBtn) {
        sendToFutureBtn.addEventListener('click', async function() {
            const email = document.getElementById('futureEmail').value;
            const letter = document.getElementById('lyricsInput').value;
            const selectedYearsBtn = document.querySelector('.futureBtn.selected');
            const years = selectedYearsBtn ? selectedYearsBtn.dataset.years : '1';

            if (!email || !letter) {
                alert('Please enter your email and write a letter.');
                return;
            }

            try {
                const response = await fetch('/send_to_future_me', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: email,
                        letter: letter,
                        years: years
                    })
                });

                const data = await response.json();
                if (data.success) {
                    const statusDiv = document.getElementById('futureMeStatus');
                    if (statusDiv) {
                        statusDiv.textContent = `Letter scheduled to be sent in ${years} year(s)!`;
                        statusDiv.classList.remove('hidden');
                    }
                } else {
                    const errorDiv = document.getElementById('futureMeError');
                    if (errorDiv) {
                        errorDiv.textContent = data.error || 'Error sending letter';
                        errorDiv.classList.remove('hidden');
                    }
                }
            } catch (error) {
                const errorDiv = document.getElementById('futureMeError');
                if (errorDiv) {
                    errorDiv.textContent = 'Error sending letter';
                    errorDiv.classList.remove('hidden');
                }
            }
        });

        // Future Me year selection
        document.querySelectorAll('.futureBtn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.futureBtn').forEach(b => {
                    b.classList.remove('selected');
                    b.classList.remove('bg-indigo-800');
                    b.classList.add('bg-indigo-600');
                });
                this.classList.add('selected');
                this.classList.remove('bg-indigo-600');
                this.classList.add('bg-indigo-800');
                this.classList.add('scale-110');
            });
        });
    }
}); 