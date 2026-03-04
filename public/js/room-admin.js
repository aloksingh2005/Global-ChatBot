// Firebase configuration is assumed to be already initialized in the main app
// This file adds Room Ownership & Admin Roles functionality

// Constants for role types
const ROLE_OWNER = 'owner';
const ROLE_ADMIN = 'admin';
const ROLE_MODERATOR = 'moderator';
const ROLE_MEMBER = 'member';

// Global variables
let currentRoomId = null;
let currentUserRoles = {};

// Initialize room admin functionality
function initRoomAdmin() {
    // Get room ID from URL if available
    const urlParams = new URLSearchParams(window.location.search);
    currentRoomId = urlParams.get('room');
    
    if (!currentRoomId) {
        console.log("Not in a specific room. Room admin features disabled.");
        return;
    }
    
    // Add event listeners for admin UI elements
    const adminControlsBtn = document.getElementById('admin-controls-btn');
    if (adminControlsBtn) {
        adminControlsBtn.addEventListener('click', showAdminControls);
    }
    
    // Check current user's role in this room
    checkUserRole();
}

// Check the current user's role in this room
function checkUserRole() {
    const user = firebase.auth().currentUser;
    if (!user || !currentRoomId) return;
    
    const roomRolesRef = firebase.database().ref(`room_roles/${currentRoomId}`);
    roomRolesRef.once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                const roles = snapshot.val();
                
                // Check if user is owner
                if (roles.owner === user.uid) {
                    currentUserRoles[ROLE_OWNER] = true;
                    showAdminUI(true);
                    return;
                }
                
                // Check if user is in admins list
                if (roles.admins && roles.admins[user.uid]) {
                    currentUserRoles[ROLE_ADMIN] = true;
                    showAdminUI(true);
                    return;
                }
                
                // Check if user is in moderators list
                if (roles.moderators && roles.moderators[user.uid]) {
                    currentUserRoles[ROLE_MODERATOR] = true;
                    showModeratorUI(true);
                    return;
                }
                
                // Default is regular member
                currentUserRoles[ROLE_MEMBER] = true;
                showRegularUI();
            } else {
                // If no roles are set up yet, the room creator becomes owner
                checkRoomCreator();
            }
        })
        .catch(error => {
            console.error("Error checking user role:", error);
        });
}

// Check if current user is the room creator
function checkRoomCreator() {
    const user = firebase.auth().currentUser;
    if (!user || !currentRoomId) return;
    
    firebase.database().ref(`rooms/${currentRoomId}`).once('value')
        .then(snapshot => {
            if (snapshot.exists() && snapshot.val().createdBy === user.uid) {
                // Set this user as the owner in room_roles
                const updates = {};
                updates[`room_roles/${currentRoomId}/owner`] = user.uid;
                
                firebase.database().ref().update(updates)
                    .then(() => {
                        currentUserRoles[ROLE_OWNER] = true;
                        showAdminUI(true);
                    })
                    .catch(error => {
                        console.error("Error setting room owner:", error);
                    });
            } else {
                // User is just a regular member
                currentUserRoles[ROLE_MEMBER] = true;
                showRegularUI();
            }
        })
        .catch(error => {
            console.error("Error checking room creator:", error);
        });
}

// Show admin UI elements
function showAdminUI(isVisible) {
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
        el.style.display = isVisible ? 'block' : 'none';
    });
    
    // Also show moderator UI for admins
    showModeratorUI(isVisible);
}

// Show moderator UI elements
function showModeratorUI(isVisible) {
    const modElements = document.querySelectorAll('.moderator-only');
    modElements.forEach(el => {
        el.style.display = isVisible ? 'block' : 'none';
    });
}

// Show regular member UI
function showRegularUI() {
    showAdminUI(false);
    showModeratorUI(false);
}

// Display the admin controls panel
function showAdminControls() {
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) {
        // Populate member list
        populateMemberList();
        adminPanel.style.display = 'block';
    }
}

// Close the admin controls panel
function closeAdminControls() {
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) {
        adminPanel.style.display = 'none';
    }
}

