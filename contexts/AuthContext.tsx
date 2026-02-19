
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { STORAGE_KEYS } from '../constants';
import { useData } from './DataContext';

interface AuthContextType {
  currentUser: User | null;
  login: (userId: string) => void;
  logout: () => void;
  isManager: boolean; 
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { users } = useData();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for persisted user session
    const storedId = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    if (storedId) {
        const foundUser = users.find(u => u.id === storedId);
        if (foundUser) {
            setCurrentUserId(foundUser.id);
        } else {
            // Invalid ID in storage
            localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
        }
    }
    setIsLoading(false);
  }, [users]);

  const login = (userId: string) => {
    setCurrentUserId(userId);
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, userId);
  };

  const logout = () => {
    setCurrentUserId(null);
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  };

  const currentUser = users.find(u => u.id === currentUserId) || null;
  
  // Strict Manager Check: Only ADMIN or legacy MANAGER role.
  // Clients are NOT managers in the new system, they are customers.
  const isManager = currentUser?.role === Role.ADMIN || currentUser?.role === Role.MANAGER; 

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, isManager, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
