/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserProfile, BankDetails } from '../types';
import { repo } from '../data';

interface AuthContextType {
  currentUser: UserProfile | null;
  allUsers: UserProfile[];
  isLoading: boolean;
  isMock: boolean;
  switchUser: (userId: string) => Promise<void>;
  signInWithGoogleSchool: (schoolEmail: string, fullName: string) => Promise<void>;
  signInWithEmailPassword: (email: string) => Promise<void>;
  signUp: (data: Partial<UserProfile>) => Promise<void>;
  signOut: () => Promise<void>;
  verifyEmailCode: (code: string) => Promise<boolean>;
  applyForSeller: (bankDetails: BankDetails) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [u, users] = await Promise.all([repo.getCurrentUser(), repo.getUsers()]);
      setCurrentUser(u);
      setAllUsers(users);
    } catch (e) {
      console.error('Error loading auth data', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // BUG-1: keep open tabs in sync. A logout in another tab changes the
  // persisted session key, so reload auth state here instead of staying
  // signed in with a stale user.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.endsWith('current_user_id')) {
        loadData();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [loadData]);

  const switchUser = async (userId: string) => {
    const user = await repo.switchUser(userId);
    if (user) {
      setCurrentUser(user);
    }
  };

  const signInWithGoogleSchool = async (schoolEmail: string, fullName: string) => {
    const user = await repo.signInWithGoogleSchool(schoolEmail, fullName);
    setCurrentUser(user);
    await loadData();
  };

  const signInWithEmailPassword = async (email: string) => {
    const user = await repo.signInWithEmailPassword(email);
    setCurrentUser(user);
    await loadData();
  };

  const signUp = async (data: Partial<UserProfile>) => {
    const user = await repo.signUp(data);
    setCurrentUser(user);
    await loadData();
  };

  const signOut = async () => {
    await repo.signOut();
    setCurrentUser(null);
  };

  const verifyEmailCode = async (code: string): Promise<boolean> => {
    if (!currentUser) return false;
    const ok = await repo.verifyEmailCode(currentUser.id, code);
    if (ok) {
      await loadData();
    }
    return ok;
  };

  const applyForSeller = async (bankDetails: BankDetails) => {
    if (!currentUser) return;
    await repo.applyForSeller(currentUser.id, bankDetails);
    await loadData();
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated = await repo.updateUserProfile(currentUser.id, updates);
    setCurrentUser(updated);
    await loadData();
  };

  const refreshUser = async () => {
    await loadData();
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        allUsers,
        isLoading,
        isMock: repo.isMock,
        switchUser,
        signInWithGoogleSchool,
        signInWithEmailPassword,
        signUp,
        signOut,
        verifyEmailCode,
        applyForSeller,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
