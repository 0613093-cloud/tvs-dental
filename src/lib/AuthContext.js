import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function register(email, password, profileData) {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', userCred.user.uid), {
      ...profileData,
      email,
      role: 'client',
      status: 'pending',
      createdAt: serverTimestamp()
    });
    return userCred;
  }

  async function login(email, password) {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const profileDoc = await getDoc(doc(db, 'users', userCred.user.uid));
    if (profileDoc.exists()) {
      const profile = profileDoc.data();
      if (profile.status === 'pending') {
        await signOut(auth);
        throw new Error('PENDING_APPROVAL');
      }
      if (profile.status === 'rejected') {
        await signOut(auth);
        throw new Error('ACCOUNT_REJECTED');
      }
    }
    return userCred;
  }

  function logout() {
    return signOut(auth);
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const profileDoc = await getDoc(doc(db, 'users', user.uid));
        if (profileDoc.exists()) {
          setUserProfile(profileDoc.data());
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    register,
    login,
    logout,
    resetPassword,
    isAdmin: userProfile?.role === 'admin',
    isClient: userProfile?.role === 'client',
    isApproved: userProfile?.status === 'approved'
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