// Populate the member list in admin panel
function populateMemberList() {
    const memberListElement = document.getElementById('room-member-list');
    if (!memberListElement || !currentRoomId) return;
    
    // Clear existing list
    memberListElement.innerHTML = '<div class="loading-spinner">Loading members...</div>';
    
    // Get all members in this room
    firebase.database().ref(`room_members/${currentRoomId}`).once('value')
        .then(snapshot => {
            memberListElement.innerHTML = '';
            
            if (!snapshot.exists() || snapshot.numChildren() === 0) {
                memberListElement.innerHTML = '<div class="no-members">No members found</div>';
                return;
            }
            
            // Get room roles for role display
            firebase.database().ref(`room_roles/${currentRoomId}`).once('value')
                .then(rolesSnapshot => {
                    const roles = rolesSnapshot.exists() ? rolesSnapshot.val() : {};
                    const owner = roles.owner || '';
                    const admins = roles.admins || {};
                    const moderators = roles.moderators || {};
                    
                    // Process each member
                    snapshot.forEach(childSnapshot => {
                        const memberId = childSnapshot.key;
                        const memberData = childSnapshot.val();
                        
                        let roleLabel = 'Member';
                        if (memberId === owner) roleLabel = 'Owner';
                        else if (admins[memberId]) roleLabel = 'Admin';
                        else if (moderators[memberId]) roleLabel = 'Moderator';
                        
                        const memberElement = document.createElement('div');
                        memberElement.className = 'member-item';
                        memberElement.dataset.uid = memberId;
                        
                        memberElement.innerHTML = `
                            <div class="member-info">
                                <div class="member-avatar">
                                    ${memberData.photoURL ? 
                                      `<img src="${memberData.photoURL}" alt="${memberData.displayName}">` : 
                                      `<div class="avatar-placeholder">${memberData.displayName.charAt(0)}</div>`}
                                </div>
                                <div class="member-details">
                                    <div class="member-name">${memberData.displayName || 'User'}</div>
                                    <div class="member-role">${roleLabel}</div>
                                </div>
                            </div>
                            <div class="member-actions">
                                ${createMemberActionButtons(memberId, roleLabel)}
                            </div>
                        `;
                        
                        memberListElement.appendChild(memberElement);
                    });
                    
                    // Add event listeners to action buttons
                    addMemberActionListeners();
                })
                .catch(error => {
                    console.error("Error getting room roles:", error);
                    memberListElement.innerHTML = '<div class="error">Error loading members</div>';
                });
        })
        .catch(error => {
            console.error("Error getting room members:", error);
            memberListElement.innerHTML = '<div class="error">Error loading members</div>';
        });
}

// Create action buttons for a member based on their role and current user's role
function createMemberActionButtons(memberId, memberRole) {
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) return '';
    
    // Don't show actions for yourself
    if (memberId === currentUser.uid) return '';
    
    let buttons = '';
    
    // Only owners can change admins
    if (currentUserRoles[ROLE_OWNER]) {
        if (memberRole === 'Admin') {
            buttons += `<button class="demote-admin-btn" data-uid="${memberId}">Remove Admin</button>`;
        } else if (memberRole === 'Moderator') {
            buttons += `<button class="promote-admin-btn" data-uid="${memberId}">Make Admin</button>`;
            buttons += `<button class="demote-mod-btn" data-uid="${memberId}">Remove Moderator</button>`;
        } else if (memberRole === 'Member') {
            buttons += `<button class="promote-admin-btn" data-uid="${memberId}">Make Admin</button>`;
            buttons += `<button class="promote-mod-btn" data-uid="${memberId}">Make Moderator</button>`;
        }
        
        buttons += `<button class="kick-member-btn" data-uid="${memberId}">Kick</button>`;
    }
    // Admins can manage moderators and regular members
    else if (currentUserRoles[ROLE_ADMIN]) {
        if (memberRole === 'Moderator') {
            buttons += `<button class="demote-mod-btn" data-uid="${memberId}">Remove Moderator</button>`;
        } else if (memberRole === 'Member') {
            buttons += `<button class="promote-mod-btn" data-uid="${memberId}">Make Moderator</button>`;
        }
        
        if (memberRole !== 'Owner' && memberRole !== 'Admin') {
            buttons += `<button class="kick-member-btn" data-uid="${memberId}">Kick</button>`;
        }
    }
    // Moderators can only kick regular members
    else if (currentUserRoles[ROLE_MODERATOR]) {
        if (memberRole === 'Member') {
            buttons += `<button class="kick-member-btn" data-uid="${memberId}">Kick</button>`;
        }
    }
    
    return buttons;
}

