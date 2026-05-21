import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  profile: any | null;
  authError: any | null;
  clearAuthError: () => void;
  retryAnonymousSignIn: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  profile: null,
  authError: null,
  clearAuthError: () => {},
  retryAnonymousSignIn: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initSession = async () => {
      // Get or create unique ID for this browser
      let uid = localStorage.getItem('track_uid');
      if (!uid) {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let rand = '';
        for (let i = 0; i < 20; i++) {
          rand += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        uid = 'guest_' + rand;
        localStorage.setItem('track_uid', uid);
      }

      const mockUser = {
        uid,
        email: 'guest@trackwithasad.local',
        displayName: 'Guest User',
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`
      };

      setUser(mockUser);

      // Create fallback profile locally
      const defaultProfile = {
        uid,
        email: 'guest@trackwithasad.local',
        displayName: 'Guest User',
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
        currency: 'Rs',
        theme: 'dark',
        createdAt: new Date().toISOString()
      };

      try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        
        let currentProfile;
        if (!userSnap.exists()) {
          currentProfile = { ...defaultProfile };
          await setDoc(userRef, currentProfile);
        } else {
          currentProfile = userSnap.data();
        }
        
        setProfile(currentProfile);
        localStorage.setItem('track_profile', JSON.stringify(currentProfile));
      } catch (err) {
        console.warn("Database connection issue or missing rules. Falling back to offline local profile:", err);
        // Fallback to local profile from localStorage or default
        const localProf = localStorage.getItem('track_profile');
        if (localProf) {
          try {
            setProfile(JSON.parse(localProf));
          } catch {
            setProfile(defaultProfile);
          }
        } else {
          setProfile(defaultProfile);
          localStorage.setItem('track_profile', JSON.stringify(defaultProfile));
        }
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, []);

  const value = {
    user,
    loading,
    profile,
    authError: null,
    clearAuthError: () => {},
    retryAnonymousSignIn: async () => {}
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

