import { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  name: string;
  role: string;
  email: string;
}

interface UserContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, pass: string) => boolean;
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
      // Try to parse the stored data and check if it's a valid user object.
      const user = JSON.parse(storedUserJSON);
      return !!user && !!user.email; // A valid user must have an email.
    } catch {
      // If parsing fails or any other error, they are not authenticated.
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

  // Demo credentials
  const DEMO_EMAIL = 'admin@trackmaster.com';
  const DEMO_PASSWORD = 'password123';

  const login = (email: string, pass: string): boolean => {
    if (email === DEMO_EMAIL && pass === DEMO_PASSWORD) {
      const demoUser: User = {
        name: 'Admin User',
        role: 'Super Admin',
        email: DEMO_EMAIL,
      };
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(demoUser));
        setUser(demoUser);
        setIsAuthenticated(true);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  };

  const logout = () => {
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
      setUser(null);
      setIsAuthenticated(false);
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
    <UserContext.Provider value={{ isAuthenticated, user, login, logout, updateUser }}>
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