
// 🔧 PASTE YOUR FIREBASE WEB CONFIG:
const firebaseConfig = {
    apiKey: "AIzaSyB-IjooWEGY61uQ9tW6mAxmAxuW85aK60A",
    authDomain: "salon-db-1446e.firebaseapp.com",
    projectId: "salon-db-1446e",
    storageBucket: "salon-db-1446e.firebasestorage.app",
    messagingSenderId: "590559400739",
    appId: "1:590559400739:web:8b14515a42bd6cd4b2f296",
    measurementId: "G-WDN95G343Z"
};

// Initialize (compat SDKs, loaded in index.html)
firebase.initializeApp(firebaseConfig);

// Expose auth & db to other scripts
window.firebase = firebase;
window.firebaseAuth = firebase.auth();
window.firebaseDB = firebase.firestore();

/*
NOTE:
- Security rules + custom claims you set earlier still apply.
- The PC must sign in as the PC account before writing (renderer.js handles this on Send).
*/
