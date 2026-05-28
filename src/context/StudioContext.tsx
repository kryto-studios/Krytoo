"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

type StudioSettings = {
  name: string;
  bio: string;
  profile_pic_url: string | null;
};

type StudioContextType = {
  settings: StudioSettings;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  logout: () => Promise<void>;
};

const defaultSettings = {
  name: "Kryto Studio",
  bio: "Elevating Digital Experiences",
  profile_pic_url: null,
};

const StudioContext = createContext<StudioContextType | undefined>(undefined);

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<StudioSettings>(defaultSettings);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("studio_settings")
        .select("*")
        .eq("id", 1)
        .single();

      if (!error && data) {
        setSettings({
          name: data.name,
          bio: data.bio,
          profile_pic_url: data.profile_pic_url,
        });
      }
    } catch (err) {
      console.error("Failed to fetch studio settings:", err);
    }
  };

  const fetchUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUser = session?.user || null;
    setUser(currentUser);
    setIsAdmin(!!currentUser?.email && ["gamermirchi08@gmail.com", "krytostudio@gmail.com"].includes(currentUser.email));
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchSettings(), fetchUser()]);
      setLoading(false);
    };
    init();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      setIsAdmin(!!currentUser?.email && ["gamermirchi08@gmail.com", "krytostudio@gmail.com"].includes(currentUser.email));
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <StudioContext.Provider
      value={{
        settings,
        user,
        isAdmin,
        loading,
        refreshSettings: fetchSettings,
        logout,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
}

export function useStudio() {
  const context = useContext(StudioContext);
  if (context === undefined) {
    throw new Error("useStudio must be used within a StudioProvider");
  }
  return context;
}
