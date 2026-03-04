const firebaseConfig = window.APP_FIREBASE_CONFIG;

if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey.includes('REPLACE_WITH_NEW_RESTRICTED_API_KEY')) {
    throw new Error('Firebase config missing. Set js/firebase-config.js with your new restricted API key.');
}

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
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

// Global variable for current user - MAKE SURE IT'S DEFINED GLOBALLY
let currentUser = null;
// Global variable for message path - needed by functions outside DOMContentLoaded
let messagesPath = 'global_messages'; // Default, will be updated later
let typingPath = 'typing/global';
// Global variable for storing element to delete - needed by confirm/delete functions
let elementToDeleteForMe = null;
// Global variable for typing timeout - needed by updateTypingStatus
let typingTimeout;
// Global variable for messages container - needed by functions
let messagesContainer = null; // Define globally but initialize in DOMContentLoaded

function getTypingPathForRoom(roomId) {
    return roomId ? `typing/rooms/${roomId}` : 'typing/global';
}

function normalizeMessageData(message) {
    if (!message || typeof message !== 'object') {
        return {
            uid: '',
            sender: 'Unknown',
            displayName: 'Unknown',
            text: '',
            message: '',
            timestamp: Date.now(),
            reactions: null,
            replyTo: null,
            replyToName: null,
            replyToText: null,
            deleted: false
        };
    }

    const senderName = message.sender || message.displayName || 'Unknown';
    const textValue = message.text || message.message || '';

    return {
        ...message,
        sender: senderName,
        displayName: message.displayName || senderName,
        text: textValue,
        message: message.message || textValue,
        timestamp: Number.isFinite(message.timestamp) ? message.timestamp : Date.now()
    };
}

// Function to close the profile modal with animation
function closeProfileModal() {
    profileSettingsModal.style.opacity = '0';
    setTimeout(() => {
        profileSettingsModal.style.display = 'none';
        profileSettingsModal.style.pointerEvents = 'none';
    }, 300);
}

// --- Functions defined OUTSIDE DOMContentLoaded ---
function deleteMessage(key) {
    // In a real app, you might want to consider different deletion strategies:
    // 1. Complete removal from database (for your own messages only)
    // 2. Setting a "deleted" flag (what we're doing here)
    // 3. Keeping a log of deleted messages

    db.ref(`${messagesPath}/${key}`).update({
        deleted: true,
        // message: "This message was deleted" // Optional: Keep original message for potential undelete? Or just rely on 'deleted' flag.
    })
        .then(() => {
            // Success notification
            // showDeletedNotification(); // Note: This function seems undefined elsewhere in the code.
            showNotification('Message deleted successfully.', 'success'); // Using existing notification function
            console.log(`Message ${key} marked as deleted in ${messagesPath}`);
        })
        .catch(error => {
            console.error("Error deleting message: ", error);
            alert("Failed to delete message. Please try again.");
        });
}

function addOrUpdateReaction(messageKey, emoji) {
    if (!currentUser || !messageKey) return;

    const reactionRef = db.ref(`${messagesPath}/${messageKey}/reactions/${currentUser.uid}`);

    reactionRef.once('value').then(snapshot => {
        if (snapshot.exists() && snapshot.val() === emoji) {
            // If user clicked the same emoji, remove their reaction
            reactionRef.remove()
                .catch(error => console.error("Error removing reaction:", error));
        } else {
            // Otherwise, set/update their reaction
            reactionRef.set(emoji)
                .catch(error => console.error("Error setting reaction:", error));
        }
    }).catch(error => console.error("Error checking existing reaction:", error));
}

function setupDeletedPlaceholderLongPress(element, messageRowElement) {
    let pressTimer;
    let isLongPressing = false;

    const startPress = function (e) {
        // Prevent triggering on anything other than the main placeholder bubble/row
        if (e.target !== element && !element.contains(e.target)) {
            return;
        }
        e.stopPropagation(); // Prevent event bubbling

        isLongPressing = false;
        element.classList.add('pressing'); // Optional visual feedback

        pressTimer = setTimeout(function () {
            isLongPressing = true;
            element.classList.remove('pressing');
            // Call the function to show the custom confirmation modal
            confirmDeletePlaceholderForMe(messageRowElement);
        }, 500); // 500ms for long press
    };

    const endPress = function (e) {
        e.stopPropagation();
        element.classList.remove('pressing');
        clearTimeout(pressTimer);
    };

    const cancelPress = function (e) {
         e.stopPropagation();
        if (!isLongPressing) {
            element.classList.remove('pressing');
            clearTimeout(pressTimer);
        }
    };

    // Use mouse events for desktop and touch events for mobile
    element.addEventListener('mousedown', startPress);
    element.addEventListener('touchstart', startPress, { passive: true });

    element.addEventListener('mouseup', endPress);
    element.addEventListener('mouseleave', cancelPress);
    element.addEventListener('touchend', endPress);
    element.addEventListener('touchcancel', endPress);

    console.log("Attaching long press listener to deleted placeholder:", messageRowElement); // Log attachment
}

function confirmDeletePlaceholderForMe(messageElement) {
    console.log("ConfirmDeletePlaceholderForMe called for:", messageElement); // Log function call
    const modal = document.getElementById('delete-for-me-confirmation-modal');
    if (modal) {
        elementToDeleteForMe = messageElement; // Store the element to delete
        modal.classList.add('active'); // Show the modal
        console.log("Modal activated"); // Log modal activation
    } else {
        console.error("Delete confirmation modal not found!");
    }
}

