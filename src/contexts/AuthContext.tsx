import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import API from "@/services/api";

export interface User {
  id: string;
  name: string;
  email: string;
  allergies: string[];
}

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On first load, if a token exists, fetch the user
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        // Your backend mounts user routes at /api/auth in index.js
        // Use a "who am I" endpoint; based on your setup we’ll call /auth/protected
        const res = await API.get("/auth/protected");
        // Expecting: { id, name, email, allergies? }
        const user: User = {
          id: res.data.id ?? res.data.user?.id ?? "",
          name: res.data.name ?? res.data.user?.name ?? "",
          email: res.data.email ?? res.data.user?.email ?? "",
          allergies: res.data.allergies ?? res.data.user?.allergies ?? [],
        };
        setCurrentUser(user);
      } catch {
        // bad/expired token
        localStorage.removeItem("token");
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await API.post("/auth/login", { email, password }, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res || !res.data) throw new Error("Invalid response");

    // Expecting: { token, user: { id, name, email } }
    const { token, user } = res.data;
    if (!token || !user) throw new Error(res.data.message || "Login failed");

    localStorage.setItem("token", token);

    const normalized: User = {
      id: user.id,
      name: user.name,
      email: user.email,
      allergies: user.allergies ?? [],
    };

    setCurrentUser(normalized);
    return normalized;
  };

  const register = async (name: string, email: string, password: string): Promise<User> => {
    const res = await API.post("/auth/register", { name, email, password }, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res || !res.data) throw new Error("Invalid response");

    // Expecting: { token, user: { id, name, email } }
    const { token, user } = res.data;
    if (!token || !user) throw new Error(res.data.message || "Registration failed");

    localStorage.setItem("token", token);

    const normalized: User = {
      id: user.id,
      name: user.name,
      email: user.email,
      allergies: user.allergies ?? [],
    };

    setCurrentUser(normalized);
    return normalized;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setCurrentUser(null);
  };

  /**
   * Update profile data (e.g., allergies).
   * If you add a backend route later (e.g., PATCH /api/auth/me), this will sync.
   * For now it will optimistically update UI and try the API if available.
   */
  const updateUser = async (userData: Partial<User>): Promise<User> => {
    if (!currentUser) throw new Error("No user is logged in");

    // Optimistic update
    const merged: User = { ...currentUser, ...userData };
    setCurrentUser(merged);

    try {
      // If you implement this on backend:
      // router.patch("/me", authMiddleware, async (req,res) => { ... })
      const res = await API.patch("/auth/me", userData, {
        headers: { "Content-Type": "application/json" },
      });

      if (res && res.data && (res.data.user || res.data.name)) {
        const apiUser = res.data.user ?? res.data;
        const normalized: User = {
          id: apiUser.id ?? merged.id,
          name: apiUser.name ?? merged.name,
          email: apiUser.email ?? merged.email,
          allergies: apiUser.allergies ?? merged.allergies ?? [],
        };
        setCurrentUser(normalized);
        return normalized;
      }
    } catch {
      // If endpoint doesn’t exist yet, keep optimistic state
    }

    return merged;
  };

  const value: AuthContextType = {
    currentUser,
    isAuthenticated: !!currentUser,
    login,
    register,
    logout,
    updateUser,
  };

  if (isLoading) return null; // keep your UI unchanged

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export default AuthContext;