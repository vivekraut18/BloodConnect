'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface UserProfileData {
  id: string;
  name: string;
  email: string;
  role: string;
  city: string;
  phone: string;
  verificationStatus: string;
  bloodGroup: string;
  availabilityStatus: string;
  donationsCompleted: number;
  reliabilityScore: number;
  lastDonationDate: string | null;
}

interface ProfileContextType {
  profile: UserProfileData | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfileState: (updated: Partial<UserProfileData>) => void;
}

const ProfileContext = createContext<ProfileContextType>({
  profile: null,
  isLoading: true,
  refreshProfile: async () => {},
  updateProfileState: () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const result = await res.json();
        if (result?.data) {
          setProfile(result.data);
        }
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfileState = useCallback((updated: Partial<UserProfileData>) => {
    setProfile((prev) => (prev ? { ...prev, ...updated } : (updated as UserProfileData)));
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  return (
    <ProfileContext.Provider value={{ profile, isLoading, refreshProfile, updateProfileState }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