function hideConfirmationModal() {
    console.log("hideConfirmationModal called"); // Log function call
    const modal = document.getElementById('delete-for-me-confirmation-modal');
    if (modal) {
        modal.classList.remove('active');
        console.log("Modal 'active' class removed"); // Log class removal
    } else {
         console.error("Modal not found in hideConfirmationModal");
    }
    elementToDeleteForMe = null; // Clear the stored element
}

function deletePlaceholderForMe(messageElement) {
    console.log("deletePlaceholderForMe called for:", messageElement); // Log function call
    if (messageElement) {
        messageElement.style.transition = 'opacity 0.3s ease, height 0.3s ease, margin 0.3s ease, padding 0.3s ease';
        messageElement.style.opacity = '0';
        messageElement.style.height = '0';
        messageElement.style.marginTop = '0';
        messageElement.style.marginBottom = '0';
        messageElement.style.paddingTop = '0';
        messageElement.style.paddingBottom = '0';
        messageElement.style.overflow = 'hidden';
        console.log("Fading out and removing placeholder"); // Log removal start
        setTimeout(() => {
            messageElement.remove();
             console.log("Placeholder removed from DOM"); // Log removal end
        }, 300);
    } else {
         console.error("messageElement is null in deletePlaceholderForMe");
    }
}

function showMessageOptions(event, messageKey, isMyMessage) {
    console.log(`showMessageOptions called for key: ${messageKey}, isMyMessage: ${isMyMessage}`);
    const messageOptions = document.getElementById('message-options');
    if (!messageOptions) {
        console.error("Message options container (#message-options) not found!");
        return;
    }

    const deleteOption = messageOptions.querySelector('.delete-option');
    const replyOption = messageOptions.querySelector('.reply-option');
    const reactOption = messageOptions.querySelector('.react-option');
    const emojiPicker = document.getElementById('emoji-picker');

    if (!deleteOption || !replyOption || !reactOption) {
        console.error("One or more options elements not found within #message-options!");
        return;
    }

    // Show/hide delete option based on whether it's the user's message
    if (isMyMessage) {
        deleteOption.style.display = 'flex';
    } else {
        deleteOption.style.display = 'none';
    }

    // Position the options menu in the center of the message instead of fixed position
    const messageElement = event.currentTarget;
    const messageRect = messageElement.getBoundingClientRect();
    
    // Calculate position to center the popup relative to the message
    const centerX = messageRect.left + messageRect.width / 2 - messageOptions.offsetWidth / 2;
    const centerY = messageRect.top + messageRect.height / 2 - messageOptions.offsetHeight / 2;
    
    // Ensure the popup stays within viewport boundaries
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let finalX = Math.max(10, centerX); // Keep at least 10px from left edge
    finalX = Math.min(finalX, viewportWidth - messageOptions.offsetWidth - 10); // Keep at least 10px from right edge
    
    let finalY = Math.max(10, centerY); // Keep at least 10px from top edge
    finalY = Math.min(finalY, viewportHeight - messageOptions.offsetHeight - 10); // Keep at least 10px from bottom edge

    // Apply the position
    messageOptions.style.left = `${finalX}px`;
    messageOptions.style.top = `${finalY}px`;
    messageOptions.classList.add('active');

    // Store the current message key to use with action handlers
    messageOptions.dataset.messageKey = messageKey;

    // Add event handlers for options
    deleteOption.onclick = () => {
        messageOptions.classList.remove('active');
        showDeleteConfirmation(messageKey);
    };

    replyOption.onclick = () => {
        messageOptions.classList.remove('active');
        // Get message data to prepare reply
        const messageElement = document.querySelector(`.message-row[data-key="${messageKey}"]`);
        if (messageElement) {
            const namePart = messageElement.querySelector('.message-sender')?.textContent || 'Someone';
            const textPart = messageElement.querySelector('.message-text')?.textContent || '';
            prepareReply(namePart, textPart, messageKey);
        }
    };

    reactOption.onclick = () => {
        // Close options menu and show emoji picker specifically for reaction
        messageOptions.classList.remove('active');
        
        // Position emoji picker near the message
        if (emojiPicker) {
            emojiPicker.classList.add('reaction-mode');
            emojiPicker.dataset.reactionTarget = messageKey;
            
            // Position emoji picker
            emojiPicker.style.left = `${finalX}px`;
            emojiPicker.style.top = `${finalY}px`;
            emojiPicker.classList.add('active');
            
            // Add one-time event listener to handle emoji selection for reaction
            const handleEmojiSelection = (e) => {
                if (e.target.classList.contains('emoji')) {
                    const emoji = e.target.textContent;
                    addOrUpdateReaction(messageKey, emoji);
                    emojiPicker.classList.remove('active');
                    emojiPicker.classList.remove('reaction-mode');
                    emojiPicker.removeEventListener('click', handleEmojiSelection);
                }
            };
            
            emojiPicker.addEventListener('click', handleEmojiSelection);
            
            // Close emoji picker when clicking outside
            const closeEmojiPicker = (e) => {
                if (!emojiPicker.contains(e.target) && e.target !== reactOption) {
                    emojiPicker.classList.remove('active');
                    emojiPicker.classList.remove('reaction-mode');
                    emojiPicker.removeEventListener('click', handleEmojiSelection);
                    document.removeEventListener('click', closeEmojiPicker);
                }
            };
            
            // Add with a slight delay to prevent immediate closing
            setTimeout(() => {
                document.addEventListener('click', closeEmojiPicker);
            }, 100);
        }
    };

    // Add event listener to close the options when clicking outside
    const closePopupsListener = (e) => {
        if (!messageOptions.contains(e.target) && e.target !== messageElement && !emojiPicker?.contains(e.target)) {
            messageOptions.classList.remove('active');
            document.removeEventListener('click', closePopupsListener);
        }
    };
    
    // Add with a slight delay to prevent immediate closing
    setTimeout(() => {
        document.addEventListener('click', closePopupsListener);
    }, 100);
}

