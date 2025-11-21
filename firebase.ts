import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyCC7W3VUkICczllPFeFHIn-WW8JbD4P_-4",
    authDomain: "votely-afd46.firebaseapp.com",
    projectId: "votely-afd46",
    storageBucket: "votely-afd46.firebasestorage.app",
    messagingSenderId: "592455480758",
    appId: "1:592455480758:web:4801a97ef0320992bdbd17",
    measurementId: "G-K8MENSX6C1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);
