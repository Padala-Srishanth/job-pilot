import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCXT8wxOwLYtPEgEboYYOkFfcwGHnvIGHc",
  authDomain: "pilot-5b2b1.firebaseapp.com",
  projectId: "pilot-5b2b1",
  storageBucket: "pilot-5b2b1.firebasestorage.app",
  messagingSenderId: "361301268915",
  appId: "1:361301268915:web:95a448b557b4c8c94b13c6",
  measurementId: "G-04YX0CLR48"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged
};

export default app;