// Add event listeners to member action buttons
function addMemberActionListeners() {
    // Promote to admin
    document.querySelectorAll('.promote-admin-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const memberId = e.target.dataset.uid;
            promoteToAdmin(memberId);
        });
    });
    
    // Demote from admin
    document.querySelectorAll('.demote-admin-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const memberId = e.target.dataset.uid;
            demoteFromAdmin(memberId);
        });
    });
    
    // Promote to moderator
    document.querySelectorAll('.promote-mod-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const memberId = e.target.dataset.uid;
            promoteToModerator(memberId);
        });
    });
    
    // Demote from moderator
    document.querySelectorAll('.demote-mod-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const memberId = e.target.dataset.uid;
            demoteFromModerator(memberId);
        });
    });
    
    // Kick member
    document.querySelectorAll('.kick-member-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const memberId = e.target.dataset.uid;
            kickMember(memberId);
        });
    });
}

// Promote a user to admin
function promoteToAdmin(userId) {
    if (!currentRoomId || !currentUserRoles[ROLE_OWNER]) return;
    
    if (confirm('Are you sure you want to promote this user to Admin?')) {
        // Add to admins list
        firebase.database().ref(`room_roles/${currentRoomId}/admins/${userId}`).set(true)
            .then(() => {
                // Remove from moderators if they were one
                firebase.database().ref(`room_roles/${currentRoomId}/moderators/${userId}`).remove();
                
                // Refresh member list
                populateMemberList();
                
                // Show notification
                if (typeof showNotification === 'function') {
                    showNotification('User promoted to Admin successfully!', 'success');
                }
            })
            .catch(error => {
                console.error("Error promoting to admin:", error);
                if (typeof showNotification === 'function') {
                    showNotification('Failed to promote user. Please try again.', 'error');
                }
            });
    }
}

// Demote a user from admin
function demoteFromAdmin(userId) {
    if (!currentRoomId || !currentUserRoles[ROLE_OWNER]) return;
    
    if (confirm('Are you sure you want to remove this user from Admin role?')) {
        firebase.database().ref(`room_roles/${currentRoomId}/admins/${userId}`).remove()
            .then(() => {
                // Refresh member list
                populateMemberList();
                
                // Show notification
                if (typeof showNotification === 'function') {
                    showNotification('User removed from Admin role successfully!', 'success');
                }
            })
            .catch(error => {
                console.error("Error demoting from admin:", error);
                if (typeof showNotification === 'function') {
                    showNotification('Failed to demote user. Please try again.', 'error');
                }
            });
    }
}

// Promote a user to moderator
function promoteToModerator(userId) {
    if (!currentRoomId || (!currentUserRoles[ROLE_OWNER] && !currentUserRoles[ROLE_ADMIN])) return;
    
    if (confirm('Are you sure you want to promote this user to Moderator?')) {
        firebase.database().ref(`room_roles/${currentRoomId}/moderators/${userId}`).set(true)
            .then(() => {
                // Refresh member list
                populateMemberList();
                
                // Show notification
                if (typeof showNotification === 'function') {
                    showNotification('User promoted to Moderator successfully!', 'success');
                }
            })
            .catch(error => {
                console.error("Error promoting to moderator:", error);
                if (typeof showNotification === 'function') {
                    showNotification('Failed to promote user. Please try again.', 'error');
                }
            });
    }
}

