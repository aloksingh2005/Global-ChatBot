document.addEventListener('DOMContentLoaded', () => {
    // Get form elements
    const signupForm = document.getElementById('signup-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginLink = document.getElementById('login-link');

    // Form submission handler
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Basic validation
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!isValidEmail(email)) {
            showAlert('Please enter a valid email address');
            return;
        }

        if (password.length < 6) {
            showAlert('Password must be at least 6 characters long');
            return;
        }

        // If validation passes, show success message
        // In a real app, you would send the data to a server here
        showSuccess('Account created successfully!');

        // Redirect to dashboard page after successful signup
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    });

    // Login link handler
    loginLink.addEventListener('click', (e) => {
        // Navigation is now handled by the href attribute in the HTML
        // No need to prevent default or add custom code here
        // This is just for additional functionality if needed
    });

    // Helper functions
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function showAlert(message) {
        alert(message);
    }

    function showSuccess(message) {
        alert(message);
        // In a real app, you might redirect the user or show a success screen
    }
});

// Redirect to login page after a short delay
setTimeout(function () {
    window.location.href = 'login.html';
}, 1500);