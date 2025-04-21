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

// Global variable for current user - MAKE SURE IT'S DEFINED GLOBALLY
let currentUser = null;
// Global variable for message path - needed by functions outside DOMContentLoaded
let messagesPath = 'global_messages'; // Default, will be updated later
// Global variable for storing element to delete - needed by confirm/delete functions
let elementToDeleteForMe = null;
// Global variable for typing timeout - needed by updateTypingStatus
let typingTimeout;

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
    console.log(`showMessageOptions called for key: ${messageKey}, isMyMessage: ${isMyMessage}`); // Log entry
    const messageOptions = document.getElementById('message-options');
    // --- Add check for main container ---
    if (!messageOptions) {
        console.error("Message options container (#message-options) not found!");
        return;
    }

    const deleteOption = messageOptions.querySelector('.delete-option');
    const replyOption = messageOptions.querySelector('.reply-option');
    const reactOption = messageOptions.querySelector('.react-option');
    const emojiPicker = document.getElementById('emoji-picker'); // Assuming emoji picker exists globally

    // --- Add check for specific options and picker ---
    if (!deleteOption || !replyOption || !reactOption) {
         console.error("One or more options elements (delete, reply, react) not found within #message-options!");
         // Optionally hide the whole menu if parts are missing, or just log
         // messageOptions.classList.remove('active'); // Example: hide if broken
         // return;
    }
    if (!emojiPicker) {
         console.warn("Emoji picker element (#emoji-picker) not found."); // Warn but maybe continue
    }
    // --- End checks ---

    // Positioning logic (keep as is, maybe wrap in try/catch if needed)
    try {
        const bubbleRect = event.target.getBoundingClientRect();
        // ... (rest of positioning code) ...
        console.log("Calculated message options position:", messageOptions.style.top, messageOptions.style.left);
    } catch (posError) {
        console.error("Error calculating message options position:", posError);
        return; // Stop if positioning fails
    }


    // Show delete option only for your own messages
    if (deleteOption) { // Check if deleteOption exists before styling
        console.log(`Setting delete option display: ${isMyMessage ? 'flex' : 'none'}`);
        deleteOption.style.display = isMyMessage ? 'flex' : 'none';
    }


    // Show the options menu
    messageOptions.classList.add('active');
    messageOptions.dataset.messageKey = messageKey;
    console.log("Message options menu activated.");

    // Setup onclick handlers only if elements exist
    if (reactOption && emojiPicker) {
        reactOption.onclick = function(e) {
            e.stopPropagation();
            // ... (position and show emojiPicker logic) ...
            messageOptions.classList.remove('active');
        };
    }

    if (replyOption) {
        replyOption.onclick = function() {
            // ... (prepareReply logic) ...
            messageOptions.classList.remove('active');
        };
    }

     if (deleteOption) {
        deleteOption.onclick = function () {
             console.log(`Delete option clicked for key: ${messageKey}`);
             if (typeof deleteMessage === 'function') {
                  if (confirm('Are you sure you want to delete this message?')) {
                      deleteMessage(messageKey);
                  }
             } else {
                 console.error("deleteMessage function is not defined globally!");
                 alert("Error: Delete function not available.");
             }
             messageOptions.classList.remove('active');
         };
     }


    // Click outside to close - You might need a more robust way to handle this listener
    // to avoid adding it multiple times. For now, just log.
    console.log("Attaching document click listener for closePopups (if needed)");
    // document.addEventListener('click', closePopups);
}

function closePopups(e) {
    // Implementation of closePopups function
}