// Demote a user from moderator
function demoteFromModerator(userId) {
    if (!currentRoomId || (!currentUserRoles[ROLE_OWNER] && !currentUserRoles[ROLE_ADMIN])) return;
    
    if (confirm('Are you sure you want to remove this user from Moderator role?')) {
        firebase.database().ref(`room_roles/${currentRoomId}/moderators/${userId}`).remove()
            .then(() => {
                // Refresh member list
                populateMemberList();
                
                // Show notification
                if (typeof showNotification === 'function') {
                    showNotification('User removed from Moderator role successfully!', 'success');
                }
            })
            .catch(error => {
                console.error("Error demoting from moderator:", error);
                if (typeof showNotification === 'function') {
                    showNotification('Failed to demote user. Please try again.', 'error');
                }
            });
    }
}

// Transfer room ownership to another user
function transferOwnership(userId) {
    if (!currentRoomId || !currentUserRoles[ROLE_OWNER]) return;
    
    if (confirm('Are you sure you want to transfer room ownership? You will lose owner privileges.')) {
        const updates = {};
        
        // Set new owner
        updates[`room_roles/${currentRoomId}/owner`] = userId;
        
        // Remove from admins/moderators if they were one
        updates[`room_roles/${currentRoomId}/admins/${userId}`] = null;
        updates[`room_roles/${currentRoomId}/moderators/${userId}`] = null;
        
        // Make current owner an admin
        const currentUser = firebase.auth().currentUser;
        if (currentUser) {
            updates[`room_roles/${currentRoomId}/admins/${currentUser.uid}`] = true;
        }
        
        firebase.database().ref().update(updates)
            .then(() => {
                // Refresh member list
                populateMemberList();
                
                // Update roles
                currentUserRoles = {};
                currentUserRoles[ROLE_ADMIN] = true;
                showAdminUI(true);
                
                // Show notification
                if (typeof showNotification === 'function') {
                    showNotification('Room ownership transferred successfully!', 'success');
                }
            })
            .catch(error => {
                console.error("Error transferring ownership:", error);
                if (typeof showNotification === 'function') {
                    showNotification('Failed to transfer ownership. Please try again.', 'error');
                }
            });
    }
}

// Kick a member from the room
function kickMember(userId) {
    if (!currentRoomId) return;
    
    // Check if current user has permission
    if (!currentUserRoles[ROLE_OWNER] && !currentUserRoles[ROLE_ADMIN] && !currentUserRoles[ROLE_MODERATOR]) {
        if (typeof showNotification === 'function') {
            showNotification('You do not have permission to kick members.', 'error');
        }
        return;
    }
    
    if (confirm('Are you sure you want to kick this user from the room?')) {
        // Remove from room members
        firebase.database().ref(`room_members/${currentRoomId}/${userId}`).remove()
            .then(() => {
                // Also remove any roles they had
                const updates = {};
                updates[`room_roles/${currentRoomId}/admins/${userId}`] = null;
                updates[`room_roles/${currentRoomId}/moderators/${userId}`] = null;
                
                return firebase.database().ref().update(updates);
            })
            .then(() => {
                // Add to kicked members list (for blocking re-entry)
                return firebase.database().ref(`room_kicked/${currentRoomId}/${userId}`).set({
                    kickedAt: firebase.database.ServerValue.TIMESTAMP,
                    kickedBy: firebase.auth().currentUser.uid
                });
            })
            .then(() => {
                // Refresh member list
                populateMemberList();
                
                // Show notification
                if (typeof showNotification === 'function') {
                    showNotification('User kicked from room successfully!', 'success');
                }
            })
            .catch(error => {
                console.error("Error kicking member:", error);
                if (typeof showNotification === 'function') {
                    showNotification('Failed to kick user. Please try again.', 'error');
                }
            });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initRoomAdmin);

// Export functions for use in other files
window.RoomAdmin = {
    checkUserRole,
    showAdminControls,
    closeAdminControls,
    transferOwnership
}; 