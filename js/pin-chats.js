// This file adds pin chats functionality
// Firebase configuration is assumed to be already initialized in the main app

// Global variables
let currentRoomId = null;
let currentUser = null;
let pinnedMessages = {};

// Initialize pin chats functionality
function initPinChats() {
    // Get room ID from URL if available
    const urlParams = new URLSearchParams(window.location.search);
    currentRoomId = urlParams.get('room') || 'global_messages';
    
    // Get current user
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            // Start listening for pinned messages
            listenForPinnedMessages();
        }
    });
}

// Listen for pinned messages
function listenForPinnedMessages() {
    const pinnedRef = firebase.database().ref(`pinned_messages/${currentRoomId}`);
    
    pinnedRef.on('value', snapshot => {
        pinnedMessages = snapshot.val() || {};
        updatePinnedMessagesUI();
    });
}

// Update the UI to show pinned messages
function updatePinnedMessagesUI() {
    const pinnedContainer = document.getElementById('pinned-messages-container');
    if (!pinnedContainer) return;
    
    // Clear existing pinned messages
    pinnedContainer.innerHTML = '';
    
    // If no pinned messages, hide the container
    if (!pinnedMessages || Object.keys(pinnedMessages).length === 0) {
        pinnedContainer.style.display = 'none';
        return;
    }
    
    // Show the container
    pinnedContainer.style.display = 'block';
    
    // Add each pinned message
    for (const messageId in pinnedMessages) {
        const pinnedInfo = pinnedMessages[messageId];
        
        // Get the message content from the database
        firebase.database().ref(`${currentRoomId}/${messageId}`).once('value')
            .then(snapshot => {
                if (snapshot.exists()) {
                    const message = snapshot.val();
                    
                    // Create pinned message element
                    const pinnedEl = document.createElement('div');
                    pinnedEl.className = 'pinned-message';
                    pinnedEl.dataset.messageId = messageId;
                    
                    // Format the message HTML
                    let pinnedBy = '';
                    if (pinnedInfo.pinnedBy && pinnedInfo.pinnedByName) {
                        pinnedBy = `
                            <div class="pinned-by">
                                Pinned by ${escapeHTML(pinnedInfo.pinnedByName)}
                            </div>
                        `;
                    }
                    
                    const timestamp = new Date(message.timestamp);
                    const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    // Determine if current user can unpin
                    let unpinButton = '';
                    
                    // Check if current user is room admin
                    if (window.RoomActions && typeof window.RoomActions.isRoomModeratorOrHigher === 'function') {
                        window.RoomActions.isRoomModeratorOrHigher().then(isModerator => {
                            if (isModerator || pinnedInfo.pinnedBy === currentUser.uid) {
                                unpinButton = `
                                    <button class="unpin-btn" data-message-id="${messageId}">
                                        <i class="fas fa-thumbtack fa-rotate-90"></i> Unpin
                                    </button>
                                `;
                                
                                // Re-render with the unpin button
                                renderPinnedMessage(pinnedEl, message, unpinButton, pinnedBy, timeString);
                            }
                        });
                    } else if (pinnedInfo.pinnedBy === currentUser.uid) {
                        // If RoomActions not available, at least let the pinner unpin
                        unpinButton = `
                            <button class="unpin-btn" data-message-id="${messageId}">
                                <i class="fas fa-thumbtack fa-rotate-90"></i> Unpin
                            </button>
                        `;
                    }
                    
                    // Render the pinned message
                    renderPinnedMessage(pinnedEl, message, unpinButton, pinnedBy, timeString);
                    
                    // Add the pinned message to the container
                    pinnedContainer.appendChild(pinnedEl);
                }
            })
            .catch(error => {
                console.error("Error getting pinned message:", error);
            });
    }
}

// Helper function to render a pinned message
function renderPinnedMessage(element, message, unpinButton, pinnedBy, timeString) {
    element.innerHTML = `
        <div class="pinned-message-inner">
            <div class="pinned-icon">
                <i class="fas fa-thumbtack"></i>
            </div>
            <div class="pinned-content">
                <div class="pinned-author">${escapeHTML(message.displayName || 'User')}</div>
                <div class="pinned-text">${escapeHTML(message.message || '')}</div>
                <div class="pinned-time">${timeString}</div>
                ${pinnedBy}
            </div>
            <div class="pinned-actions">
                <button class="goto-message-btn" data-message-id="${element.dataset.messageId}">
                    <i class="fas fa-arrow-right"></i>
                </button>
                ${unpinButton}
            </div>
        </div>
    `;
    
    // Add event listeners for the buttons
    const gotoBtn = element.querySelector('.goto-message-btn');
    if (gotoBtn) {
        gotoBtn.addEventListener('click', () => {
            scrollToMessage(element.dataset.messageId);
        });
    }
    
    const unpinBtn = element.querySelector('.unpin-btn');
    if (unpinBtn) {
        unpinBtn.addEventListener('click', () => {
            unpinMessage(element.dataset.messageId);
        });
    }
}

