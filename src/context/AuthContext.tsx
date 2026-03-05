import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth, db } from "../../firebase"; // make sure db is exported
import { doc, getDoc } from "firebase/firestore";

interface AppUser {
  uid: string;
  email: string | null;
  grade: string;
  section: string;
  role: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userDocRef);

          const userData = userSnap.exists()
            ? userSnap.data()
            : { grade: "", section: "" };

          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            grade: userData.grade || "",
            section: userData.section || "",
            role: userData.role || "",
          });
        } catch (err) {
          console.error("Failed to fetch user data:", err);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            grade: "",
            section: "",
            role: "",
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};