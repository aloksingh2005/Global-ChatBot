// This file adds room actions functionality (leave/kick functionality)
// Firebase configuration is assumed to be already initialized in the main app

// Global variables
let currentRoomId = null;

// Initialize room actions functionality
function initRoomActions() {
    // Get room ID from URL if available
    const urlParams = new URLSearchParams(window.location.search);
    currentRoomId = urlParams.get('room');
    
    if (!currentRoomId) {
        console.log("Not in a specific room. Room actions disabled.");
        return;
    }
    
    // Add event listeners for UI elements
    const leaveRoomBtn = document.getElementById('leave-room-btn');
    if (leaveRoomBtn) {
        leaveRoomBtn.addEventListener('click', leaveRoom);
    }
}

// Function for a user to leave a room voluntarily
function leaveRoom() {
    const user = firebase.auth().currentUser;
    if (!user || !currentRoomId) {
        console.error("Cannot leave room: user not logged in or room ID not set.");
        return;
    }
    
    if (confirm('Are you sure you want to leave this room? You will need an invitation to rejoin.')) {
        // Remove user from room members
        firebase.database().ref(`room_members/${currentRoomId}/${user.uid}`).remove()
            .then(() => {
                // Also remove any roles they had
                const updates = {};
                updates[`room_roles/${currentRoomId}/admins/${user.uid}`] = null;
                updates[`room_roles/${currentRoomId}/moderators/${user.uid}`] = null;
                
                // Don't remove ownership - that would break the room
                // If owner wants to leave, they should transfer ownership first
                
                return firebase.database().ref().update(updates);
            })
            .then(() => {
                // Redirect to dashboard
                console.log("Successfully left room");
                if (typeof showNotification === 'function') {
                    showNotification('You have left the room.', 'success');
                }
                
                // Wait a bit before redirecting
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            })
            .catch(error => {
                console.error("Error leaving room:", error);
                if (typeof showNotification === 'function') {
                    showNotification('Failed to leave room. Please try again.', 'error');
                }
            });
    }
}

// Function to check if the current user is the room owner
function isRoomOwner() {
    return new Promise((resolve, reject) => {
        const user = firebase.auth().currentUser;
        if (!user || !currentRoomId) {
            resolve(false);
            return;
        }
        
        firebase.database().ref(`room_roles/${currentRoomId}/owner`).once('value')
            .then(snapshot => {
                resolve(snapshot.exists() && snapshot.val() === user.uid);
            })
            .catch(error => {
                console.error("Error checking room ownership:", error);
                resolve(false);
            });
    });
}

// Function to check if the current user has admin or higher role
function isRoomAdminOrHigher() {
    return new Promise((resolve, reject) => {
        const user = firebase.auth().currentUser;
        if (!user || !currentRoomId) {
            resolve(false);
            return;
        }
        
        isRoomOwner().then(isOwner => {
            if (isOwner) {
                resolve(true);
                return;
            }
            
            firebase.database().ref(`room_roles/${currentRoomId}/admins/${user.uid}`).once('value')
                .then(snapshot => {
                    resolve(snapshot.exists() && snapshot.val() === true);
                })
                .catch(error => {
                    console.error("Error checking admin role:", error);
                    resolve(false);
                });
        });
    });
}

// Function to check if the current user has moderator or higher role
function isRoomModeratorOrHigher() {
    return new Promise((resolve, reject) => {
        const user = firebase.auth().currentUser;
        if (!user || !currentRoomId) {
            resolve(false);
            return;
        }
        
        isRoomAdminOrHigher().then(isAdmin => {
            if (isAdmin) {
                resolve(true);
                return;
            }
            
            firebase.database().ref(`room_roles/${currentRoomId}/moderators/${user.uid}`).once('value')
                .then(snapshot => {
                    resolve(snapshot.exists() && snapshot.val() === true);
                })
                .catch(error => {
                    console.error("Error checking moderator role:", error);
                    resolve(false);
                });
        });
    });
}

// Display warning before owner leaves
function checkOwnerLeaving() {
    isRoomOwner().then(isOwner => {
        if (isOwner) {
            alert('Warning: You are the owner of this room. If you leave without transferring ownership, the room may become difficult to manage.\n\nPlease transfer ownership to another member first.');
            
            // Option to open admin panel to transfer ownership
            if (confirm('Do you want to open the admin panel to transfer ownership now?')) {
                // Use RoomAdmin functionality if available
                if (window.RoomAdmin && typeof window.RoomAdmin.showAdminControls === 'function') {
                    window.RoomAdmin.showAdminControls();
                }
            }
            
            return false;
        }
        return true;
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initRoomActions);

// Export functions for use in other files
window.RoomActions = {
    leaveRoom,
    isRoomOwner,
    isRoomAdminOrHigher,
    isRoomModeratorOrHigher,
    checkOwnerLeaving
}; 