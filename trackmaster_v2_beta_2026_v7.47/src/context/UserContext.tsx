import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface User {
  custId: number;
  name: string;
  role: string;
  userName: string;
  isStaffMember: boolean;
}
interface LoginResponse {
  message: string;
  data?: User;
}
interface UserContextType {
  isAuthenticated: boolean;
  isStaffMember: boolean;
  user: User | null;
  login: (email: string, pass: string, type: string) => Promise<LoginResponse>;
  logout: () => void;
  updateUser: (newUserData: Partial<User>) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'trackmaster-auth';

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const storedUserJSON = localStorage.getItem(USER_STORAGE_KEY);
      if (!storedUserJSON) {
        return false; // No key, not authenticated.
      }
      else{
        return true; // A valid user must have an email.
      }
    } catch {
      // If parsing fails or any other error, they are not authenticated.
      return false;
    }
  });
const [isStaffMember, setIsStaffMember] = useState<boolean>(() => {
    try {
      const storedUserJSON = localStorage.getItem(USER_STORAGE_KEY);
      return storedUserJSON ? JSON.parse(storedUserJSON).isStaffMember === true : false;
    } catch {
      return false;
    }
  });
  const [user, setUser] = useState<User | null>(() => {
    try {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });

  const login = async (email: string, pass: string, type: string): Promise<LoginResponse> => {
    try {
      const url = `https://localhost:7182/api/Account/login?userId=${encodeURIComponent(email)}&password=${encodeURIComponent(pass)}&type=${type}`;

      const res = await fetch(url, { method: "GET" });

      const response = await res.json();

      if (!res.ok) {
        return { message: response.message || "Login failed" };
      }
      const data = response.data;
      const loggedInUser: User = {
        custId: data.custId,
        name: data.custName,
        role: data.role,
        userName: data.userName,
        isStaffMember: data.isStaffMember
      };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedInUser));
      setUser(loggedInUser);
      setIsAuthenticated(true);
      setIsStaffMember(loggedInUser.isStaffMember);

      return {
        message: response.message,
        data: loggedInUser,
      };
    } catch (error) {
      console.error("Login failed", error);
      return { message: "Something went wrong" };
    }
  };
  const logout = () => {
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
      setUser(null);
      setIsAuthenticated(false);
      setIsStaffMember(false);
    } catch (error) {
      console.error("Failed to logout", error);
    }
  };

  const updateUser = (newUserData: Partial<User>) => {
    setUser(currentUser => {
      if (!currentUser) return null;
      const updatedUser = { ...currentUser, ...newUserData };
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      } catch (error) {
        console.error("Failed to update user in localStorage", error);
      }
      return updatedUser;
    });
  };

  return (
    <UserContext.Provider value={{ isAuthenticated, isStaffMember, user, login, logout, updateUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};