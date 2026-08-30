"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { api, type UserDetail } from "@/lib/api";

interface AuthContextType {
  user: UserDetail | null;
  token: string | null;
  wajibGantiPassword: boolean;
  login: (nis: string, password: string) => Promise<void>;
  passwordChanged: () => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  wajibGantiPassword: false,
  login: async () => {},
  passwordChanged: () => {},
  logout: () => {},
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [wajibGantiPassword, setWajibGantiPassword] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("canopy_token");
    const storedUser = localStorage.getItem("canopy_user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setWajibGantiPassword(localStorage.getItem("canopy_wajib_ganti_password") === "true");
    }
    setLoading(false);
  }, []);

  const login = async (nis: string, password: string) => {
    const res = await api.login(nis, password);
    localStorage.setItem("canopy_token", res.token);
    localStorage.setItem("canopy_user", JSON.stringify(res.user));
    localStorage.setItem("canopy_wajib_ganti_password", String(res.wajib_ganti_password));
    setToken(res.token);
    setUser(res.user);
    setWajibGantiPassword(res.wajib_ganti_password);
  };

  const passwordChanged = () => {
    localStorage.setItem("canopy_wajib_ganti_password", "false");
    setWajibGantiPassword(false);
  };

  const logout = () => {
    localStorage.removeItem("canopy_token");
    localStorage.removeItem("canopy_user");
    localStorage.removeItem("canopy_wajib_ganti_password");
    setToken(null);
    setUser(null);
    setWajibGantiPassword(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, wajibGantiPassword, login, passwordChanged, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
