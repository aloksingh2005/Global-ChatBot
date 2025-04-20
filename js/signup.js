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

document.addEventListener('DOMContentLoaded', () => {
    // Get form elements
    const signupForm = document.getElementById('signup-form');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    const googleSignupBtn = document.getElementById('google-signup');
    const facebookSignupBtn = document.getElementById('facebook-signup');
    
    // Check if user is already logged in
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in, redirect to dashboard
            window.location.href = 'dashboard.html';
        }
    });
    
    // Form submission handler
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Basic validation
        const username = usernameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        
        if (username.length < 2) {
            showError('Name must be at least 2 characters long');
            return;
        }
        
        if (!isValidEmail(email)) {
            showError('Please enter a valid email address');
            return;
        }
        
        if (password.length < 6) {
            showError('Password must be at least 6 characters long');
            return;
        }
        
        // Create user in Firebase
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Add user to Firestore
                return db.collection('users').doc(userCredential.user.uid).set({
                    username: username,
                    email: email,
                    createdAt: new Date(),
                    photoURL: null
                });
            })
            .then(() => {
                // Update user profile
                return auth.currentUser.updateProfile({
                    displayName: username
                });
            })
            .then(() => {
                // Registration successful
                showSuccess('Account created successfully!');
                
                // Redirect to dashboard page after successful signup
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            })
            .catch(error => {
                // Handle errors
                let errorMsg = 'Registration failed. Please try again.';
                
                if (error.code === 'auth/email-already-in-use') {
                    errorMsg = 'This email is already registered. Please login instead.';
                } else if (error.code === 'auth/weak-password') {
                    errorMsg = 'Password is too weak. Please choose a stronger password.';
                }
                
                showError(errorMsg);
            });
    });
    
    // Google Sign Up
    googleSignupBtn.addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .then((result) => {
                const user = result.user;
                // Check if this is a new user
                return db.collection('users').doc(user.uid).get()
                    .then((doc) => {
                        if (!doc.exists) {
                            // New user, add to Firestore
                            return db.collection('users').doc(user.uid).set({
                                username: user.displayName,
                                email: user.email,
                                createdAt: new Date(),
                                photoURL: user.photoURL
                            });
                        }
                    });
            })
            .then(() => {
                showSuccess('Account created successfully!');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            })
            .catch(error => {
                showError('Google sign-up failed. Please try again.');
                console.error(error);
            });
    });
    
    // Facebook Sign Up
    facebookSignupBtn.addEventListener('click', () => {
        const provider = new firebase.auth.FacebookAuthProvider();
        auth.signInWithPopup(provider)
            .then((result) => {
                const user = result.user;
                // Check if this is a new user
                return db.collection('users').doc(user.uid).get()
                    .then((doc) => {
                        if (!doc.exists) {
                            // New user, add to Firestore
                            return db.collection('users').doc(user.uid).set({
                                username: user.displayName,
                                email: user.email,
                                createdAt: new Date(),
                                photoURL: user.photoURL
                            });
                        }
                    });
            })
            .then(() => {
                showSuccess('Account created successfully!');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            })
            .catch(error => {
                showError('Facebook sign-up failed. Please try again.');
                console.error(error);
            });
    });
    
    // Helper functions
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        
        // Hide error after 5 seconds
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
    
    function showSuccess(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'custom-notification';
        notification.textContent = message;
        
        // Add styles
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = '#6a11cb';
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
        }, 1500);
    }
});