import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAqhhiSDrGYp-wCTxg42mmv_DKmlpw0CZs",
  authDomain: "releasedrop-943a1.firebaseapp.com",
  projectId: "releasedrop-943a1",
  storageBucket: "releasedrop-943a1.firebasestorage.app",
  messagingSenderId: "734459551759",
  appId: "1:734459551759:web:3f1cc08ba0ad867a1c437a",
  measurementId: "G-E3NXFWQLLB"
};

// Next.js hot-reload safe initialize
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };
