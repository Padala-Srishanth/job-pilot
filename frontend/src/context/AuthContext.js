import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged
} from '../services/firebase';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);        // Full profile from Firestore
  const [firebaseUser, setFirebaseUser] = useState(null); // Firebase Auth user
  const [loading, setLoading] = useState(true);

  // Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        try {
          // Fetch full profile from backend (auto-creates if first time)
          const res = await authAPI.getMe();
          setUser(res.data.user);
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    // Profile will be fetched by onAuthStateChanged listener
    // But we also fetch immediately for faster UX
    const res = await authAPI.getMe();
    setUser(res.data.user);
    return res.data;
  };

  const register = async (name, email, password) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    // Set display name in Firebase Auth
    await updateProfile(credential.user, { displayName: name });

    // Sync name with backend (creates Firestore user doc via auth middleware)
    const res = await authAPI.sync({ name });
    setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
  };

  const updateUser = (userData) => setUser(prev => ({ ...prev, ...userData }));

  return (
    <AuthContext.Provider value={{
      user,
      firebaseUser,
      token: firebaseUser, // truthy when logged in
      loading,
      login,
      register,
      logout,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
