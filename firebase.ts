// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCcSNJYefPa5LCjAIl-WPonTK7P9PPqF14",
  authDomain: "logging-system-64155.firebaseapp.com",
  projectId: "logging-system-64155",
  storageBucket: "logging-system-64155.firebasestorage.app",
  messagingSenderId: "940176049475",
  appId: "1:940176049475:web:63bd23ad4c632268da9bf6",
  measurementId: "G-Z4HF3650KZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
const analytics = getAnalytics(app);