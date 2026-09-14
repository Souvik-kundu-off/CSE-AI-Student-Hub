import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { toast } from "sonner";
import { isEmailAllowedForRegistration, ALLOWED_UNIVERSITY_DOMAIN } from "@/lib/auth-policy";

export interface Profile {
  id?: string;
  full_name: string;
  avatar_url: string;
  email?: string;
  role: string;
  student_code?: string;
  programme_name?: string;
  phone_number?: string;
  github_url?: string;
  linkedin_url?: string;
  points?: number;
  projects_count?: number;
  wins_count?: number;
}

interface AuthContextType {
  user: FirebaseUser | null;
  session: { user: { id: string; email: string | null } } | null;
  profile: Profile | null;
  role: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string, currentUserEmail?: string | null) => {
    try {
      console.log(`Auth (Firebase): Fetching profile for ${uid}...`);
      const docRef = doc(db, "profiles", uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as Profile;
        console.log("Auth: Existing profile loaded successfully from Firestore", data.role);
        setProfile({ id: uid, ...data });
      } else {
        // No existing profile document in Firestore -> NEW sign-up attempt!
        console.warn("Auth: No profile doc found in Firestore for user:", currentUserEmail);
        if (!isEmailAllowedForRegistration(currentUserEmail)) {
          console.error(`Auth: Blocking new sign-up attempt from unauthorized email: ${currentUserEmail}`);
          toast.error(
            `Registration Restricted: Only official @${ALLOWED_UNIVERSITY_DOMAIN} emails can sign up.`,
            { duration: 6000 }
          );
          await firebaseSignOut(auth);
          setUser(null);
          setProfile(null);
          return;
        }
        setProfile(null);
      }
    } catch (error) {
      console.error("Auth: Unexpected error fetching profile from Firestore:", error);
      setProfile(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth (Firebase): State changed for user:", currentUser?.uid ?? "null");
      if (currentUser) {
        if (!(currentUser as any).id) {
          Object.defineProperty(currentUser, "id", {
            get() { return this.uid; },
            configurable: true,
          });
        }
        setUser(currentUser);
        setLoading(true);
        await fetchProfile(currentUser.uid, currentUser.email);
        setLoading(false);
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid, user.email);
    }
  };

  const session = user ? { user: { id: user.uid, email: user.email } } : null;

  const value = {
    user,
    session,
    profile,
    role: profile?.role ?? null,
    loading,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
