// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAgY2WQW00zlDVTAp9YVPbxFy_lU04iqTA",
  authDomain: "ai-chatbot-a0107.firebaseapp.com",
  databaseURL: "https://ai-chatbot-a0107-default-rtdb.firebaseio.com",
  projectId: "ai-chatbot-a0107",
  storageBucket: "ai-chatbot-a0107.firebasestorage.app",
  messagingSenderId: "921898897940",
  appId: "1:921898897940:web:5b6f59a47d9b46d7308d01",
  measurementId: "G-J67DFPCXJC"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const realtimeDb = firebase.database();

document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements for menu
    const menuButton = document.getElementById('menu-button');
    const sideMenu = document.getElementById('side-menu');
    const menuOverlay = document.getElementById('menu-overlay');
    const menuClose = document.getElementById('menu-close');
    const profilePic = document.getElementById('profile-pic');
    const usernameEl = document.getElementById('username');
    const userEmailEl = document.getElementById('user-email');
    const logoutBtn = document.getElementById('logout-btn');
    const profileSettings = document.getElementById('profile-settings');
    const themeToggle = document.getElementById('theme-toggle');
    const chatRoomsContainer = document.getElementById('chat-rooms');
    const globalLastTime = document.getElementById('global-last-time');
    const globalLastSender = document.getElementById('global-last-sender');
    const globalLastMessage = document.getElementById('global-last-message');
    const aboutFunChat = document.getElementById('about-funchat');
    const accentThemeToggle = document.getElementById('accent-theme-toggle');
    const accentThemeOptions = document.getElementById('accent-theme-options');
    const colorOptions = document.querySelectorAll('.color-option');
    const fontSettingsToggle = document.getElementById('font-settings-toggle');
    const fontSettingsOptions = document.getElementById('font-settings-options');
    const fontOptions = document.querySelectorAll('.font-option');
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsSection = document.getElementById('settings-section');
    
    let currentUser = null;
    
    // Check if user is logged in
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            // Update UI with user info
            updateUserInfo(user);
            // Load chat rooms
            loadChatRooms();
            // Load global chat last message
            loadGlobalChatLastMessage();
        } else {
            // Redirect to login if not authenticated
            window.location.href = 'login.html';
        }
    });
    
    // Update user info in UI
    function updateUserInfo(user) {
        // Set username and email
        usernameEl.textContent = user.displayName || 'User';
        userEmailEl.textContent = user.email || '';
        
        // Set profile pic
        if (user.photoURL) {
            profilePic.innerHTML = `<img src="${user.photoURL}" alt="${user.displayName}" style="width:100%;height:100%;border-radius:50%;">`;
        } else {
            // Use first letter of display name as avatar
            const initials = (user.displayName || 'User').charAt(0).toUpperCase();
            profilePic.textContent = initials;
        }
    }
    
    // Load chat rooms
    function loadChatRooms() {
        // In a real app, you would fetch user's chat rooms from Firestore
        // For now, we'll just display the global chat
        
        // You can add code here to fetch and display user's personal chats
        db.collection('users').doc(currentUser.uid).collection('chats')
            .orderBy('lastMessageTime', 'desc')
            .get()
            .then(snapshot => {
                if (!snapshot.empty) {
                    snapshot.forEach(doc => {
                        const chatData = doc.data();
                        addChatRoomToUI(doc.id, chatData);
                    });
                }
            })
            .catch(error => {
                console.error("Error loading chat rooms: ", error);
            });
    }
    
    // Add a chat room to UI
    function addChatRoomToUI(id, data) {
        const roomElement = document.createElement('div');
        roomElement.className = 'chat-room';
        roomElement.setAttribute('data-id', id);
        roomElement.addEventListener('click', () => {
            window.location.href = `chat.html?id=${id}`;
        });
        
        // Format timestamp
        let timeString = 'Now';
        if (data.lastMessageTime) {
            const timestamp = data.lastMessageTime.toDate();
            const now = new Date();
            const diffDays = Math.floor((now - timestamp) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) {
                timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else if (diffDays === 1) {
                timeString = 'Yesterday';
        } else {
                timeString = timestamp.toLocaleDateString();
            }
        }
        
        roomElement.innerHTML = `
            <div class="room-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="room-details">
                <div class="room-header">
                    <div class="room-name">${data.name}</div>
                    <div class="last-message-time">${timeString}</div>
                </div>
                <div class="last-message">
                    <div class="message-sender">${data.lastMessageSender || 'System'}:</div>
                    <div>${data.lastMessageText || 'No messages yet'}</div>
                </div>
            </div>
        `;
        
        chatRoomsContainer.appendChild(roomElement);
    }
    
    // Load last message in global chat
    function loadGlobalChatLastMessage() {
        realtimeDb.ref('messages').orderByChild('timestamp').limitToLast(1).on('value', snapshot => {
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    const message = childSnapshot.val();
                    
                    // Format timestamp
                    let timeString = 'Now';
                    if (message.timestamp) {
                        const timestamp = new Date(message.timestamp);
                        const now = new Date();
                        const diffMs = now - timestamp;
                        const diffMins = Math.floor(diffMs / (1000 * 60));
                        
                        if (diffMins < 1) {
                            timeString = 'Now';
                        } else if (diffMins < 60) {
                            timeString = `${diffMins}m ago`;
        } else {
                            const diffHours = Math.floor(diffMins / 60);
                            if (diffHours < 24) {
                                timeString = `${diffHours}h ago`;
                            } else {
                                timeString = timestamp.toLocaleDateString();
                            }
                        }
                    }
                    
                    // Update UI
                    globalLastTime.textContent = timeString;
                    globalLastSender.textContent = message.displayName || 'Anonymous';
                    globalLastMessage.textContent = message.message;
                });
            }
        });
    }
    
    // Toggle menu
    menuButton.addEventListener('click', () => {
        sideMenu.classList.add('active');
        menuOverlay.classList.add('active');
    });
    
    menuClose.addEventListener('click', () => {
        sideMenu.classList.remove('active');
        menuOverlay.classList.remove('active');
    });
    
    menuOverlay.addEventListener('click', () => {
        sideMenu.classList.remove('active');
        menuOverlay.classList.remove('active');
    });
    
    // Logout handler
    function handleLogout() {
        auth.signOut().then(() => {
            window.location.href = 'login.html';
        }).catch(error => {
            console.error("Error signing out: ", error);
        });
    }
    
    logoutBtn.addEventListener('click', handleLogout);
    
    // Profile settings handler
    profileSettings.addEventListener('click', () => {
        // First close the side menu
        sideMenu.classList.remove('active');
        menuOverlay.classList.remove('active');
        
        // Only proceed if user is logged in
        if (currentUser) {
            // Update profile data in modal
            displayUsername.textContent = currentUser.displayName || 'User';
            displayEmail.textContent = currentUser.email || '';
            
            // Update profile picture
            updateProfilePicInModal();
            
            // Show the modal
            profileSettingsModal.style.display = 'flex';
            profileSettingsModal.style.opacity = '1';
            profileSettingsModal.style.pointerEvents = 'auto';
        }
    });
    
    // Simple Profile Settings Modal Functions
    const profileSettingsModal = document.getElementById('profileSettingsModal');
    const closeProfileBtn = document.getElementById('closeProfileBtn');
    const displayUsername = document.getElementById('displayUsername');
    const displayEmail = document.getElementById('displayEmail');
    const editUsernameBtn = document.getElementById('editUsernameBtn');
    const logoutProfileBtn = document.getElementById('logoutProfileBtn');
    const profilePicContainer = document.getElementById('profilePicContainer');
    const changeProfilePicBtn = document.getElementById('changeProfilePicBtn');
    const profilePicInput = document.getElementById('profilePicInput');
    
    // Update profile picture in the modal
    function updateProfilePicInModal() {
        if (currentUser.photoURL) {
            profilePicContainer.innerHTML = `<img src="${currentUser.photoURL}" alt="${currentUser.displayName}" style="width:100%; height:100%; object-fit:cover;">`;
        } else {
            // Use first letter of display name as avatar
            const initials = (currentUser.displayName || 'User').charAt(0).toUpperCase();
            profilePicContainer.innerHTML = initials;
        }
    }
    
    // Handle profile picture change
    changeProfilePicBtn.addEventListener('click', () => {
        profilePicInput.click();
    });
    
    profilePicInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate file type
        const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validImageTypes.includes(file.type)) {
            showCustomNotification('फ़ाइल प्रकार समर्थित नहीं है। कृपया JPEG, PNG, GIF या WEBP छवि चुनें।', 'error');
            return;
        }
        
        // Validate file size (max 2MB)
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (file.size > maxSize) {
            showCustomNotification('छवि बहुत बड़ी है। अधिकतम आकार 2MB है।', 'error');
            return;
        }
        
        // Create storage reference
        const storageRef = firebase.storage().ref();
        const profilePicRef = storageRef.child(`profile_pics/${currentUser.uid}`);
        
        // Show loading state
        profilePicContainer.innerHTML = `<div class="spinner" style="border:3px solid rgba(255,255,255,0.3); border-radius:50%; border-top:3px solid white; width:30px; height:30px; animation:spin 1s linear infinite;"></div>`;
        
        // Create preview first using FileReader
        const reader = new FileReader();
        reader.onload = (e) => {
            // Compress image if needed before upload
            const img = new Image();
            img.onload = () => {
                // Only compress if image is large
                if (file.size > 500 * 1024) {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to blob and upload
                    canvas.toBlob((blob) => {
                        uploadImageToFirebase(blob);
                    }, file.type, 0.85); // 85% quality
                } else {
                    // Small image, upload directly
                    uploadImageToFirebase(file);
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        
        function uploadImageToFirebase(fileOrBlob) {
            // Upload to Firebase Storage
            profilePicRef.put(fileOrBlob).then(snapshot => {
                return snapshot.ref.getDownloadURL();
            }).then(downloadURL => {
                // Update Firebase Auth profile
                return currentUser.updateProfile({
                    photoURL: downloadURL
                });
            }).then(() => {
                // Update UI
                updateProfilePicInModal();
                updateUserInfo(currentUser);
                
                // Show success notification
                showCustomNotification('प्रोफाइल फोटो सफलतापूर्वक अपडेट किया गया!', 'success');
            }).catch(error => {
                console.error('Error updating profile picture:', error);
                showCustomNotification('प्रोफाइल फोटो अपडेट करने में विफल। कृपया पुनः प्रयास करें।', 'error');
                updateProfilePicInModal();
            });
        }
    });
    
    // Close profile modal when clicking the X button
    if (closeProfileBtn) {
        closeProfileBtn.addEventListener('click', () => {
            closeProfileModal();
        });
    }
    
    // Close profile modal when clicking outside the modal
    if (profileSettingsModal) {
        profileSettingsModal.addEventListener('click', (e) => {
            if (e.target === profileSettingsModal) {
                closeProfileModal();
            }
        });
    }
    
    // Function to close the profile modal with animation
    function closeProfileModal() {
        profileSettingsModal.style.opacity = '0';
        setTimeout(() => {
        profileSettingsModal.style.display = 'none';
            profileSettingsModal.style.pointerEvents = 'none';
        }, 300);
    }
    
    // Edit username when clicking the edit button
    if (editUsernameBtn) {
        editUsernameBtn.addEventListener('click', () => {
            const newUsername = prompt('Enter new username:', currentUser.displayName);
            
            if (newUsername && newUsername.trim() !== '') {
                // Update username in Firebase
                currentUser.updateProfile({
                    displayName: newUsername
                }).then(() => {
                    // Update UI in real-time
                    displayUsername.textContent = newUsername;
                    usernameEl.textContent = newUsername;
                    
                    // Show success notification
                    alert('Username updated successfully!');
                }).catch(error => {
                    console.error('Error updating username:', error);
                    alert('Failed to update username. Please try again.');
                });
            }
        });
    }
    
    // Logout when clicking the logout button in profile modal
    if (logoutProfileBtn) {
        logoutProfileBtn.addEventListener('click', handleLogout);
    }
    
    // Check if user previously selected dark mode
    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
        themeToggle.checked = true;
    }
    
    themeToggle.addEventListener('change', function() {
        if (this.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('darkMode', 'enabled');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('darkMode', 'disabled');
        }
    });
    
    // Handle clicks on other menu items
    aboutFunChat.addEventListener('click', () => {
        // First close the side menu
        sideMenu.classList.remove('active');
        menuOverlay.classList.remove('active');
        
        // Show the About modal
        aboutAIChatModal.style.display = 'flex';
        aboutAIChatModal.style.opacity = '1';
        aboutAIChatModal.style.pointerEvents = 'auto';
    });
    
    // Toggle settings section
    settingsToggle.addEventListener('click', () => {
        settingsSection.classList.toggle('active');
    });
    
    // Make sure accent theme options are not active by default
    accentThemeOptions.classList.remove('active');
    
    // Toggle accent theme options
    accentThemeToggle.addEventListener('click', () => {
        accentThemeOptions.classList.toggle('active');
        // Close font settings if open
        fontSettingsOptions.classList.remove('active');
    });
    
    // Toggle font settings options
    fontSettingsToggle.addEventListener('click', () => {
        fontSettingsOptions.classList.toggle('active');
        // Close accent theme if open
        accentThemeOptions.classList.remove('active');
    });
    
    // Handle color selection
    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove selected class from all options
            colorOptions.forEach(opt => opt.classList.remove('selected'));
            // Add selected class to clicked option
            option.classList.add('selected');
            
            // Get selected color
            const color = option.getAttribute('data-color');
            
            // Save to localStorage
            localStorage.setItem('accentColor', color);
            
            // Apply to UI elements
            applyAccentColor(color);
            
            // Close the color options dropdown after selection
            setTimeout(() => {
                accentThemeOptions.classList.remove('active');
            }, 300);
        });
    });
    
    // Apply accent color to UI elements
    function applyAccentColor(color) {
        document.documentElement.style.setProperty('--accent-color', color);
        
        // Apply color to interactive elements
        const buttons = document.querySelectorAll('.btn-primary, .send-btn');
        buttons.forEach(btn => {
            btn.style.backgroundColor = color;
        });
        
        // Apply to other elements that need accent color
        const accentElements = document.querySelectorAll('.active-tab, .radio-inner, .room-avatar, .menu-user-avatar, .chat-avatar');
        accentElements.forEach(el => {
            el.style.backgroundColor = color;
            if (color === '#ffffff') {
                el.style.color = '#333'; // Dark text for white background
        } else {
                el.style.color = 'white'; // White text for colored backgrounds
            }
        });
        
        // Apply to border elements
        const borderElements = document.querySelectorAll('.font-radio.selected');
        borderElements.forEach(el => {
            el.style.borderColor = color;
        });
        
        // For message bubbles in chat
        if (document.querySelector('.my-message .message-bubble')) {
            const myMessageBubbles = document.querySelectorAll('.my-message .message-bubble');
            myMessageBubbles.forEach(bubble => {
                bubble.style.backgroundColor = color === '#ffffff' ? '#dcf8c6' : color;
                bubble.style.color = color === '#ffffff' || color === '#dcf8c6' ? '#333' : 'white';
            });
        }
    }
    
    // Handle font selection
    fontOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove selected class from all options
            fontOptions.forEach(opt => {
                opt.querySelector('.font-radio').classList.remove('selected');
            });
            
            // Add selected class to clicked option
            option.querySelector('.font-radio').classList.add('selected');
            
            // Get selected font
            const font = option.getAttribute('data-font');
            
            // Save to localStorage
            localStorage.setItem('selectedFont', font);
            
            // Apply to body and all text elements
            applyFont(font);
        });
    });
    
    // Apply font to the entire app
    function applyFont(font) {
        document.body.style.fontFamily = `'${font}', sans-serif`;
        
        // Also apply to all text elements for consistency
        const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, button, input, textarea, a, div');
        textElements.forEach(el => {
            el.style.fontFamily = `'${font}', sans-serif`;
        });
    }
    
    // Load saved settings
    function loadSavedSettings() {
        // Load accent color
        const savedColor = localStorage.getItem('accentColor');
        if (savedColor) {
            // Mark the correct color as selected
            colorOptions.forEach(opt => {
                if (opt.getAttribute('data-color') === savedColor) {
                    opt.classList.add('selected');
                }
            });
            // Apply the color
            applyAccentColor(savedColor);
        } else {
            // Default is the first color
            colorOptions[0].classList.add('selected');
            applyAccentColor(colorOptions[0].getAttribute('data-color'));
        }
        
        // Load font
        const savedFont = localStorage.getItem('selectedFont');
        if (savedFont) {
            // Mark the correct font as selected
            fontOptions.forEach(opt => {
                if (opt.getAttribute('data-font') === savedFont) {
                    opt.querySelector('.font-radio').classList.add('selected');
                }
            });
            // Apply the font
            applyFont(savedFont);
        } else {
            // Default is the first font (Poppins)
            fontOptions[0].querySelector('.font-radio').classList.add('selected');
            applyFont(fontOptions[0].getAttribute('data-font'));
        }
    }
    
    // Load saved settings when the page loads
    loadSavedSettings();

    // About Global Chat Modal functionality
    const aboutAIChatModal = document.getElementById('aboutAIChatModal');
    const closeAboutBtn = document.getElementById('closeAboutBtn');
    
    // Close About modal when clicking the X button
    if (closeAboutBtn) {
        closeAboutBtn.addEventListener('click', () => {
            closeAboutModal();
        });
    }
    
    // Close About modal when clicking outside the modal
    if (aboutAIChatModal) {
        aboutAIChatModal.addEventListener('click', (e) => {
            if (e.target === aboutAIChatModal) {
                closeAboutModal();
            }
        });
    }
    
    // Function to close the About modal with animation
    function closeAboutModal() {
        aboutAIChatModal.style.opacity = '0';
        setTimeout(() => {
            aboutAIChatModal.style.display = 'none';
            aboutAIChatModal.style.pointerEvents = 'none';
        }, 300);
    }

    // Manage Rooms Modal
    const createRoomFab = document.getElementById('create-room-fab');
    const manageRoomsModal = document.getElementById('manageRoomsModal');
    const closeManageRoomsBtn = document.getElementById('closeManageRoomsBtn');
    const roomIconOptions = document.querySelectorAll('.room-icon-option');
    const createRoomBtn = document.getElementById('createRoomBtn');
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    const newRoomNameInput = document.getElementById('newRoomName');
    const roomIdInput = document.getElementById('roomIdInput');
    
    let selectedRoomIcon = 'fa-users'; // Default icon
    
    // Show manage rooms modal when clicking the FAB
    if (createRoomFab) {
        createRoomFab.addEventListener('click', () => {
            manageRoomsModal.style.display = 'flex';
            manageRoomsModal.style.opacity = '1';
            manageRoomsModal.style.pointerEvents = 'auto';
        });
    }
    
    // Close manage rooms modal when clicking the X button
    if (closeManageRoomsBtn) {
        closeManageRoomsBtn.addEventListener('click', () => {
            closeManageRoomsModal();
        });
    }
    
    // Close manage rooms modal when clicking outside the modal
    if (manageRoomsModal) {
        manageRoomsModal.addEventListener('click', (e) => {
            if (e.target === manageRoomsModal) {
                closeManageRoomsModal();
            }
        });
    }
    
    // Select room icon
    roomIconOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove selected class from all options
            roomIconOptions.forEach(opt => opt.classList.remove('selected'));
            // Add selected class to clicked option
            option.classList.add('selected');
            // Save selected icon
            selectedRoomIcon = option.getAttribute('data-icon');
        });
    });
    
    // Create room button handler
    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', () => {
            const roomName = newRoomNameInput.value.trim();
            if (roomName.length < 3) {
                alert('Room name must be at least 3 characters long.');
                return;
            }
            
            createNewRoom(roomName, selectedRoomIcon);
        });
    }
    
    // Join room button handler
    if (joinRoomBtn) {
        joinRoomBtn.addEventListener('click', () => {
            const roomId = roomIdInput.value.trim();
            if (!roomId) {
                alert('Please enter a valid Room ID.');
                return;
            }
            
            joinRoomById(roomId);
        });
    }
    
    // Function to close the manage rooms modal with animation
    function closeManageRoomsModal() {
        manageRoomsModal.style.opacity = '0';
        setTimeout(() => {
            manageRoomsModal.style.display = 'none';
            manageRoomsModal.style.pointerEvents = 'none';
        }, 300);
    }
    
    // Function to create a new room
    function createNewRoom(name, icon) {
        // Only proceed if user is logged in
        if (!currentUser) {
            alert('You must be logged in to create a room.');
            return;
        }
        
        // Create new room document in Firestore
        db.collection('rooms').add({
            name: name,
            icon: icon,
            createdBy: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            members: [currentUser.uid],
            admins: [currentUser.uid]
        })
        .then(docRef => {
            // Add room to user's rooms
            return db.collection('users').doc(currentUser.uid).collection('rooms').doc(docRef.id).set({
                joined: firebase.firestore.FieldValue.serverTimestamp(),
                isAdmin: true,
                unreadCount: 0
            })
            .then(() => {
                // Create welcome message in realtime database
                return realtimeDb.ref(`room_messages/${docRef.id}`).push({
                    type: 'system',
                    message: `Welcome to ${name}! This room was created by ${currentUser.displayName || 'Anonymous'}.`,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });
            })
            .then(() => {
                // Show more detailed alert with room ID to help user find it later if needed
                alert(`Room "${name}" created successfully! Room ID: ${docRef.id}\nYou will now be redirected to the chat room.`);
                
                // Close modal
                closeManageRoomsModal();
                
                // Clear input
                newRoomNameInput.value = '';
                
                // Add the room to the UI before redirecting
                addChatRoomToUI(docRef.id, {
                    name: name,
                    lastMessageSender: 'System',
                    lastMessageText: `Welcome to ${name}!`,
                    lastMessageTime: firebase.firestore.Timestamp.now()
                });
                
                // Redirect to the new room with proper parameter
                const chatUrl = `chat.html?room=${docRef.id}`;
                console.log('Redirecting to:', chatUrl);
                setTimeout(() => {
                    window.location.href = chatUrl;
                }, 500); // Short delay to ensure the alert is seen
            });
        })
        .catch(error => {
            console.error('Error creating room:', error);
            alert('Failed to create room. Please try again.');
        });
    }
    
    // Function to join a room by ID
    function joinRoomById(roomId) {
        // Only proceed if user is logged in
        if (!currentUser) {
            alert('You must be logged in to join a room.');
            return;
        }
        
        // Check if room exists
        db.collection('rooms').doc(roomId).get()
            .then(doc => {
                if (!doc.exists) {
                    alert('Room not found. Please check the ID and try again.');
                    return;
                }
                
                const roomData = doc.data();
                
                // Check if user is already a member
                if (roomData.members && roomData.members.includes(currentUser.uid)) {
                    // User is already a member, just redirect
                    window.location.href = `chat.html?room=${roomId}`;
                    return;
                }
                
                // Add user to room members
                return db.collection('rooms').doc(roomId).update({
                    members: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
                })
                .then(() => {
                    // Add room to user's rooms
                    return db.collection('users').doc(currentUser.uid).collection('rooms').doc(roomId).set({
                        joined: firebase.firestore.FieldValue.serverTimestamp(),
                        isAdmin: false,
                        unreadCount: 0
                    });
                })
                .then(() => {
                    // Add system message about new member
                    return realtimeDb.ref(`room_messages/${roomId}`).push({
                        type: 'system',
                        message: `${currentUser.displayName || 'Anonymous'} joined the room.`,
                        timestamp: firebase.database.ServerValue.TIMESTAMP
                    });
                })
                .then(() => {
                    alert(`You have joined "${roomData.name}"!`);
                    // Close modal
                    closeManageRoomsModal();
                    // Clear input
                    roomIdInput.value = '';
                    // Redirect to the room
                    window.location.href = `chat.html?room=${roomId}`;
                });
            })
            .catch(error => {
                console.error('Error joining room:', error);
                alert('Failed to join room. Please try again.');
            });
    }
    
    // Allow enter key to create/join room
    newRoomNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            createRoomBtn.click();
        }
    });
    
    roomIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinRoomBtn.click();
        }
    });

    // Add custom notification function
    function showCustomNotification(message, type = 'success') {
        // Check if a notification container already exists
        let notificationContainer = document.getElementById('notification-container');
        
        if (!notificationContainer) {
            // Create container if it doesn't exist
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notification-container';
            notificationContainer.style.position = 'fixed';
            notificationContainer.style.top = '20px';
            notificationContainer.style.right = '20px';
            notificationContainer.style.zIndex = '9999';
            document.body.appendChild(notificationContainer);
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `custom-notification ${type}`;
        notification.textContent = message;
        
        // Add styles to notification
        notification.style.backgroundColor = type === 'success' ? '#4CAF50' : '#f44336';
        notification.style.color = 'white';
        notification.style.padding = '15px 20px';
        notification.style.marginBottom = '10px';
        notification.style.borderRadius = '4px';
        notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        notification.style.minWidth = '250px';
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        notification.style.transition = 'all 0.3s ease';
        
        // Add to container
        notificationContainer.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);
        
        // Auto remove after delay
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 4000);
    }
});