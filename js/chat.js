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
const db = firebase.database();

// Profile settings modal elements - define these at global scope
const profileSettingsModal = document.getElementById('profileSettingsModal');
const closeProfileBtn = document.getElementById('closeProfileBtn');
const displayUsername = document.getElementById('displayUsername');
const displayEmail = document.getElementById('displayEmail');
const editUsernameBtn = document.getElementById('editUsernameBtn');
const logoutProfileBtn = document.getElementById('logoutProfileBtn');
const profilePicContainer = document.getElementById('profilePicContainer');
const changeProfilePicBtn = document.getElementById('changeProfilePicBtn');
const profilePicInput = document.getElementById('profilePicInput');

// Function to close the profile modal with animation
function closeProfileModal() {
    profileSettingsModal.style.opacity = '0';
    setTimeout(() => {
        profileSettingsModal.style.display = 'none';
        profileSettingsModal.style.pointerEvents = 'none';
    }, 300);
}

document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const menuButton = document.getElementById('menu-button');
    const menuClose = document.getElementById('menu-close');
    const sideMenu = document.getElementById('side-menu');
    const menuOverlay = document.getElementById('menu-overlay');
    const profileSettings = document.getElementById('profile-settings');
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsSection = document.getElementById('settings-section');
    const appearanceToggle = document.getElementById('appearance-toggle');
    const appearanceSection = document.getElementById('appearance-section');
    const appearanceArrow = document.getElementById('appearance-arrow');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const aboutFunChat = document.getElementById('about-funchat');
    const returnDashboard = document.getElementById('return-dashboard');
    const usernameEl = document.getElementById('username');
    const userStatus = document.getElementById('user-status');
    const messagesContainer = document.getElementById('messages-container');
    const colorOptions = document.querySelectorAll('.color-option');
    const fontOptions = document.querySelectorAll('.font-option');
    const onlineUsersCount = document.getElementById('online-users-display');
    const profilePic = document.getElementById('profile-pic');
    let typingTimeout;

    // Get room ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');

    // Set the appropriate message path based on room ID
    const messagesPath = roomId ? `room_messages/${roomId}` : 'global_messages';

    // Update title based on room ID
    if (roomId) {
        document.title = "Room Chat - Global Chat";
        // Try to get room name from Firestore
        firebase.firestore().collection('rooms').doc(roomId).get()
            .then(doc => {
                if (doc.exists) {
                    const roomData = doc.data();
                    document.title = `${roomData.name} - Global Chat`;
                    // Update room info in header if that element exists
                    const chatName = document.querySelector('.chat-name');
                    if (chatName) {
                        chatName.textContent = roomData.name;
                    }
                }
            })
            .catch(error => console.error("Error fetching room data:", error));
    }

    // Function to show custom notification
    function showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'custom-notification';
        notification.textContent = message;

        // Add styles
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = type === 'success' ? '#4CAF50' : '#e74c3c';
        notification.style.color = 'white';
        notification.style.padding = '15px 25px';
        notification.style.borderRadius = '8px';
        notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
        notification.style.zIndex = '1000';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';

        // Add to body
        document.body.appendChild(notification);

        // Fade in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);

        // Remove after delay
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    }

    // Current Firebase user
    let currentUser;

    // Check authentication
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            // Update user info in menu
            updateUserInfo(user);
            // Add user to online users
            addOnlineUser(user);
            // Load messages
            loadMessages();
        } else {
            // Redirect to login if not authenticated
            window.location.href = 'login.html';
        }
    });

    // Update user info in UI
    function updateUserInfo(user) {
        // Check if elements exist before trying to update them
        if (usernameEl) {
            usernameEl.textContent = user.displayName || 'User';
        }

        const userEmailEl = document.getElementById('user-email');
        if (userEmailEl) {
            userEmailEl.textContent = user.email || '';
        }

        // Set profile pic if the element exists
        if (profilePic) {
            if (user.photoURL) {
                profilePic.innerHTML = `<img src="${user.photoURL}" alt="${user.displayName}" style="width:100%;height:100%;border-radius:50%;">`;
            } else {
                // Use first letter of display name as avatar
                const initials = (user.displayName || 'User').charAt(0).toUpperCase();
                profilePic.textContent = initials;
            }
        }
    }

    // Toggle menu
    menuButton.addEventListener('click', () => {
        window.location.href = 'dashboard.html';
    });

    menuClose.addEventListener('click', () => {
        sideMenu.classList.remove('active');
        menuOverlay.classList.remove('active');
    });

    menuOverlay.addEventListener('click', () => {
        sideMenu.classList.remove('active');
        menuOverlay.classList.remove('active');
    });

    // Send message
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    function sendMessage() {
        const message = messageInput.value.trim();

        if (!message) return;

        // Create message object
        const newMessage = {
            uid: currentUser.uid,
            displayName: currentUser.displayName || 'Anonymous',
            photoURL: currentUser.photoURL,
            message: message,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            status: 'sent'
        };

        // Add reply data if replying to a message
        if (messageInput.dataset.replyTo) {
            newMessage.replyTo = messageInput.dataset.replyTo;
            newMessage.replyToName = messageInput.dataset.replyToName;
            newMessage.replyToText = messageInput.dataset.replyToText;
        }

        // Clear typing status when message is sent
        updateTypingStatus(false);
        clearTimeout(typingTimeout);

        // Push to database
        db.ref(messagesPath).push(newMessage)
            .then(() => {
                // Clear input and reset reply
                messageInput.value = '';
                cancelReply();

                // Scroll to bottom
                scrollToBottom();
                console.log("Message sent successfully to", messagesPath);
            })
            .catch(error => {
                console.error("Error sending message:", error);
                showNotification("Failed to send message. Please try again.", "error");
            });
    }

    // Load messages
    function loadMessages() {
        console.log(`Connecting to Firebase path: ${messagesPath}`);

        // Get last 50 messages
        db.ref(messagesPath).orderByChild('timestamp').limitToLast(50).on('value', snapshot => {
            // Clear messages container
            messagesContainer.innerHTML = '<div class="system-message"><span>Today</span></div>';

            try {
                // Add each message
                if (snapshot.exists()) {
                    snapshot.forEach(childSnapshot => {
                        const message = childSnapshot.val();
                        displayMessage(message, childSnapshot.key);
                    });
                    console.log(`Loaded ${snapshot.numChildren()} messages from ${messagesPath}`);
                } else {
                    console.log(`No messages found in ${messagesPath}`);
                    // Add a system message indicating no messages
                    const noMessagesEl = document.createElement('div');
                    noMessagesEl.className = 'system-message';
                    noMessagesEl.innerHTML = '<span>No messages yet. Be the first to say hello!</span>';
                    messagesContainer.appendChild(noMessagesEl);
                }
            } catch (error) {
                console.error("Error processing messages:", error);
                // Show error to user
                const errorEl = document.createElement('div');
                errorEl.className = 'system-message';
                errorEl.innerHTML = '<span>Error loading messages. Please try refreshing.</span>';
                messagesContainer.appendChild(errorEl);
            }

            // Scroll to bottom
            scrollToBottom();
        }, error => {
            console.error("Error loading messages:", error);
            // Show connection error to user
            messagesContainer.innerHTML = '<div class="system-message"><span>Error connecting to chat. Please check your connection.</span></div>';
        });

        // Listen for new messages and handle errors
        db.ref(messagesPath).orderByChild('timestamp').limitToLast(1).on('child_added', snapshot => {
            try {
                // Scroll to bottom when new message comes in only if near bottom
                if (isNearBottom()) {
                    scrollToBottom();
                }
            } catch (error) {
                console.error("Error processing new message:", error);
            }
        }, error => {
            console.error("Error listening for new messages:", error);
        });
    }

    // Display message with appropriate formatting
    function displayMessage(message, key) {
        const isMyMessage = message.uid === currentUser.uid;
        const messageClass = isMyMessage ? 'my-message' : 'others-message';

        // Format timestamp
        const timestamp = new Date(message.timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        let dateString = '';

        if (timestamp.toDateString() === today.toDateString()) {
            dateString = 'Today';
        } else if (timestamp.toDateString() === yesterday.toDateString()) {
            dateString = 'Yesterday';
        } else {
            dateString = timestamp.toLocaleDateString([], { day: 'numeric', month: 'short' });
        }

        // Check if we need to add a date separator
        const lastDateEl = messagesContainer.querySelector('.message-date:last-child');
        const lastDateString = lastDateEl ? lastDateEl.getAttribute('data-date') : '';

        if (dateString !== lastDateString) {
            const dateEl = document.createElement('div');
            dateEl.className = 'message-date';
            dateEl.setAttribute('data-date', dateString);
            dateEl.innerHTML = `<span>${dateString}</span>`;
            messagesContainer.appendChild(dateEl);
        }

        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `message-row ${messageClass} ${message.deleted ? 'deleted' : ''}`;
        messageEl.dataset.key = key;
        messageEl.dataset.sender = message.uid;
        messageEl.dataset.text = message.message;

        // Check if this is a reply
        let replyHtml = '';
        if (message.replyTo) {
            const replyToName = message.replyToName || 'User';
            const replyToText = message.replyToText || '';
            replyHtml = `
                <div class="reply-container">
                    <div class="reply-sender">${replyToName}</div>
                    <div class="reply-text">${escapeHTML(replyToText)}</div>
                </div>
            `;
        }

        // Create avatar for other users' messages
        let avatarHTML = '';
        if (!isMyMessage) {
            const avatarText = message.photoURL
                ? `<img src="${message.photoURL}" alt="${message.displayName}" style="width:100%;height:100%;border-radius:50%;">`
                : message.displayName.charAt(0).toUpperCase();

            const avatarBg = message.photoURL ? 'transparent' : getRandomColor(message.uid);

            avatarHTML = `
                <div class="message-avatar" style="width:30px;height:30px;border-radius:50%;background-color:${avatarBg};color:white;display:inline-flex;justify-content:center;align-items:center;margin-right:8px;font-size:14px;">
                    ${avatarText}
                </div>
            `;
        }

        // Add status indicators for own messages
        let statusHtml = '';
        if (isMyMessage) {
            statusHtml = '<span class="message-status"><i class="fas fa-check-double"></i></span>';
        }

        // Handle deleted messages
        let messageContent = message.deleted
            ? '<span class="deleted-message">This message was deleted</span>'
            : escapeHTML(message.message);

        messageEl.innerHTML = `
            <div class="message-group">
                ${!isMyMessage ? `<div class="sender-name">${message.displayName}</div>` : ''}
                <div style="display:flex;align-items:flex-end;${isMyMessage ? 'justify-content:flex-end;' : ''}">
                    ${!isMyMessage ? avatarHTML : ''}
                <div class="message-bubble">
                        ${replyHtml}
                        <div class="message-content">${messageContent}</div>
                        <div class="message-time">${timeString}${statusHtml}</div>
                </div>
                </div>
            </div>
        `;

        messagesContainer.appendChild(messageEl);

        // Only allow interaction with non-deleted messages
        if (!message.deleted) {
            // Set up long press detection for message options
            setupLongPress(messageEl.querySelector('.message-bubble'), key, isMyMessage);
        }
    }

    // Online users tracking
    function addOnlineUser(user) {
        const userRef = db.ref(`online/${user.uid}`);

        // Add to online users
        userRef.set({
            displayName: user.displayName || 'Anonymous',
            lastOnline: firebase.database.ServerValue.TIMESTAMP
        });

        // Remove when disconnected
        userRef.onDisconnect().remove();

        // Listen for online users count
        db.ref('online').on('value', snapshot => {
            const count = snapshot.numChildren();
            onlineUsersCount.textContent = count;
            updateOnlineCount(count);
        });
    }

    // Update online users count in header
    function updateOnlineCount(count) {
        const onlineUsersDisplay = document.getElementById('online-users-display');
        if (count > 0) {
            const statusText = count === 1 ? 'user online' : 'users online';
            onlineUsersDisplay.textContent = `${count} ${statusText}`;
        } else {
            onlineUsersDisplay.textContent = '';
        }
    }

    // Helper functions
    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function isNearBottom() {
        const threshold = 150;
        const position = messagesContainer.scrollTop + messagesContainer.offsetHeight;
        const height = messagesContainer.scrollHeight;
        return position > height - threshold;
    }

    function escapeHTML(str) {
        return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function getRandomColor(uid) {
        // Generate a consistent color based on uid
        let hash = 0;
        for (let i = 0; i < uid.length; i++) {
            hash = uid.charCodeAt(i) + ((hash << 5) - hash);
        }

        const colors = [
            '#2196F3', '#4CAF50', '#FF9800', '#9C27B0',
            '#E91E63', '#F44336', '#3F51B5', '#00BCD4'
        ];

        return colors[Math.abs(hash) % colors.length];
    }

    // Logout handler
    document.getElementById('logout-btn').addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = 'login.html';
        }).catch(error => {
            console.error("Error signing out: ", error);
        });
    });

    // Check if user previously selected dark mode
    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
        document.getElementById('theme-toggle').checked = true;
    }

    // Dark mode toggle
    document.getElementById('theme-toggle').addEventListener('change', function () {
        if (this.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('darkMode', 'enabled');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('darkMode', 'disabled');
        }
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
        const accentElements = document.querySelectorAll('.active-tab, .radio-inner, .chat-avatar, .menu-user-avatar');
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

        // For chat-specific elements
        const myMessageBubbles = document.querySelectorAll('.my-message .message-bubble');
        myMessageBubbles.forEach(el => {
            el.style.backgroundColor = color === '#ffffff' ? '#dcf8c6' : color;
            el.style.color = color === '#ffffff' || color === '#dcf8c6' ? '#333' : 'white';
        });
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

    // Toggle settings section
    settingsToggle.addEventListener('click', () => {
        settingsSection.classList.toggle('active');
    });

    // About Funchat handler
    aboutFunChat.addEventListener('click', () => {
        // First close the side menu
        sideMenu.classList.remove('active');
        menuOverlay.classList.remove('active');

        // Show the About modal
        const aboutAIChatModal = document.getElementById('aboutAIChatModal');
        aboutAIChatModal.style.display = 'flex';
        aboutAIChatModal.style.opacity = '1';
        aboutAIChatModal.style.pointerEvents = 'auto';
    });

    // Return to dashboard handler
    returnDashboard.addEventListener('click', () => {
        window.location.href = 'dashboard.html';
    });

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

    // Toggle appearance section
    appearanceToggle.addEventListener('click', () => {
        appearanceSection.classList.toggle('active');
        appearanceArrow.classList.toggle('active');
    });

    // Function to prepare a reply to a message
    function prepareReply(name, text, messageId) {
        // Store reply info for when message is sent
        messageInput.dataset.replyTo = messageId;
        messageInput.dataset.replyToName = name;
        messageInput.dataset.replyToText = text;

        // Show reply preview above input
        const replyPreview = document.createElement('div');
        replyPreview.className = 'reply-preview';
        replyPreview.innerHTML = `
            <div class="reply-container" style="margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div class="reply-sender">${name}</div>
                    <div class="reply-text">${text.length > 30 ? text.substring(0, 30) + '...' : text}</div>
                </div>
                <i class="fas fa-times" id="cancel-reply" style="padding: 5px; cursor: pointer;"></i>
            </div>
        `;

        // Remove existing preview if any
        const existingPreview = document.querySelector('.reply-preview');
        if (existingPreview) {
            existingPreview.remove();
        }

        document.querySelector('.chat-input').insertAdjacentElement('beforebegin', replyPreview);

        // Add event listener to cancel reply
        document.getElementById('cancel-reply').addEventListener('click', function (e) {
            e.stopPropagation();
            cancelReply();
        });

        // Focus on input after preparing reply
        messageInput.focus();
    }

    // Function to cancel reply
    function cancelReply() {
        const replyPreview = document.querySelector('.reply-preview');
        if (replyPreview) {
            replyPreview.remove();
        }

        // Clear reply data
        delete messageInput.dataset.replyTo;
        delete messageInput.dataset.replyToName;
        delete messageInput.dataset.replyToText;
    }

    // Toggle attachment options
    const attachBtn = document.getElementById('attach-btn');
    const attachmentOptions = document.getElementById('attachment-options');

    attachBtn.addEventListener('click', () => {
        attachmentOptions.classList.toggle('active');
    });

    // Hide attachment options when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (!attachBtn.contains(e.target) && !attachmentOptions.contains(e.target)) {
            attachmentOptions.classList.remove('active');
        }
    });

    // Handle attachment option clicks
    document.querySelectorAll('.attachment-option').forEach(option => {
        option.addEventListener('click', () => {
            alert(`${option.classList.contains('attachment-photo') ? 'Photo' :
                option.classList.contains('attachment-document') ? 'Document' :
                    'Camera'} upload would open here`);
            attachmentOptions.classList.remove('active');
        });
    });

    // Update read status (simulating WhatsApp double ticks)
    function updateMessageStatus() {
        // In a real app, you would update the status based on user interactions
        // Here we'll just simulate all messages being read after 2 seconds
        setTimeout(() => {
            const myMessages = document.querySelectorAll('.my-message .message-status i');
            myMessages.forEach(icon => {
                icon.style.color = '#4FC3F7'; // Blue color for read messages
            });
        }, 2000);
    }

    // Call this after loading messages
    document.addEventListener('DOMContentLoaded', () => {
        // ... existing code ...

        // After loading messages
        loadMessages();
        updateMessageStatus();

        // Make messages clickable for reply
        document.addEventListener('click', function (e) {
            if (e.target.closest('.message-bubble') && !e.target.closest('.my-message')) {
                const messageRow = e.target.closest('.message-row');
                if (messageRow) {
                    const sender = messageRow.dataset.sender;
                    const text = messageRow.dataset.text;
                    const key = messageRow.dataset.key;

                    // Only allow replying to other people's messages
                    if (sender !== currentUser.uid) {
                        prepareReply(messageRow.querySelector('.sender-name').textContent, text, key);
                    }
                }
            }
        });
    });

    // Function to handle message deletion
    function deleteMessage(key) {
        // In a real app, you might want to consider different deletion strategies:
        // 1. Complete removal from database (for your own messages only)
        // 2. Setting a "deleted" flag (what we're doing here)
        // 3. Keeping a log of deleted messages

        db.ref(`messages/${key}`).update({
            deleted: true,
            message: "This message was deleted" // Optional: overwrite content for extra security
        })
            .then(() => {
                // Success notification
                showDeletedNotification();
            })
            .catch(error => {
                console.error("Error deleting message: ", error);
                alert("Failed to delete message. Please try again.");
            });
    }

    // Setup long press detection for message options
    function setupLongPress(element, messageKey, isMyMessage) {
        let pressTimer;
        let isLongPressing = false;

        // On mouse/touch down, start the timer
        const startPress = function (e) {
            isLongPressing = false;
            element.classList.add('pressing');

            pressTimer = setTimeout(function () {
                isLongPressing = true;
                element.classList.remove('pressing');
                showMessageOptions(e, messageKey, isMyMessage);
            }, 500); // 500ms for long press
        };

        // On mouse/touch up, clear the timer
        const endPress = function () {
            element.classList.remove('pressing');
            clearTimeout(pressTimer);
        };

        // On mouse/touch move, clear the timer
        const cancelPress = function () {
            if (!isLongPressing) {
                element.classList.remove('pressing');
                clearTimeout(pressTimer);
            }
        };

        // Set up event listeners
        element.addEventListener('mousedown', startPress);
        element.addEventListener('touchstart', startPress);
        element.addEventListener('mouseup', endPress);
        element.addEventListener('mouseleave', cancelPress);
        element.addEventListener('touchend', endPress);
        element.addEventListener('touchcancel', endPress);
        element.addEventListener('touchmove', cancelPress);

        // Regular tap/click for reply (only for others' messages)
        if (!isMyMessage) {
            element.addEventListener('click', function (e) {
                if (!isLongPressing) {
                    // Get the message details
                    const messageRow = element.closest('.message-row');
                    prepareReply(
                        messageRow.querySelector('.sender-name').textContent,
                        messageRow.dataset.text,
                        messageKey
                    );
                }
            });
        }
    }

    // Show message options menu
    function showMessageOptions(event, messageKey, isMyMessage) {
        const messageOptions = document.getElementById('message-options');
        const deleteOption = messageOptions.querySelector('.delete-option');
        const replyOption = messageOptions.querySelector('.reply-option');

        // Position the options menu near the clicked message
        const rect = event.target.getBoundingClientRect();
        messageOptions.style.top = `${rect.top}px`;
        messageOptions.style.left = `${rect.left + 50}px`;

        // Show delete option only for your own messages
        if (isMyMessage) {
            deleteOption.style.display = 'flex';
        } else {
            deleteOption.style.display = 'none';
        }

        // Show the options menu
        messageOptions.classList.add('active');
        messageOptions.dataset.messageKey = messageKey;

        // Add event listeners to options
        replyOption.onclick = function () {
            // Get the message details
            const messageRow = document.querySelector(`.message-row[data-key="${messageKey}"]`);
            const senderName = messageRow.querySelector('.sender-name')?.textContent || 'You';

            prepareReply(
                senderName,
                messageRow.dataset.text,
                messageKey
            );

            messageOptions.classList.remove('active');
        };

        deleteOption.onclick = function () {
            if (confirm('Are you sure you want to delete this message?')) {
                deleteMessage(messageKey);
                messageOptions.classList.remove('active');
            }
        };

        // Click outside to close
        document.addEventListener('click', closeMessageOptions);
    }

    // Close message options menu
    function closeMessageOptions(e) {
        const messageOptions = document.getElementById('message-options');
        if (!messageOptions.contains(e.target) && messageOptions.classList.contains('active')) {
            messageOptions.classList.remove('active');
            document.removeEventListener('click', closeMessageOptions);
        }
    }

    // Show deleted message notification
    function showDeletedNotification() {
        const notification = document.createElement('div');
        notification.className = 'custom-notification';
        notification.textContent = 'Message deleted';

        // Add styles
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = '#323232';
        notification.style.color = 'white';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '5px';
        notification.style.zIndex = '1000';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';

        // Add to body
        document.body.appendChild(notification);

        // Fade in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);

        // Remove after delay
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    }

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
        if (file) {
            // Create storage reference
            const storageRef = firebase.storage().ref();
            const profilePicRef = storageRef.child(`profile_pics/${currentUser.uid}`);

            // Show loading state
            profilePicContainer.innerHTML = `<div class="spinner" style="border:3px solid rgba(255,255,255,0.3); border-radius:50%; border-top:3px solid white; width:30px; height:30px; animation:spin 1s linear infinite;"></div>`;

            // Upload file
            profilePicRef.put(file).then(snapshot => {
                return snapshot.ref.getDownloadURL();
            }).then(downloadURL => {
                // Update profile
                return currentUser.updateProfile({
                    photoURL: downloadURL
                });
            }).then(() => {
                // Update UI
                updateProfilePicInModal();
                updateUserInfo(currentUser);

                // Show success notification
                alert('Profile picture updated successfully!');
            }).catch(error => {
                console.error('Error updating profile picture:', error);
                alert('Failed to update profile picture. Please try again.');
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

    // Edit username when clicking the edit button
    if (editUsernameBtn) {
        editUsernameBtn.addEventListener('click', () => {
            const currentName = displayUsername.textContent;
            const newName = prompt('Enter new username:', currentName);

            if (newName && newName.trim() !== '' && newName !== currentName) {
                // Update all UI elements with the new username
                updateUsernameEverywhere(newName, currentName);
            }
        });
    }

    // Function to update username in all places
    function updateUsernameEverywhere(newName, oldName) {
        // Update in the profile modal
        displayUsername.textContent = newName;

        // Update in the side menu (note: usernameEl is the username element with id="username")
        if (usernameEl) {
            usernameEl.textContent = newName;
        }

        // Update Firebase Auth profile and Database
        const user = firebase.auth().currentUser;
        if (user) {
            // First update the Auth profile
            user.updateProfile({
                displayName: newName
            }).then(() => {
                // Then update the username in the database
                const userId = user.uid;
                return firebase.database().ref('users/' + userId).update({
                    username: newName
                });
            }).then(() => {
                showNotification('Username updated successfully!', 'success');
            }).catch((error) => {
                console.error('Error updating username:', error);

                // Revert UI changes on error
                displayUsername.textContent = oldName;
                if (usernameEl) {
                    usernameEl.textContent = oldName;
                }

                showNotification('Error updating username: ' + error.message, 'error');
            });
        }
    }

    // Logout when clicking the logout button
    if (logoutProfileBtn) {
        logoutProfileBtn.addEventListener('click', () => {
            firebase.auth().signOut().then(() => {
                window.location.href = 'login.html';
            }).catch(error => {
                console.error("Error signing out: ", error);
            });
        });
    }

    // Side menu toggle on mobile devices
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (!sideMenu.contains(e.target) && e.target !== menuButton) {
                sideMenu.classList.remove('active');
            }
        }
    });

    // Typing indicator variables
    const typingIndicator = document.getElementById('typing-indicator');
    const typingUsername = document.getElementById('typing-username');

    // Add event listener for typing
    messageInput.addEventListener('input', () => {
        // Only send typing status if there's content in the input
        if (messageInput.value.trim().length > 0) {
            // Update user's typing status in firebase
            updateTypingStatus(true);

            // Clear existing timeout
            clearTimeout(typingTimeout);

            // Set timeout to stop typing indicator after 3 seconds of inactivity
            typingTimeout = setTimeout(() => {
                updateTypingStatus(false);
            }, 3000);
        } else {
            // If input is empty, stop typing indicator
            updateTypingStatus(false);
            clearTimeout(typingTimeout);
        }
    });

    // Function to update typing status in Firebase
    function updateTypingStatus(isTyping) {
        if (currentUser) {
            db.ref(`typing/${currentUser.uid}`).set(isTyping ? {
                displayName: currentUser.displayName || 'Anonymous',
                timestamp: firebase.database.ServerValue.TIMESTAMP
            } : null);
        }
    }

    // Listen for changes in typing status
    db.ref('typing').on('value', snapshot => {
        let someoneTyping = false;
        let typingUser = '';

        snapshot.forEach(childSnapshot => {
            const uid = childSnapshot.key;
            const typingData = childSnapshot.val();

            // Ignore our own typing indicator
            if (uid !== currentUser.uid) {
                someoneTyping = true;
                typingUser = typingData.displayName;
                return false; // Break the loop after finding first person typing
            }
        });

        // Display typing indicator
        if (someoneTyping) {
            typingUsername.textContent = typingUser;
            typingIndicator.style.display = 'block';
        } else {
            typingIndicator.style.display = 'none';
        }
    });

    // Clear typing status when user disconnects
    db.ref(`typing/${currentUser?.uid}`).onDisconnect().remove();
});

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

