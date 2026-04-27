import React, { useEffect, useMemo, useState, useContext } from "react";
import { onAuthStateChanged, signOut as fbSignOut } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth } from "../firebase";
import { db } from "../firebase";

const AuthContext = React.createContext();
export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);

      // Keep a lightweight user profile for chat member lookups
      if (user) {
        setDoc(
          doc(db, "users", user.uid),
          {
            uid: user.uid,
            email: user.email ?? "",
            displayName: user.displayName ?? "",
            photoURL: user.photoURL ?? "",
            lastLoginAt: serverTimestamp(),
          },
          { merge: true }
        ).catch(() => {
          // non-blocking
        });
      }
    });
    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      signOut: () => fbSignOut(auth),
    }),
    [user, loading]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
