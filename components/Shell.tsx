"use client";
import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const UserCtx = createContext<User | null>(null);
export const useUser = () => useContext(UserCtx)!;

const tabs = [
  { href: "/", label: "Clock" },
  { href: "/shifts", label: "Shifts" },
  { href: "/jobs", label: "Jobs" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!user) return <p className="empty">Loading…</p>;

  return (
    <UserCtx.Provider value={user}>
      <header className="top">
        <strong className="brand">Tinx Clock</strong>
        <button className="link" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </header>
      <main className="page">{children}</main>
      <nav className="tabs">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className={path === t.href ? "on" : ""}>{t.label}</Link>
        ))}
      </nav>
    </UserCtx.Provider>
  );
}
