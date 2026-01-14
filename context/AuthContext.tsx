import { useLoader } from "@/hooks/useLoader";
import { auth } from "@/services/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { createContext, useEffect, useState } from "react";

/* ---------------- TYPES ---------------- */
interface AuthContextType {
  user: User | null;
  loading: boolean;
}

/* ---------------- CONTEXT ---------------- */
export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

/* ---------------- PROVIDER ---------------- */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { hideLoader, showLoader, isLoading } = useLoader();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    showLoader();

    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr ?? null);
      hideLoader();
    });

    // cleanup function (component unmounted)
    return () => unsubscribe(); 
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading: isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
