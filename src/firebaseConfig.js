// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDN_-B6F93K5738nNtZAI2UsVFU09cl6ys",
    authDomain: "cognexis-10dcb.firebaseapp.com",
    projectId: "cognexis-10dcb",
    storageBucket: "cognexis-10dcb.firebasestorage.app",
    messagingSenderId: "236800737765",
    appId: "1:236800737765:web:8478b0e8be7201461d6f0c",
    measurementId: "G-X8Q6CZJJK7"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