// Get reference to profile menu item
const profileMenuItem = document.getElementById('profile-settings');

// Event listener for opening the profile settings modal
profileMenuItem.addEventListener('click', () => {
    // Close the menu if it's open
    if (sideMenu.classList.contains('active')) {
        sideMenu.classList.remove('active');
    }

    // Show the profile modal
    profileSettingsModal.style.display = 'flex';
    setTimeout(() => {
        profileSettingsModal.style.opacity = '1';
        profileSettingsModal.style.pointerEvents = 'auto';
    }, 10);

    // Load user profile data
    loadUserProfile();
});

// Event listener for closing the profile settings modal
closeProfileBtn.addEventListener('click', closeProfileModal);

// Load and display user profile info
function loadUserProfile() {
    const auth = firebase.auth();
    const user = auth.currentUser;

    if (user) {
        // Display email
        displayEmail.textContent = user.email;

        // Display username or email if no display name
        const username = user.displayName || user.email.split('@')[0];
        displayUsername.textContent = username;

        // Set profile picture or initials
        if (user.photoURL) {
            profilePicContainer.innerHTML = `<img src="${user.photoURL}" alt="Profile" style="width:100%; height:100%; object-fit:cover;">`;
        } else {
            // Display initials
            const initials = username.slice(0, 2).toUpperCase();
            profilePicContainer.textContent = initials;
        }
    }
}

