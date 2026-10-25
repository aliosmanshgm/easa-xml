// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBRyNiaXVTdMj4ZMm4BPvbVrpbFViXf3jM",
  authDomain: "easa-xml.firebaseapp.com",
  projectId: "easa-xml",
  storageBucket: "easa-xml.firebasestorage.app",
  messagingSenderId: "994587986623",
  appId: "1:994587986623:web:bf9c961fd64f5cc5c1d40a",
  measurementId: "G-4E0T450BLD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);