function closePopups(e) {
    // Implementation of closePopups function
}

function setupLongPress(element, messageKey, isMyMessage) {
    let pressTimer;
    let isLongPressing = false;
    
    const startPress = function(e) {
        isLongPressing = false;
        element.classList.add('pressing');
        
        pressTimer = setTimeout(function() {
            isLongPressing = true;
            element.classList.remove('pressing');
            showMessageOptions(e, messageKey, isMyMessage);
        }, 500); // 500ms for long press
    };
    
    const endPress = function() {
        clearTimeout(pressTimer);
        element.classList.remove('pressing');
    };
    
    const cancelPress = function() {
        if (!isLongPressing) {
            clearTimeout(pressTimer);
            element.classList.remove('pressing');
        }
    };
    
    // Use mouse events for desktop and touch events for mobile
    element.addEventListener('mousedown', startPress);
    element.addEventListener('touchstart', startPress, { passive: true });
    
    element.addEventListener('mouseup', endPress);
    element.addEventListener('mouseleave', cancelPress);
    element.addEventListener('touchend', endPress);
    element.addEventListener('touchcancel', cancelPress);
}

function showNotification(message, type = 'success') {
    // Implementation of showNotification function
}

function updateUserInfo(user) {
    const usernameEl = document.getElementById('username'); // Get element inside function
    const userEmailEl = document.getElementById('user-email'); // Get element inside function
    const profilePic = document.getElementById('profile-pic'); // Get element inside function

    if (user) { // Only update if user is not null
        if (usernameEl) {
            usernameEl.textContent = user.displayName || 'User';
        }
        if (userEmailEl) {
            userEmailEl.textContent = user.email || '';
        }
        if (profilePic) {
            if (user.photoURL) {
                profilePic.innerHTML = `<img src="${user.photoURL}" alt="${user.displayName || 'User'}" style="width:100%;height:100%;border-radius:50%;">`;
            } else {
                const initials = (user.displayName || 'User').charAt(0).toUpperCase();
                profilePic.textContent = initials;
            }
        }
         // Update profile modal if open (optional, but good practice)
         const displayUsernameModal = document.getElementById('displayUsername');
         const displayEmailModal = document.getElementById('displayEmail');
         if (profileSettingsModal && profileSettingsModal.style.display !== 'none') {
              if (displayUsernameModal) displayUsernameModal.textContent = user.displayName || 'User';
              if (displayEmailModal) displayEmailModal.textContent = user.email || '';
              updateProfilePicInModal(); // Assumes this uses currentUser internally or gets passed user
         }

    } else {
        // Handle case where user logs out or isn't loaded yet
        if (usernameEl) usernameEl.textContent = 'User';
        if (userEmailEl) userEmailEl.textContent = '';
        if (profilePic) profilePic.textContent = '?'; // Or a placeholder icon
    }
}

function updateProfilePicInModal() {
    // Implementation of updateProfilePicInModal function
}

function addOnlineUser(user) {
     if (!user || !user.uid) {
         console.error("Cannot add online user: user data is invalid", user);
         return;
     }
    const userRef = db.ref(`online/${user.uid}`);
    userRef.set({
        displayName: user.displayName || 'Anonymous',
        lastOnline: firebase.database.ServerValue.TIMESTAMP
    });
    userRef.onDisconnect().remove();

    // Listen for online users count - move this listener setup outside this function?
    // Maybe attach it once in DOMContentLoaded after initial auth.
    // db.ref('online').on('value', snapshot => { ... });
}

function updateOnlineCount(count) {
     const onlineUsersDisplay = document.getElementById('online-users-display'); // Get element inside
     if (onlineUsersDisplay) {
        if (count > 0) {
            const statusText = count === 1 ? 'user online' : 'users online';
            onlineUsersDisplay.textContent = `${count} ${statusText}`;
        } else {
            onlineUsersDisplay.textContent = '';
        }
     } else {
         console.warn("Online users display element not found.");
     }
}

function sendMessage() {
    const messageInput = document.getElementById('message-input'); // Get element inside
     if (!currentUser) {
         console.error("Cannot send message: user not logged in.");
         showNotification("You must be logged in to send messages.", "error");
         return;
     }
     if (!messageInput) {
          console.error("Message input element not found.");
          return;
     }

    const message = messageInput.value.trim();
    if (!message) return;

    const senderName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous';

    const newMessage = {
        uid: currentUser.uid,
        sender: senderName,
        displayName: senderName,
        photoURL: currentUser.photoURL,
        text: message,
        message: message,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        status: 'sent'
    };

    if (messageInput.dataset.replyTo) {
        newMessage.replyTo = messageInput.dataset.replyTo;
        newMessage.replyToName = messageInput.dataset.replyToName;
        newMessage.replyToText = messageInput.dataset.replyToText;
    }

    // Clear typing status
    updateTypingStatus(false);
    // Clear typing timeout if it exists in this scope
    if (typeof typingTimeout !== 'undefined') {
        clearTimeout(typingTimeout);
    }

    // Use the globally defined messagesPath
    db.ref(messagesPath).push(newMessage)
        .then(() => {
            messageInput.value = '';
            // Cancel reply if function exists
            if (typeof cancelReply === 'function') {
                cancelReply();
            }
            // Scroll to bottom if function exists
            if (typeof scrollToBottom === 'function') {
                scrollToBottom();
            }
            console.log("Message sent successfully to", messagesPath);
        })
        .catch(error => {
            console.error("Error sending message:", error);
            // Show notification if function exists
            if (typeof showNotification === 'function') {
                showNotification("Failed to send message. Please try again.", "error");
            } else {
                alert("Failed to send message. Please try again.");
            }
        });
}