// Handle profile picture change
changeProfilePicBtn.addEventListener('click', () => {
    profilePicInput.click();
});

profilePicInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            // Display the selected image
            profilePicContainer.innerHTML = `<img src="${event.target.result}" alt="Profile" style="width:100%; height:100%; object-fit:cover;">`;

            // Here you would typically upload to storage and update user profile
            const user = firebase.auth().currentUser;
            if (user && file) {
                // Create storage reference
                const storageRef = firebase.storage().ref();
                const profilePicRef = storageRef.child(`profile_pics/${user.uid}`);

                // Upload file
                profilePicRef.put(file).then(snapshot => {
                    return snapshot.ref.getDownloadURL();
                }).then(downloadURL => {
                    // Update profile
                    return user.updateProfile({
                        photoURL: downloadURL
                    });
                }).then(() => {
                    showNotification('Profile picture updated successfully!', 'success');
                }).catch(error => {
                    console.error('Error updating profile picture:', error);
                    showNotification('Failed to update profile picture: ' + error.message, 'error');
                });
            } else {
                // Fallback to localStorage if Firebase storage not available
                localStorage.setItem('userProfilePic', event.target.result);
                showNotification('Profile picture saved locally.', 'success');
            }
        };
        reader.readAsDataURL(file);
    }
});

// Handle logout from profile modal
logoutProfileBtn.addEventListener('click', () => {
    const auth = firebase.auth();
    auth.signOut().then(() => {
        // Redirect to login page
        window.location.href = 'login.html';
    }).catch((error) => {
        showNotification('Error signing out: ' + error.message, 'error');
    });
});