function setupLongPress(element, messageKey, isMyMessage) {
    let pressTimer;
    let isLongPressing = false;
    console.log(`setupLongPress called for key: ${messageKey}, isMyMessage: ${isMyMessage}`); // Log entry

    const startPress = function (e) {
        console.log(`startPress triggered for key: ${messageKey}`); // Log start
        // If the message somehow got deleted between display and press, do nothing
        const messageRow = element.closest('.message-row');
        if (messageRow && messageRow.classList.contains('deleted')) {
            console.log(`Message ${messageKey} is deleted, aborting long press.`);
            return;
        }

        isLongPressing = false;
        element.classList.add('pressing');

        pressTimer = setTimeout(function () {
            isLongPressing = true;
            element.classList.remove('pressing');
            console.log(`Long press detected for key: ${messageKey}. Showing options.`); // Log detection
            showMessageOptions(e, messageKey, isMyMessage); // Call the function to show the menu
        }, 500);
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

    // Add listeners
    element.addEventListener('mousedown', startPress);
    element.addEventListener('touchstart', startPress, { passive: true });

    element.addEventListener('mouseup', endPress);
    element.addEventListener('mouseleave', cancelPress);
    element.addEventListener('touchend', endPress);
    element.addEventListener('touchcancel', endPress);
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

    const newMessage = {
        uid: currentUser.uid,
        displayName: currentUser.displayName || 'Anonymous',
        photoURL: currentUser.photoURL,
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
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) {
         console.error("Messages container not found. Cannot load messages.");
         return;
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
                    // *** Pass the user object to displayMessage ***
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
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) return;

    const isMyMessage = message.uid === user.uid;
    const messageClass = isMyMessage ? 'my-message' : 'others-message';
    const timestamp = new Date(message.timestamp);
    const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const messageEl = document.createElement('div');
    messageEl.className = `message-row ${messageClass} ${message.deleted ? 'deleted' : ''}`;
    messageEl.dataset.key = key;
    messageEl.dataset.sender = message.uid;
    messageEl.dataset.text = message.message || '';

    let replyHtml = '';
    if (message.replyTo && message.replyToName && message.replyToText) {
        const replyToName = message.replyToName;
        const replyToText = message.replyToText;
         // Ensure escapeHTML exists
         const safeName = (typeof escapeHTML === 'function') ? escapeHTML(replyToName) : replyToName;
         const safeText = (typeof escapeHTML === 'function') ? escapeHTML(replyToText) : replyToText;
         replyHtml = `<div class="reply-container"><div class="reply-sender">${safeName}</div><div class="reply-text">${safeText}</div></div>`;
    }

    let avatarHTML = '';
    if (!isMyMessage) {
        const displayName = message.displayName || 'User';
        // Ensure getRandomColor exists
        const safeColor = (typeof getRandomColor === 'function') ? getRandomColor(message.uid) : '#cccccc';
        const avatarText = message.photoURL
             ? `<img src="${message.photoURL}" alt="${displayName}" style="width:100%;height:100%;border-radius:50%; object-fit: cover;">`
             : displayName.charAt(0).toUpperCase();
        const avatarBg = message.photoURL ? 'transparent' : safeColor;
        avatarHTML = `<div class="message-avatar" style="width:30px;height:30px;border-radius:50%;background-color:${avatarBg};color:white;display:inline-flex;justify-content:center;align-items:center;margin-right:8px;font-size:14px; flex-shrink: 0;">${avatarText}</div>`;
    }

    let statusHtml = '';
     if (isMyMessage && !message.deleted) {
         const statusIcon = message.status === 'read' ? 'fa-check-double' : 'fa-check';
         const statusColor = message.status === 'read' ? '#4FC3F7' : 'var(--secondary-text)';
         statusHtml = `<span class="message-status" style="color:${statusColor};"><i class="fas ${statusIcon}"></i></span>`;
    }

    // Ensure escapeHTML exists
    let messageContent = message.deleted
        ? '<span class="deleted-message"><i class="fas fa-ban" style="margin-right: 5px;"></i>This message was deleted</span>'
        : ((typeof escapeHTML === 'function') ? escapeHTML(message.message || '') : (message.message || ''));

    let reactionsHtml = '';
    if (message.reactions && !message.deleted) {
        const reactionCounts = {};
        let currentUserReaction = null;
        for (const userId in message.reactions) {
            const emoji = message.reactions[userId];
            reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
            if (userId === user?.uid) { // Use passed user
                currentUserReaction = emoji;
            }
        }
        if (Object.keys(reactionCounts).length > 0) {
            reactionsHtml += '<div class="message-reactions">';
            for (const emoji in reactionCounts) {
                const count = reactionCounts[emoji];
                const reactedByMeClass = (currentUserReaction === emoji) ? 'reacted-by-me' : '';
                reactionsHtml += `
                    <div class="reaction-chip ${reactedByMeClass}" data-emoji="${emoji}" data-message-key="${key}">
                        ${emoji} <span class="reaction-count">${count > 1 ? count : ''}</span>
                    </div>
                `;
            }
            reactionsHtml += '</div>';
        }
    }

    const editedIndicator = message.editedAt ? '<span class="edited-indicator">(edited)</span>' : '';

    messageEl.innerHTML = `
        <div class="message-group">
             ${!isMyMessage ? `<div class="sender-name">${escapeHTML(message.displayName || 'User')}</div>` : ''}
             <div style="display:flex; align-items:flex-end; ${isMyMessage ? 'justify-content:flex-end;' : ''}">
                ${!isMyMessage ? avatarHTML : ''}
                <div class="message-bubble">
                        ${replyHtml}
                        <div class="message-content">${messageContent}</div>
                         <div style="text-align: right; margin-top: 3px;">
                            ${editedIndicator}
                            <span class="message-time">${timeString}</span>
                            ${statusHtml}
                         </div>
                         ${reactionsHtml}
                </div>
            </div>
        </div>
    `;

    messagesContainer.appendChild(messageEl);

    // Interaction Logic (ensure functions exist before calling)
    if (!message.deleted) {
        const messageBubble = messageEl.querySelector('.message-bubble');
        if (messageBubble) {
            if (typeof setupLongPress === 'function') {
                console.log("Attaching REGULAR long press listener to bubble:", messageBubble, "for key:", key);
                setupLongPress(messageBubble, key, isMyMessage);
            } else {
                console.error("setupLongPress function not defined.");
            }
            messageBubble.querySelectorAll('.reaction-chip').forEach(chip => {
                chip.addEventListener('click', function(e) {
                    e.stopPropagation(); // Prevent triggering long press
                    const clickedEmoji = this.dataset.emoji;
                    const msgKey = this.dataset.messageKey;
                    // Ensure addOrUpdateReaction is available
                    if (typeof addOrUpdateReaction === 'function') {
                         addOrUpdateReaction(msgKey, clickedEmoji);
                    } else {
                        console.error("addOrUpdateReaction function is not defined.");
                    }
                });
            });
        } else {
            console.error("Message bubble not found for non-deleted message:", key);
        }
    } else if (message.deleted && isMyMessage) {
        // --- Add specific long-press for "Delete for me" on OWN deleted messages ---
        console.log("Attaching DELETED placeholder long press listener to messageEl:", messageEl, "for key:", key);
         // Ensure setupDeletedPlaceholderLongPress is available
         if (typeof setupDeletedPlaceholderLongPress === 'function') {
            setupDeletedPlaceholderLongPress(messageEl, messageEl); // Pass the whole row element
         } else {
             console.error("setupDeletedPlaceholderLongPress function is not defined.");
         }
    }
}

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
         db.ref(`typing/${currentUser.uid}`).set(isTyping ? {
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
    const messagesContainer = document.getElementById('messages-container');
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
            db.ref(`typing/${currentUser.uid}`).onDisconnect().remove();
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
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) {
             console.error("Messages container not found. Cannot load messages.");
             return;
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
                        // *** Pass the user object to displayMessage ***
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