// Pin a message
function pinMessage(messageId) {
    if (!currentUser || !messageId) return;
    
    // Get the message
    firebase.database().ref(`${currentRoomId}/${messageId}`).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                console.error("Cannot pin message: message not found");
                return;
            }
            
            // Check if user has permission
            if (window.RoomActions && typeof window.RoomActions.isRoomModeratorOrHigher === 'function') {
                return window.RoomActions.isRoomModeratorOrHigher();
            }
            
            // If RoomActions not available, allow anyone to pin (could be restricted in a real app)
            return true;
        })
        .then(canPin => {
            if (!canPin) {
                if (typeof showNotification === 'function') {
                    showNotification('You do not have permission to pin messages.', 'error');
                }
                return;
            }
            
            // Add to pinned messages
            return firebase.database().ref(`pinned_messages/${currentRoomId}/${messageId}`).set({
                pinnedAt: firebase.database.ServerValue.TIMESTAMP,
                pinnedBy: currentUser.uid,
                pinnedByName: currentUser.displayName || 'User'
            });
        })
        .then(() => {
            if (typeof showNotification === 'function') {
                showNotification('Message pinned successfully!', 'success');
            }
        })
        .catch(error => {
            console.error("Error pinning message:", error);
            if (typeof showNotification === 'function') {
                showNotification('Failed to pin message. Please try again.', 'error');
            }
        });
}

// Unpin a message
function unpinMessage(messageId) {
    if (!currentUser || !messageId) return;
    
    // Check if user has permission
    let canUnpin = false;
    
    // The user who pinned it can unpin
    if (pinnedMessages[messageId] && pinnedMessages[messageId].pinnedBy === currentUser.uid) {
        canUnpin = true;
    } else if (window.RoomActions && typeof window.RoomActions.isRoomModeratorOrHigher === 'function') {
        // Or moderators/admins/owners can unpin
        window.RoomActions.isRoomModeratorOrHigher()
            .then(isModerator => {
                canUnpin = isModerator;
                
                if (!canUnpin) {
                    if (typeof showNotification === 'function') {
                        showNotification('You do not have permission to unpin this message.', 'error');
                    }
                    return;
                }
                
                // Remove from pinned messages
                return firebase.database().ref(`pinned_messages/${currentRoomId}/${messageId}`).remove();
            })
            .then(() => {
                if (typeof showNotification === 'function') {
                    showNotification('Message unpinned successfully!', 'success');
                }
            })
            .catch(error => {
                console.error("Error unpinning message:", error);
                if (typeof showNotification === 'function') {
                    showNotification('Failed to unpin message. Please try again.', 'error');
                }
            });
    } else {
        // If already determined can unpin
        if (canUnpin) {
            firebase.database().ref(`pinned_messages/${currentRoomId}/${messageId}`).remove()
                .then(() => {
                    if (typeof showNotification === 'function') {
                        showNotification('Message unpinned successfully!', 'success');
                    }
                })
                .catch(error => {
                    console.error("Error unpinning message:", error);
                    if (typeof showNotification === 'function') {
                        showNotification('Failed to unpin message. Please try again.', 'error');
                    }
                });
        } else if (typeof showNotification === 'function') {
            showNotification('You do not have permission to unpin this message.', 'error');
        }
    }
}

// Scroll to a message
function scrollToMessage(messageId) {
    const messageElement = document.querySelector(`.message-row[data-key="${messageId}"]`);
    if (messageElement) {
        // Scroll to the message
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Highlight the message temporarily
        messageElement.classList.add('highlight-message');
        setTimeout(() => {
            messageElement.classList.remove('highlight-message');
        }, 2000);
    }
}

// Add "Pin" option to message options menu
function addPinOption() {
    // This should be called from the main chat.js file
    // when the message options menu is being created
    
    const messageOptions = document.getElementById('message-options');
    if (!messageOptions) return;
    
    // Check if the pin option already exists
    if (messageOptions.querySelector('.pin-option')) return;
    
    // Create the pin option
    const pinOption = document.createElement('div');
    pinOption.className = 'menu-option pin-option';
    pinOption.innerHTML = '<i class="fas fa-thumbtack"></i> Pin Message';
    
    // Insert after the reply option
    const replyOption = messageOptions.querySelector('.reply-option');
    if (replyOption) {
        replyOption.after(pinOption);
    } else {
        messageOptions.appendChild(pinOption);
    }
    
    // Add event listener
    pinOption.addEventListener('click', () => {
        const messageKey = messageOptions.dataset.messageKey;
        if (messageKey) {
            pinMessage(messageKey);
        }
        
        // Close the menu
        messageOptions.classList.remove('active');
    });
}

// Utility function - can be replaced with your existing one
function escapeHTML(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initPinChats();
    
    // Add pin option to message options menu
    // This needs to be done after the menu is created
    setTimeout(addPinOption, 1000);
});

// Export functions for use in other files
window.PinChats = {
    pinMessage,
    unpinMessage,
    scrollToMessage,
    addPinOption
}; 