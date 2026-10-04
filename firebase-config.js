// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBSLlgadTKXY7DwWpFZHaoch4EzIuFB0hk",
  authDomain: "my-diary-app-c2c95.firebaseapp.com",
  databaseURL: "https://my-diary-app-c2c95-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "my-diary-app-c2c95",
  storageBucket: "my-diary-app-c2c95.firebasestorage.app",
  messagingSenderId: "43514866402",
  appId: "1:43514866402:web:8d1c2b71280375e7e94cbb",
  measurementId: "G-BF9LQ9HTVR"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);