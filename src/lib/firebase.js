import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyBGq1_-21MNq6yxYGp3HeJFbJLi6gasSIU",
    authDomain: "gullycricket-app.firebaseapp.com",
    projectId: "gullycricket-app",
    storageBucket: "gullycricket-app.firebasestorage.app",
    messagingSenderId: "81772346242",
    appId: "1:81772346242:web:cdfcbf3182afd695bdad9b",
    measurementId: "G-DVT8VYVX2Z"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
