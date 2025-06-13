document.addEventListener('DOMContentLoaded', function() {
    const addProfileCard = document.getElementById('addProfileCard');
    const profileModal = document.getElementById('profileModal');
    const profileForm = document.getElementById('profileForm');
    const photoUpload = document.getElementById('photoUpload');
    let uploadedPhotoFilename = null;
    let editingProfileId = null;

    // --- Spinner Overlay ---
    const spinnerOverlay = document.getElementById('spinnerOverlay');
    function showSpinner() { spinnerOverlay.classList.remove('hidden'); }
    function hideSpinner() { spinnerOverlay.classList.add('hidden'); }

    // --- Photo Upload Event Listener (robust) ---
    function attachPhotoUploadListener() {
        const photoUpload = document.getElementById('photoUpload');
        if (!photoUpload) return;
        photoUpload.onchange = async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('photo', file);
            try {
                showSpinner();
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                if (data.success) {
                    uploadedPhotoFilename = data.filename;
                    // Show preview of uploaded image
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const preview = document.createElement('img');
                        preview.src = e.target.result;
                        preview.className = 'w-full h-full object-cover rounded-lg';
                        const uploadArea = document.querySelector('.border-dashed');
                        uploadArea.innerHTML = '';
                        uploadArea.appendChild(preview);
                    };
                    reader.readAsDataURL(file);
                } else {
                    alert('Error uploading photo: ' + data.error);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error uploading photo');
            } finally {
                hideSpinner();
            }
        };
    }
    // Attach on page load
    attachPhotoUploadListener();

    // Open modal when clicking add profile card
    addProfileCard.addEventListener('click', () => {
        profileModal.classList.remove('hidden');
        editingProfileId = null;
        setTimeout(attachPhotoUploadListener, 0);
    });

    // --- Custom Confirmation Dialog ---
    function showConfirmDialog(message, confirmText, cancelText) {
        return new Promise((resolve) => {
            // Create dialog elements
            const overlay = document.createElement('div');
            overlay.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50';
            const dialog = document.createElement('div');
            dialog.className = 'bg-gray-900 rounded-lg p-8 max-w-sm w-full text-center shadow-lg';
            const msg = document.createElement('div');
            msg.className = 'mb-6 text-lg text-white';
            msg.textContent = message;
            const btnRow = document.createElement('div');
            btnRow.className = 'flex justify-center gap-4';
            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-white font-semibold';
            confirmBtn.textContent = confirmText;
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'px-4 py-2 bg-gray-700 hover:bg-gray-800 rounded text-white font-semibold';
            cancelBtn.textContent = cancelText;
            btnRow.appendChild(confirmBtn);
            btnRow.appendChild(cancelBtn);
            dialog.appendChild(msg);
            dialog.appendChild(btnRow);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            confirmBtn.onclick = () => { document.body.removeChild(overlay); resolve(true); };
            cancelBtn.onclick = () => { document.body.removeChild(overlay); resolve(false); };
        });
    }

    // --- Event Delegation for Edit/Delete Buttons ---
    const profileGrid = document.getElementById('profileGrid');
    profileGrid.addEventListener('click', async function(e) {
        // Edit button
        if (e.target.closest('.edit-profile-btn')) {
            e.stopPropagation();
            const btn = e.target.closest('.edit-profile-btn');
            const card = btn.closest('.profile-card');
            const profile = JSON.parse(card.getAttribute('data-profile'));
            // Fill modal fields
            profileModal.classList.remove('hidden');
            editingProfileId = profile.id;
            uploadedPhotoFilename = profile.photo;
            profileForm.elements['firstName'].value = profile.firstName || '';
            profileForm.elements['lastName'].value = profile.lastName || '';
            profileForm.elements['style'].value = profile.style || '';
            profileForm.elements['quote'].value = profile.quote || '';
            profileForm.elements['funFact'].value = profile.funFact || '';
            // Show preview image
            const uploadArea = document.querySelector('.border-dashed');
            uploadArea.innerHTML = `<img src='/static/uploads/${profile.photo}' class='w-full h-full object-cover rounded-lg'/>`;
            setTimeout(attachPhotoUploadListener, 0);
        }
        // Delete button
        if (e.target.closest('.delete-profile-btn')) {
            e.stopPropagation();
            const btn = e.target.closest('.delete-profile-btn');
            const card = btn.closest('.profile-card');
            const profile = JSON.parse(card.getAttribute('data-profile'));
            const confirmed = await showConfirmDialog(`Are you sure you want to delete the profile for ${profile.firstName || 'this user'}?`, 'Delete', 'Cancel');
            if (!confirmed) return;
            showSpinner();
            try {
                const response = await fetch('/delete_profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: profile.id })
                });
                const result = await response.json();
                if (result.success) {
                    lastDeletedProfile = profile;
                    showToast('Profile deleted!', true);
                    card.style.display = 'none';
                    setTimeout(() => {
                        toast.classList.add('hidden');
                        lastDeletedProfile = null;
                        location.reload();
                    }, 5000);
                } else {
                    alert('Error deleting profile');
                }
            } finally {
                hideSpinner();
            }
        }
    });

    // Close modal function
    window.closeModal = function() {
        profileModal.classList.add('hidden');
        profileForm.reset();
        editingProfileId = null;
        uploadedPhotoFilename = null;
        const uploadArea = document.querySelector('.border-dashed');
        uploadArea.innerHTML = `
            <div class="space-y-1 text-center">
                <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <div class="flex text-sm text-gray-400">
                    <label class="relative cursor-pointer rounded-md font-medium text-indigo-400 hover:text-indigo-300">
                        <span>Upload a file</span>
                        <input type="file" class="sr-only" accept="image/*" id="photoUpload">
                    </label>
                </div>
            </div>
        `;
        setTimeout(attachPhotoUploadListener, 0);
    };

    // --- Confirm on Save (Edit/Create) ---
    profileForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!uploadedPhotoFilename) {
            alert('Please upload a photo first');
            return;
        }
        const formData = new FormData(profileForm);
        const data = {
            photo: uploadedPhotoFilename,
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            style: formData.get('style'),
            quote: formData.get('quote'),
            funFact: formData.get('funFact')
        };
        const confirmed = await showConfirmDialog('Save changes to this profile?', 'Save', 'Discard');
        if (!confirmed) {
            closeModal();
            return;
        }
        try {
            let response, result;
            showSpinner();
            if (editingProfileId) {
                data.id = parseInt(editingProfileId, 10);
                console.log('Submitting update_profile with id:', data.id, data);
                response = await fetch('/update_profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            } else {
                console.log('Submitting save_profile:', data);
                response = await fetch('/save_profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            }
            result = await response.json();
            if (result.success) {
                closeModal();
                showToast(editingProfileId ? 'Profile updated!' : 'Profile created!');
                setTimeout(() => location.reload(), 1200);
            } else {
                alert('Error saving profile');
                console.error('Save error:', result);
            }
        } catch (error) {
            alert('Error saving profile');
            console.error('Save error:', error);
        } finally {
            hideSpinner();
        }
    });

    // Profile Details Modal logic
    const profileDetailsModal = document.getElementById('profileDetailsModal');
    const closeDetailsModal = document.getElementById('closeDetailsModal');
    const detailsPhoto = document.getElementById('detailsPhoto');
    const detailsName = document.getElementById('detailsName');
    const detailsStyle = document.getElementById('detailsStyle');
    const detailsQuote = document.getElementById('detailsQuote');
    const detailsFunFact = document.getElementById('detailsFunFact');
    const detailsAvatar = document.getElementById('detailsAvatar');
    // Toast
    const toast = document.getElementById('toast');

    // Show profile details modal
    document.querySelectorAll('.profile-card').forEach(card => {
        card.addEventListener('click', function(e) {
            // Prevent modal if edit/delete button was clicked
            if (e.target.closest('.edit-profile-btn') || e.target.closest('.delete-profile-btn')) return;
            const profile = JSON.parse(card.getAttribute('data-profile'));
            if (profile.photo) {
                detailsPhoto.src = `/static/uploads/${profile.photo}`;
                detailsPhoto.style.display = '';
                detailsAvatar.style.display = 'none';
            } else {
                detailsPhoto.style.display = 'none';
                detailsAvatar.style.display = '';
            }
            detailsName.textContent = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
            detailsStyle.textContent = profile.style ? profile.style.charAt(0).toUpperCase() + profile.style.slice(1) : '';
            detailsQuote.textContent = profile.quote || '';
            detailsFunFact.textContent = profile.funFact || '';
            profileDetailsModal.classList.remove('hidden');
        });
    });
    // Close modal logic
    closeDetailsModal.addEventListener('click', () => profileDetailsModal.classList.add('hidden'));
    profileDetailsModal.addEventListener('click', (e) => {
        if (e.target === profileDetailsModal) profileDetailsModal.classList.add('hidden');
    });

    // Toast notification logic
    function showToast(message, undo = false) {
        toast.textContent = message;
        if (undo) {
            undoDeleteBtn.classList.remove('hidden');
        } else {
            undoDeleteBtn.classList.add('hidden');
        }
        toast.classList.remove('hidden');
        setTimeout(() => {
            if (!undo) toast.classList.add('hidden');
        }, 2500);
    }

    // Card hover/scale effect (add via JS for smoothness)
    document.querySelectorAll('.profile-card').forEach(card => {
        card.addEventListener('mouseenter', () => card.style.transform = 'scale(1.04)');
        card.addEventListener('mouseleave', () => card.style.transform = 'scale(1)');
        card.style.transition = 'transform 0.2s cubic-bezier(.4,2,.3,1)';
    });

    // --- Profile Filtering and Sorting ---
    const profileSearch = document.getElementById('profileSearch');
    const profileSort = document.getElementById('profileSort');
    let allProfiles = Array.from(document.querySelectorAll('.profile-card')).map(card => ({
        card,
        data: JSON.parse(card.getAttribute('data-profile'))
    }));
    function renderProfiles() {
        let search = profileSearch.value.trim().toLowerCase();
        let sort = profileSort.value;
        let filtered = allProfiles.filter(({data}) => {
            return (
                (data.firstName && data.firstName.toLowerCase().includes(search)) ||
                (data.lastName && data.lastName.toLowerCase().includes(search)) ||
                (data.style && data.style.toLowerCase().includes(search))
            );
        });
        // Sorting
        filtered.sort((a, b) => {
            if (sort === 'date_desc') return (b.data.created_at || '').localeCompare(a.data.created_at || '');
            if (sort === 'date_asc') return (a.data.created_at || '').localeCompare(b.data.created_at || '');
            if (sort === 'name_asc') return ((a.data.firstName || '') + (a.data.lastName || '')).localeCompare((b.data.firstName || '') + (b.data.lastName || ''));
            if (sort === 'name_desc') return ((b.data.firstName || '') + (b.data.lastName || '')).localeCompare((a.data.firstName || '') + (a.data.lastName || ''));
            if (sort === 'style_asc') return (a.data.style || '').localeCompare(b.data.style || '');
            if (sort === 'style_desc') return (b.data.style || '').localeCompare(a.data.style || '');
            return 0;
        });
        // Remove all except add card
        Array.from(profileGrid.children).forEach(child => {
            if (!child.id || child.id !== 'addProfileCard') child.style.display = 'none';
        });
        // Show filtered
        filtered.forEach(({card}) => card.style.display = '');
        // No need to re-attach listeners (event delegation handles it)
    }
    profileSearch.addEventListener('input', renderProfiles);
    profileSort.addEventListener('change', renderProfiles);
    renderProfiles();

    // --- Soft Delete & Undo ---
    let lastDeletedProfile = null;
    let lastDeletedIndex = null;
    const undoDeleteBtn = document.getElementById('undoDeleteBtn');
    const toastMessage = document.getElementById('toastMessage');
    function showToast(message, undo = false) {
        toastMessage.textContent = message;
        if (undo) {
            undoDeleteBtn.classList.remove('hidden');
        } else {
            undoDeleteBtn.classList.add('hidden');
        }
        toast.classList.remove('hidden');
        setTimeout(() => {
            if (!undo) toast.classList.add('hidden');
        }, 2500);
    }
    undoDeleteBtn.onclick = async function() {
        if (!lastDeletedProfile) return;
        showSpinner();
        // Re-create profile
        try {
            const response = await fetch('/save_profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(lastDeletedProfile)
            });
            const result = await response.json();
            if (result.success) {
                showToast('Profile restored!');
                setTimeout(() => location.reload(), 1200);
            }
        } finally {
            hideSpinner();
            lastDeletedProfile = null;
        }
    };
}); 