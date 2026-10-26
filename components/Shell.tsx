"use client";
import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Icon, { IconName } from "./Icon";
import Avatar from "./Avatar";
import Logo from "./Logo";

const UserCtx = createContext<User | null>(null);
export const useUser = () => useContext(UserCtx)!;

const tabs: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Clock", icon: "clock" },
  { href: "/shifts", label: "Shifts", icon: "list" },
  { href: "/jobs", label: "Jobs", icon: "briefcase" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
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

  useEffect(() => {
    if (!user) return;
    const load = () => supabase.from("profiles").select("avatar").maybeSingle().then(({ data }) => setAvatar(data?.avatar ?? null));
    load();
    window.addEventListener("profile-updated", load);
    return () => window.removeEventListener("profile-updated", load);
  }, [user]);

  if (!user) return <p className="empty">Loading…</p>;

  return (
    <UserCtx.Provider value={user}>
      <header className="top">
        <span className="brand"><Logo size={34} bg={false} /><strong>Tinx</strong></span>
        <Link href="/profile" aria-label="Your profile"><Avatar id={avatar} size={38} /></Link>
      </header>
      <main className="page">{children}</main>
      <nav className="tabs">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className={path === t.href ? "on" : ""}>
            <Icon name={t.icon} />
            <span>{t.label}</span>
          </Link>
        ))}
      </nav>
    </UserCtx.Provider>
  );
}