function loadMessages(userForDisplay) {
    if (!userForDisplay) {
        console.error("loadMessages called without a valid user object.");
        return; // Don't proceed without user
    }
    console.log(`Connecting to Firebase path: ${messagesPath} for user: ${userForDisplay.uid}`);
    
    // Use the global messagesContainer reference - try both possible IDs
    if (!messagesContainer) {
        messagesContainer = document.getElementById('messages-container') || document.getElementById('messages');
        if (!messagesContainer) {
            console.error("Messages container not found with ID 'messages-container' or 'messages'. Cannot load messages.");
            return;
        }
    }

    const query = db.ref(messagesPath).orderByChild('timestamp').limitToLast(50);
    query.on('value', snapshot => {
        messagesContainer.innerHTML = '';
        let lastDateString = '';
        try {
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    const message = childSnapshot.val();
                    const key = childSnapshot.key;
                    if (!message || !key) {
                         console.warn("Skipping invalid message data:", message, key);
                         return;
                    }
                    const timestamp = new Date(message.timestamp);
                    if (isNaN(timestamp.getTime())) {
                         console.warn("Skipping message with invalid timestamp:", key, message.timestamp);
                         return;
                    }
                    // Date separator logic...
                    const today = new Date();
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    let currentDateString = '';
                    if (timestamp.toDateString() === today.toDateString()) {
                        currentDateString = 'Today';
                    } else if (timestamp.toDateString() === yesterday.toDateString()) {
                        currentDateString = 'Yesterday';
                    } else {
                        currentDateString = timestamp.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
                    }
                    if (currentDateString !== lastDateString) {
                         const dateEl = document.createElement('div');
                         dateEl.className = 'message-date';
                         dateEl.setAttribute('data-date', currentDateString);
                         dateEl.innerHTML = `<span>${currentDateString}</span>`;
                         messagesContainer.appendChild(dateEl);
                         lastDateString = currentDateString;
                    }
                    // Pass the user object to displayMessage
                    displayMessage(message, key, userForDisplay);
                });
                console.log(`Loaded/Updated ${snapshot.numChildren()} messages from ${messagesPath}`);
            } else {
                console.log(`No messages found in ${messagesPath}`);
                const noMessagesEl = document.createElement('div');
                noMessagesEl.className = 'system-message';
                noMessagesEl.innerHTML = '<span>No messages yet. Be the first to say hello!</span>';
                messagesContainer.appendChild(noMessagesEl);
            }
        } catch (error) {
            console.error("Error processing messages:", error);
            messagesContainer.innerHTML = '<div class="system-message"><span>Error processing messages. Please try refreshing.</span></div>';
        }
        if (typeof scrollToBottom === 'function') scrollToBottom();
    }, error => {
        console.error("Error loading messages from Firebase:", error);
         messagesContainer.innerHTML = '<div class="system-message"><span>Error connecting to chat. Please check your connection.</span></div>';
    });
}

