import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";




const firebaseConfig = {
  apiKey: "AIzaSyBnk7Ea8s5i2IFSk2Hjm9Ngo_Y-eMhEnGM",
  authDomain: "aplico-e65fc.firebaseapp.com",
  projectId: "aplico-e65fc",
  storageBucket: "aplico-e65fc.firebasestorage.app",
  messagingSenderId: "244643362919",
  appId: "1:244643362919:web:64730d37fb8007837a3cc2",
  measurementId: "G-QVV7KC247Q"
};

// Initialize Firebase





const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();