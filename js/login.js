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

document.addEventListener('DOMContentLoaded', () => {
    // Get form elements
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const googleLoginBtn = document.getElementById('google-login');
    const facebookLoginBtn = document.getElementById('facebook-login');
    
    // Check if user is already logged in
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in, redirect to dashboard
            window.location.href = 'dashboard.html';
        }
    });
    
    // Form submission handler
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Basic validation
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        
        if (!isValidEmail(email)) {
            showError('Please enter a valid email address');
            return;
        }
        
        if (password.length < 1) {
            showError('Please enter your password');
            return;
        }
        
        // Sign in with Firebase
        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                // Login successful
                showNotification('Login successful!');
                
                // Redirect to dashboard page after a short delay
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            })
            .catch(error => {
                // Handle errors
                let errorMsg = 'Failed to login. Please check your credentials.';
                
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    errorMsg = 'Invalid email or password. Please try again.';
                } else if (error.code === 'auth/too-many-requests') {
                    errorMsg = 'Too many failed login attempts. Please try again later.';
                }
                
                showError(errorMsg);
            });
    });
    
    // Forgot password handler
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        
        if (!email || !isValidEmail(email)) {
            showError('Please enter your email address first');
            return;
        }
        
        auth.sendPasswordResetEmail(email)
            .then(() => {
                showNotification('Password reset email sent. Please check your inbox.');
            })
            .catch(error => {
                let errorMsg = 'Failed to send password reset email.';
                
                if (error.code === 'auth/user-not-found') {
                    errorMsg = 'No account found with this email address.';
                }
                
                showError(errorMsg);
            });
    });
    
    // Google Sign In
    googleLoginBtn.addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .then(() => {
                showNotification('Login successful!');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            })
            .catch(error => {
                showError('Google sign-in failed. Please try again.');
                console.error(error);
            });
    });
    
    // Facebook Sign In
    facebookLoginBtn.addEventListener('click', () => {
        const provider = new firebase.auth.FacebookAuthProvider();
        auth.signInWithPopup(provider)
            .then(() => {
                showNotification('Login successful!');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            })
            .catch(error => {
                showError('Facebook sign-in failed. Please try again.');
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
    
    // Function to show custom notification
    function showNotification(message) {
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
        }, 1300);
    }
});