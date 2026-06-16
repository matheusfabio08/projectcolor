import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      let sessionToken = localStorage.getItem("sessionToken");

      if (!sessionToken || sessionToken === "undefined" || sessionToken === "null") {
        localStorage.removeItem("sessionToken");
        sessionToken = null;
      }

      // ✅ URL relativa — usa o proxy do Vite, garante que o cookie seja enviado corretamente
      const response = await fetch("/api/auth/me", {
        credentials: "include",
        headers: sessionToken ? { "X-Session-Token": sessionToken } : {},
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else {
        localStorage.removeItem("sessionToken");
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    // ✅ URL relativa
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Falha no login");
    }

    const data = await response.json();

    if (
      data.sessionToken &&
      data.sessionToken !== "undefined" &&
      data.sessionToken !== "null"
    ) {
      localStorage.setItem("sessionToken", String(data.sessionToken));
    } else {
      localStorage.removeItem("sessionToken");
    }

    setUser(data.user);
  };

  const logout = async () => {
    // ✅ URL relativa
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    localStorage.removeItem("sessionToken");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
