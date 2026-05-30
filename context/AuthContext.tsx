"use client";

import {
  createContext, useCallback, useContext,
  useEffect, useRef, useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile, UserIntent } from "@/types/auth.types";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, intent: UserIntent) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Omit<Profile, "id" | "created_at">>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (isMounted.current) setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted.current) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) await fetchProfile(session.user.id);
      if (isMounted.current) setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted.current) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) fetchProfile(session.user.id);
        else setProfile(null);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    username: string,
    intent: UserIntent,
  ) => {
    // Pass username + intent as user metadata so the DB trigger can populate
    // the profiles row automatically (trigger runs as service role, bypassing RLS).
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: username.trim(), intent } },
    });
    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const updateProfile = useCallback(async (
    updates: Partial<Omit<Profile, "id" | "created_at">>
  ) => {
    if (!user) throw new Error("Not signed in");

    // Try update first (profile row should exist from the DB trigger on sign-up)
    const { error, data: updated } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select("id");

    // No row found — trigger wasn't set up yet, create it now
    if (!error && (!updated || updated.length === 0)) {
      const { error: insertError } = await supabase
        .from("profiles")
        .insert({ id: user.id, ...updates });
      if (insertError) throw new Error(insertError.message);
    } else if (error) {
      throw new Error(error.message);
    }

    if (isMounted.current) {
      setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user, session, profile, isLoading,
      signIn, signUp, signOut, updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
