// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAgY2WQW00zlDVTAp9YVPbxFy_lU04iqTA",
  authDomain: "ai-chatbot-a0107.firebaseapp.com",
  databaseURL: "https://ai-chatbot-a0107-default-rtdb.firebaseio.com",
  projectId: "ai-chatbot-a0107",
  storageBucket: "ai-chatbot-a0107.firebasestorage.app",
  messagingSenderId: "921898897940",
  appId: "1:921898897940:web:5b6f59a47d9b46d7308d01",
  measurementId: "G-J67DFPCXJC",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Auth references
const auth = firebase.auth();
const db = firebase.firestore();
const realtimeDb = firebase.database();

// Export the auth and db references
export { auth, db, realtimeDb };