function displayMessage(message, key, user) {
    const normalizedMessage = normalizeMessageData(message);

    // Check if the message is already displayed
    if (document.querySelector(`.message-row[data-key="${key}"]`)) {
        return;
    }
    
    // Make sure we have the messages container - try both possible IDs
    if (!messagesContainer) {
        messagesContainer = document.getElementById('messages-container') || document.getElementById('messages');
        if (!messagesContainer) {
            console.error("Messages container not found with ID 'messages-container' or 'messages'. Cannot display message.");
            return;
        }
    }
    
    const isMyMessage = normalizedMessage.uid === currentUser?.uid;
    const messageElement = document.createElement('div');
    messageElement.className = `message-row ${isMyMessage ? 'my-message' : 'other-message'}`;
    messageElement.dataset.key = key;
    
    // If message is deleted, show a placeholder
    if (normalizedMessage.deleted) {
        messageElement.classList.add('deleted');
        messageElement.innerHTML = `
            <div class="message-info">
                <span class="message-sender">${escapeHTML(normalizedMessage.sender)}</span>
                <span class="message-time">${formatTime(normalizedMessage.timestamp)}</span>
            </div>
            <div class="message-bubble deleted-message">
                <div class="message-text">This message was deleted</div>
            </div>
        `;
        
        // Add long press event for deleted messages (for "delete for me" functionality)
        setupDeletedPlaceholderLongPress(messageElement.querySelector('.message-bubble'), messageElement);
        
        messagesContainer.appendChild(messageElement);
        return;
    }
    
    // Regular message
    const messageBubble = document.createElement('div');
    messageBubble.className = 'message-bubble';
    
    // Add long press event for message options
    setupLongPress(messageBubble, key, isMyMessage);
    
    // Format the message text (handle links, styling, etc.)
    let messageText = escapeHTML(normalizedMessage.text || '');
    
    // Convert URLs to clickable links
    messageText = messageText.replace(
        /(https?:\/\/[^\s]+)/g, 
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    
    // Convert markdown-style bold text
    messageText = messageText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert markdown-style italic text
    messageText = messageText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Handle reply reference
    let replyHtml = '';
    if (normalizedMessage.replyTo) {
        replyHtml = `
            <div class="reply-reference">
                <div class="reply-author">${escapeHTML(normalizedMessage.replyToName || 'Someone')}</div>
                <div class="reply-text">${escapeHTML(normalizedMessage.replyToText || '')}</div>
            </div>
        `;
    }
    
    // Create reactions HTML if there are any
    let reactionsHtml = '';
    if (normalizedMessage.reactions && Object.keys(normalizedMessage.reactions).length > 0) {
        // Count reactions by emoji
        const reactionCounts = {};
        const userReactions = {};
        
        // Process all reactions
        Object.entries(normalizedMessage.reactions).forEach(([uid, emoji]) => {
            // Count by emoji
            reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
            // Track if current user reacted
            if (uid === currentUser?.uid) {
                userReactions[emoji] = true;
            }
        });
        
        // Generate reaction elements
        const reactionElements = Object.entries(reactionCounts).map(([emoji, count]) => {
            const isActive = userReactions[emoji] ? 'active' : '';
            return `<div class="reaction ${isActive}" data-emoji="${emoji}" data-key="${key}">
                      <span class="emoji">${emoji}</span>
                      <span class="count">${count}</span>
                    </div>`;
        }).join('');
        
        // Add the reactions container if there are reactions
        if (reactionElements) {
            reactionsHtml = `<div class="message-reactions">${reactionElements}</div>`;
        }
    }
    
    // Construct the full message HTML
    messageElement.innerHTML = `
        <div class="message-info">
            <span class="message-sender">${escapeHTML(normalizedMessage.sender)}</span>
            <span class="message-time">${formatTime(normalizedMessage.timestamp)}</span>
        </div>
        ${messageBubble.outerHTML}
    `;
    
    // Add content to the message bubble after it's in the DOM
    const bubbleElement = messageElement.querySelector('.message-bubble');
    bubbleElement.innerHTML = `
        ${replyHtml}
        <div class="message-text">${messageText}</div>
        ${reactionsHtml}
    `;
    
    // Add click handler to reactions
    if (reactionsHtml) {
        const reactionsContainer = bubbleElement.querySelector('.message-reactions');
        if (reactionsContainer) {
            reactionsContainer.querySelectorAll('.reaction').forEach(reaction => {
                reaction.addEventListener('click', () => {
                    const emoji = reaction.dataset.emoji;
                    const msgKey = reaction.dataset.key;
                    addOrUpdateReaction(msgKey, emoji);
                });
            });
        }
    }
    
    // Add the message to the container
    messagesContainer.appendChild(messageElement);
    
    // Auto-scroll if near the bottom
    if (isNearBottom()) {
        scrollToBottom();
    }
}

function scrollToBottom() {
    if (!messagesContainer) {
        messagesContainer = document.getElementById('messages-container') || document.getElementById('messages');
        if (!messagesContainer) return; // Exit if not found
    }
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function isNearBottom() {
    if (!messagesContainer) {
        messagesContainer = document.getElementById('messages-container') || document.getElementById('messages');
        if (!messagesContainer) return true; // Default to true if not found
    }
    const threshold = 150;
    const position = messagesContainer.scrollTop + messagesContainer.offsetHeight;
    const height = messagesContainer.scrollHeight;
    return position > height - threshold;
}

function escapeHTML(str) {
    if (!str || typeof str !== 'string') return '';
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

function applyAccentColor(color) {
    // Get elements inside function
    const buttons = document.querySelectorAll('.btn-primary, .send-btn');
    const accentElements = document.querySelectorAll('.active-tab, .radio-inner, .chat-avatar, .menu-user-avatar');
    const borderElements = document.querySelectorAll('.font-radio.selected');
    const myMessageBubbles = document.querySelectorAll('.my-message .message-bubble');

    document.documentElement.style.setProperty('--accent-color', color);
    buttons.forEach(btn => { btn.style.backgroundColor = color; });
    accentElements.forEach(el => {
        el.style.backgroundColor = color;
        if (color === '#ffffff') {
            el.style.color = '#333'; // Dark text for white background
        } else {
            el.style.color = 'white'; // White text for colored backgrounds
        }
    });
    borderElements.forEach(el => { el.style.borderColor = color; });
    myMessageBubbles.forEach(el => {
        el.style.backgroundColor = color === '#ffffff' ? '#dcf8c6' : color;
        el.style.color = color === '#ffffff' || color === '#dcf8c6' ? '#333' : 'white';
    });
}

function applyFont(font) {
    // Maybe select elements here if needed, or rely on CSS variables
    document.body.style.fontFamily = font + ', sans-serif'; // Example
}

function loadSavedSettings() {
    // Get elements inside function
    const colorOptions = document.querySelectorAll('.color-option');
    const fontOptions = document.querySelectorAll('.font-option');
    const savedColor = localStorage.getItem('accentColor');
    if (savedColor) {
        colorOptions.forEach(opt => {
            opt.classList.remove('selected');
            opt.classList.add('selected');
            applyAccentColor(opt.getAttribute('data-color'));
        });
    } else {
        if (colorOptions.length > 0) {
             colorOptions[0].classList.add('selected');
             applyAccentColor(colorOptions[0].getAttribute('data-color'));
        }
    }
    // ... (font logic similar) ...
}

function prepareReply(name, text, messageId) {
    // Get elements inside function
    const messageInput = document.getElementById('message-input');
    // ... (rest of prepareReply logic) ...
}

function cancelReply() {
     // Get elements inside function
     const messageInput = document.getElementById('message-input');
     const replyPreview = document.querySelector('.reply-preview');
    // ... (rest of cancelReply logic) ...
}

function updateMessageStatus() {
    // Get elements inside function
    const myMessages = document.querySelectorAll('.my-message .message-status i');
    // ... (rest of updateMessageStatus logic) ...
}

function updateTypingStatus(isTyping) {
     if (currentUser) {
         db.ref(`${typingPath}/${currentUser.uid}`).set(isTyping ? {
             uid: currentUser.uid,
             displayName: currentUser.displayName || 'Anonymous',
             timestamp: firebase.database.ServerValue.TIMESTAMP
         } : null);
     }
}

function closeAboutModal() {
    // Implementation of closeAboutModal function
}

function loadUserProfile() {
    // Implementation of loadUserProfile function
}

// --- DOMContentLoaded Listener ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired");

    // Initialize the messagesContainer reference - try both possible IDs
    messagesContainer = document.getElementById('messages-container') || document.getElementById('messages');
    if (!messagesContainer) {
        console.error("Messages container not found with ID 'messages-container' or 'messages'. Chat functionality may be limited.");
    }

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
    const darkModeToggle = document.getElementById('theme-toggle');
    const aboutFunChat = document.getElementById('about-funchat');
    const returnDashboard = document.getElementById('return-dashboard');
    const usernameEl = document.getElementById('username');
    const userStatus = document.getElementById('user-status');
    const colorOptions = document.querySelectorAll('.color-option');
    const fontOptions = document.querySelectorAll('.font-option');
    const onlineUsersCount = document.getElementById('online-users-display');
    const profilePic = document.getElementById('profile-pic');

    // --- Add these missing element definitions ---
    const accentThemeToggle = document.getElementById('accent-theme-toggle');
    const accentThemeOptions = document.getElementById('accent-theme-options');
    const fontSettingsToggle = document.getElementById('font-settings-toggle');
    const fontSettingsOptions = document.getElementById('font-settings-options');
    // --- End of added definitions ---

    const attachBtn = document.getElementById('attach-btn');
    const attachmentOptions = document.getElementById('attachment-options');
    const typingIndicator = document.getElementById('typing-indicator');
    const typingUsername = document.getElementById('typing-username');

    // Get room ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');

    // Set the appropriate message path based on room ID
    messagesPath = roomId ? `room_messages/${roomId}` : 'global_messages';
    typingPath = getTypingPathForRoom(roomId);

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

    // Authentication listener MUST come first
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user; // Assign to the global variable
            console.log("Auth state changed: User logged in", currentUser.uid);

            // *** Call functions AFTER user is set ***
            updateUserInfo(currentUser);
            addOnlineUser(currentUser);

            // Set up listeners that depend on currentUser
            db.ref('online').on('value', snapshot => {
                 updateOnlineCount(snapshot.numChildren());
             });
            db.ref(`${typingPath}/${currentUser.uid}`).onDisconnect().remove();
            db.ref(`online/${currentUser.uid}`).onDisconnect().remove(); // Ensure online status is also cleared

            // *** NOW load messages, passing the confirmed user ***
            loadMessages(currentUser);

        } else {
            currentUser = null;
            console.log("Auth state changed: User logged out");
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

    // Load messages
    function loadMessages(userForDisplay) {
        console.log(`Connecting to Firebase path: ${messagesPath} for user: ${userForDisplay.uid}`);
        
        // Use the global messagesContainer
        if (!messagesContainer) {
            messagesContainer = document.getElementById('messages-container') || document.getElementById('messages');
            if (!messagesContainer) {
                console.error("Messages container not found with ID 'messages-container' or 'messages'. Cannot load messages.");
                return;
            }
        }

        const query = db.ref(messagesPath).orderByChild('timestamp').limitToLast(50);
        query.on('value', snapshot => {
            messagesContainer.innerHTML = '';
            let lastDateString = '';
            try {
                if (snapshot.exists()) {
                    snapshot.forEach(childSnapshot => {
                        const message = childSnapshot.val();
                        const key = childSnapshot.key;
                        if (!message || !key) {
                             console.warn("Skipping invalid message data:", message, key);
                             return;
                        }
                        const timestamp = new Date(message.timestamp);
                        if (isNaN(timestamp.getTime())) {
                             console.warn("Skipping message with invalid timestamp:", key, message.timestamp);
                             return;
                        }
                        // Date separator logic...
                        const today = new Date();
                        const yesterday = new Date(today);
                        yesterday.setDate(yesterday.getDate() - 1);
                        let currentDateString = '';
                        if (timestamp.toDateString() === today.toDateString()) {
                            currentDateString = 'Today';
                        } else if (timestamp.toDateString() === yesterday.toDateString()) {
                            currentDateString = 'Yesterday';
                        } else {
                            currentDateString = timestamp.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
                        }
                        if (currentDateString !== lastDateString) {
                             const dateEl = document.createElement('div');
                             dateEl.className = 'message-date';
                             dateEl.setAttribute('data-date', currentDateString);
                             dateEl.innerHTML = `<span>${currentDateString}</span>`;
                             messagesContainer.appendChild(dateEl);
                             lastDateString = currentDateString;
                        }
                        // Pass the user object to displayMessage
                        displayMessage(message, key, userForDisplay);
                    });
                    console.log(`Loaded/Updated ${snapshot.numChildren()} messages from ${messagesPath}`);
                } else {
                    console.log(`No messages found in ${messagesPath}`);
                    const noMessagesEl = document.createElement('div');
                    noMessagesEl.className = 'system-message';
                    noMessagesEl.innerHTML = '<span>No messages yet. Be the first to say hello!</span>';
                    messagesContainer.appendChild(noMessagesEl);
                }
            } catch (error) {
                console.error("Error processing messages:", error);
                messagesContainer.innerHTML = '<div class="system-message"><span>Error processing messages. Please try refreshing.</span></div>';
            }
            if (typeof scrollToBottom === 'function') scrollToBottom();
        }, error => {
            console.error("Error loading messages from Firebase:", error);
            messagesContainer.innerHTML = '<div class="system-message"><span>Error connecting to chat. Please check your connection.</span></div>';
        });
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
        if (!str || typeof str !== 'string') return '';
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
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = 'login.html';
        }).catch(error => {
            console.error("Error signing out: ", error);
        });
    });
    } else {
        console.error("Logout button not found");
    }

    // Check if user previously selected dark mode
    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
        if (darkModeToggle) {
            darkModeToggle.checked = true;
        }
    }

    // Dark mode toggle
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', function () {
        if (this.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('darkMode', 'enabled');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('darkMode', 'disabled');
        }
    });
    } else {
        console.error("Dark mode toggle button not found");
    }

    // Make sure accent theme options are not active by default
    if (accentThemeOptions) {
    accentThemeOptions.classList.remove('active');
    } else {
        console.error("accentThemeOptions element not found");
    }

    // Toggle accent theme options
    if (accentThemeToggle && accentThemeOptions && fontSettingsOptions) {
    accentThemeToggle.addEventListener('click', () => {
        accentThemeOptions.classList.toggle('active');
        fontSettingsOptions.classList.remove('active');
    });
    } else {
        console.error("Could not attach listener to accentThemeToggle - one or more elements missing");
    }

    // Toggle font settings options
    if (fontSettingsToggle && fontSettingsOptions && accentThemeOptions) {
    fontSettingsToggle.addEventListener('click', () => {
        fontSettingsOptions.classList.toggle('active');
        accentThemeOptions.classList.remove('active');
    });
    } else {
        console.error("Could not attach listener to fontSettingsToggle - one or more elements missing");
    }

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
            if (accentThemeOptions) {
            setTimeout(() => {
                accentThemeOptions.classList.remove('active');
            }, 300);
            }
        });
    });

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

    // Toggle settings section
    if (settingsToggle && settingsSection) {
    settingsToggle.addEventListener('click', () => {
        settingsSection.classList.toggle('active');
    });
    } else {
        console.error("Settings toggle or section not found");
    }

    // About Funchat handler
    if (aboutFunChat && sideMenu && menuOverlay) {
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
    } else {
        console.error("About funchat button, side menu or overlay not found");
    }

    // Return to dashboard handler
    if (returnDashboard) {
    returnDashboard.addEventListener('click', () => {
        window.location.href = 'dashboard.html';
    });
        } else {
        console.error("Return dashboard button not found");
    }

    // Toggle appearance section
    if (appearanceToggle && appearanceSection && appearanceArrow) {
    appearanceToggle.addEventListener('click', () => {
        appearanceSection.classList.toggle('active');
        appearanceArrow.classList.toggle('active');
    });
    } else {
        console.error("Appearance toggle, section or arrow not found");
    }

    // Toggle attachment options
    if (attachBtn && attachmentOptions) {
    attachBtn.addEventListener('click', () => {
        attachmentOptions.classList.toggle('active');
    });
    } else {
        console.error("Attach button or options not found");
    }

    // Hide attachment options when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (attachBtn && attachmentOptions && !attachBtn.contains(e.target) && !attachmentOptions.contains(e.target)) {
            attachmentOptions.classList.remove('active');
        }
        if (window.innerWidth <= 768) {
            if (!sideMenu.contains(e.target) && e.target !== menuButton) {
                sideMenu.classList.remove('active');
            }
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

    // Typing indicator listener
    if (messageInput) {
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
    } else {
        console.error("Message input element not found");
    }

    // Listen for changes in typing status
    db.ref(typingPath).on('value', snapshot => {
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
    db.ref(`${typingPath}/${currentUser?.uid}`).onDisconnect().remove();

    // --- Add references for the new confirmation modal ---
    const deleteConfirmationModal = document.getElementById('delete-for-me-confirmation-modal');
    const cancelDeleteForMeBtn = document.getElementById('cancel-delete-for-me');
    const confirmDeleteForMeBtn = document.getElementById('confirm-delete-for-me');

    // --- Add listeners for the new modal buttons ---
    if (cancelDeleteForMeBtn) {
        console.log("Attaching listener to Cancel button");
        cancelDeleteForMeBtn.addEventListener('click', () => {
            console.log("Cancel button clicked");
            hideConfirmationModal();
        });
    } else {
        console.error("Cancel button not found");
    }

    if (confirmDeleteForMeBtn) {
        console.log("Attaching listener to Confirm Delete button");
        confirmDeleteForMeBtn.addEventListener('click', () => {
            console.log("Confirm Delete button clicked. Element to delete:", elementToDeleteForMe);
            if (elementToDeleteForMe) {
                deletePlaceholderForMe(elementToDeleteForMe);
            } else {
                console.error("elementToDeleteForMe is null when confirm button clicked");
            }
            hideConfirmationModal();
        });
    } else {
        console.error("Confirm Delete button not found");
    }

    // Close modal if overlay is clicked
    if (deleteConfirmationModal) {
        console.log("Attaching listener to Modal Overlay");
        deleteConfirmationModal.addEventListener('click', (e) => {
            if (e.target === deleteConfirmationModal) {
                console.log("Modal overlay clicked");
                hideConfirmationModal();
            }
        });
    } else {
        console.error("Delete confirmation modal overlay not found");
    }

    loadSavedSettings(); // Load settings once DOM is ready
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

        // Set profile pic if the element exists
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

// Add style to css for the centered message options
document.addEventListener('DOMContentLoaded', function() {
    // Add styles dynamically for message options
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .message-options {
            position: fixed;
            background-color: #2d2d2d;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            display: none;
            flex-direction: column;
            min-width: 150px;
            transform: scale(0.95);
            opacity: 0;
            transition: transform 0.2s ease, opacity 0.2s ease;
        }
        
        .message-options.active {
            display: flex;
            transform: scale(1);
            opacity: 1;
        }
        
        .emoji-picker.reaction-mode {
            /* Smaller emoji picker when in reaction mode */
            max-width: 250px;
            max-height: 200px;
            overflow-y: auto;
        }
    `;
    document.head.appendChild(styleElement);

    // Add CSS for the confirmation modals
    const modalStyleElement = document.createElement('style');
    modalStyleElement.textContent = `
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 2000;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .modal-content {
            background-color: #2d2d2d;
            border-radius: 10px;
            padding: 20px;
            width: 90%;
            max-width: 400px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
        }
        
        .modal-buttons {
            display: flex;
            justify-content: flex-end;
            margin-top: 20px;
            gap: 10px;
        }
        
        .cancel-btn, .close-btn {
            background-color: transparent;
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #fff;
            padding: 8px 15px;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .delete-btn {
            background-color: #e74c3c;
            border: none;
            color: white;
            padding: 8px 15px;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .cancel-btn:hover, .close-btn:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }
        
        .delete-btn:hover {
            background-color: #c0392b;
        }
    `;
    document.head.appendChild(modalStyleElement);

    // Add global click listener to close popups
    document.addEventListener('click', closePopups);
});

// Add the delete confirmation function
function showDeleteConfirmation(messageKey) {
    const deleteConfirmationModal = document.getElementById('delete-confirmation-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete');
    const confirmDeleteBtn = document.getElementById('confirm-delete');
    
    if (!deleteConfirmationModal || !cancelDeleteBtn || !confirmDeleteBtn) {
        console.error("Delete confirmation modal elements not found");
        return;
    }
    
    // Store message key in the modal
    deleteConfirmationModal.dataset.messageKey = messageKey;
    
    // Show the modal with animation
    deleteConfirmationModal.style.display = 'flex';
    setTimeout(() => {
        deleteConfirmationModal.style.opacity = '1';
    }, 10);
    
    // Setup cancel button
    cancelDeleteBtn.onclick = () => {
        deleteConfirmationModal.style.opacity = '0';
        setTimeout(() => {
            deleteConfirmationModal.style.display = 'none';
        }, 300);
    };
    
    // Setup confirm button
    confirmDeleteBtn.onclick = () => {
        // Get the message key from the modal
        const keyToDelete = deleteConfirmationModal.dataset.messageKey;
        
        // Delete the message
        if (keyToDelete) {
            deleteMessage(keyToDelete);
        }
        
        // Hide the modal
        deleteConfirmationModal.style.opacity = '0';
        setTimeout(() => {
            deleteConfirmationModal.style.display = 'none';
        }, 300);
    };
}

// Update the closePopups function to include all popups
function closePopups(e) {
    const messageOptions = document.getElementById('message-options');
    const emojiPicker = document.getElementById('emoji-picker');
    const deleteConfirmationModal = document.getElementById('delete-confirmation-modal');
    const deleteForMeModal = document.getElementById('delete-for-me-confirmation-modal');
    
    // Skip if the click is on or within these elements
    if (e.target.closest('#message-options') || 
        e.target.closest('#emoji-picker') || 
        e.target.closest('#delete-confirmation-modal') ||
        e.target.closest('#delete-for-me-confirmation-modal')) {
        return;
    }
    
    // Close message options if open
    if (messageOptions && messageOptions.classList.contains('active')) {
        messageOptions.classList.remove('active');
    }
    
    // Close emoji picker if open and not in message input mode
    if (emojiPicker && emojiPicker.classList.contains('active') && 
        !e.target.closest('#message-input') && !e.target.closest('#emoji-button')) {
        emojiPicker.classList.remove('active');
        emojiPicker.classList.remove('reaction-mode');
    }
}

// Format timestamp to a readable time string
function formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    // Format: HH:MM for today, MM/DD HH:MM for other days
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    if (isToday) {
        return `${hours}:${minutes}`;
    } else {
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${month}/${day} ${hours}:${minutes}`;
    }
}