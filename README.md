# Global Chat App

A modern mobile-friendly chat application with beautiful UI and user authentication.

## Features

- Modern gradient UI design
- User registration and login system
- Responsive design that works on all devices
- Form validation for security
- Real-time status bar simulation

## Setup Instructions

1. Clone this repository or download the files to your computer.
2. Open the folder in your code editor.
3. No special dependencies are required as this is a pure HTML/CSS/JS project.
4. Configure Firebase in `js/firebase-config.js` and replace `REPLACE_WITH_NEW_RESTRICTED_API_KEY` with your rotated API key.

## Security Note (Important)

- If an API key was leaked publicly, rotate it immediately in Google Cloud Console.
- Restrict key usage by API (allow only required Firebase APIs) and HTTP referrers (your domains only).
- Keep Firebase Security Rules strict; never rely on API key secrecy for database protection.
- This repository now uses centralized config in `js/firebase-config.js` to avoid hardcoded keys inside multiple scripts.

## Running the App

You can run this app in multiple ways:

### Option 1: Open the HTML file directly

Simply double-click the `index.html` file to open it in your default browser.

### Option 2: Use a local server

For the best experience, use a local development server:

- If you have Node.js installed, you can use a simple server like `http-server`:
  ```
  npm install -g http-server
  http-server
  ```
  Then visit `http://localhost:8080` in your browser.

- If you have Python installed, you can use its built-in server:
  ```
  # Python 3
  python -m http.server
  ```
  Then visit `http://localhost:8000` in your browser.

## Structure

- `index.html` - Main HTML structure
- `styles.css` - All styling and animations
- `script.js` - Form validation and interactive features

## Customization

You can easily customize this app by:

- Changing the gradient colors in `styles.css`
- Adding more form fields to the registration page
- Creating additional pages like profile, settings, etc.

## Advanced Features (Future Development)

- Add social login options
- Implement a real backend for user authentication
- Add password recovery functionality
- Add remember me feature
- Add dark/light mode toggle

## Free Real-Time Messaging Ideas

If you want real-time chat with zero or low cost, these are practical options:

- Firebase Realtime Database (Spark free tier) - easiest for web chat and presence.
- Supabase Realtime (free tier) - Postgres + realtime subscriptions.
- Appwrite Realtime (self-hosted or cloud free tier) - good open-source option.
- Socket.IO on Render/Railway free plan - full custom server control.

## Implemented in this project

This project now uses a more reliable Firebase Realtime Database flow:

- Backward-compatible message schema (`text/message`, `sender/displayName`) so old and new messages both render.
- Room-scoped typing channels (`typing/global` and `typing/rooms/{roomId}`) so typing status does not leak across rooms.
- Stable message rendering for existing data while keeping the current UI and auth flow unchanged.