"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/config";
import type { MeDTO, NotificationDTO } from "@/lib/types";
import { ROLE_LABEL } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Activity, Bell, ClipboardList, FilePlus2, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, UserRound, UsersRound, CheckCheck, FileSearch } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pengajuan/baru", label: "Pengajuan Baru", icon: FilePlus2 },
];

const NAV_ADMIN = [
  { href: "/admin/jenis", label: "Jenis Rekomendasi", icon: Settings },
  { href: "/admin/pengguna", label: "Kelola Pengguna", icon: UsersRound },
];

function initial(nama: string) {
  return nama
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
}

export function NotificationBell({ user }: { user: MeDTO }) {
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      setItems(json.data ?? []);
    } catch {
      /* abaikan */
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    // Mode Supabase: realtime postgres_changes. Mode Demo: polling.
    let channel: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        const ch = supabase
          .channel(`notifikasi-${user.id}`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
            () => load()
          )
          .subscribe();
        channel = ch as unknown as { unsubscribe: () => void };
      }
    } else {
      timerRef.current = setInterval(load, 8000);
    }
    return () => {
      clearTimeout(t);
      channel?.unsubscribe();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [load, user.id]);

  const unread = items.filter((n) => !n.isRead).length;

  const tandaiDibaca = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: unread ? items.filter((n) => !n.isRead).map((n) => n.id) : [] }),
    });
    load();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full" aria-label="Notifikasi">
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-w-[calc(100vw-2rem)]">
        <div className="flex items-center justify-between px-2 py-1.5">
          <p className="text-sm font-semibold">Notifikasi</p>
          {unread > 0 && (
            <button
              onClick={tandaiDibaca}
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-brand hover:underline"
            >
              <CheckCheck className="size-3.5" /> Tandai dibaca
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="thin-scroll max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Belum ada notifikasi.</p>
          ) : (
            items.map((n) => (
              <Link
                key={n.id}
                href={n.pengajuanId ? `/dashboard?buka=${n.pengajuanId}` : "#"}
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded-md px-3 py-2.5 transition-colors hover:bg-accent",
                  !n.isRead && "bg-brand-50/60"
                )}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      n.isRead ? "bg-slate-300" : "bg-gold"
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium leading-snug">{n.judul}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{n.pesan}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground/70">
                      {new Date(n.createdAt).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ user, children }: { user: MeDTO; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdmin = user.role === "super_admin";

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const navLinks = (
    <>
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
            pathname === n.href || pathname.startsWith(n.href + "/")
              ? "bg-brand text-white"
              : "text-slate-600 hover:bg-brand-50 hover:text-brand"
          )}
        >
          <n.icon className="size-4" />
          {n.label}
        </Link>
      ))}
      {isAdmin &&
        NAV_ADMIN.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              pathname === n.href
                ? "bg-teal-brand text-white"
                : "text-slate-600 hover:bg-teal-50-brand hover:text-teal-brand"
            )}
          >
            <n.icon className="size-4" />
            {n.label}
          </Link>
        ))}
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
              <Activity className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-extrabold tracking-tight text-brand">E-REKOM</span>
              <span className="hidden text-[10px] font-medium text-slate-500 sm:block">
                Dinkes Kutai Kartanegara
              </span>
            </span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 lg:flex">{navLinks}</nav>

          <div className="ml-auto flex items-center gap-1.5">
            <Link
              href="/verifikasi"
              className="hidden items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-teal-brand hover:text-teal-brand md:inline-flex"
            >
              <FileSearch className="size-3.5" />
              Cek Keaslian Surat
            </Link>
            <NotificationBell user={user} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-slate-100">
                  <Avatar className="size-8 ring-2 ring-white">
                    {user.fotoUrl && <AvatarImage src={user.fotoUrl} alt={user.namaLengkap} />}
                    <AvatarFallback className="bg-teal-brand text-xs font-bold text-white">
                      {initial(user.namaLengkap)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-left leading-tight sm:block">
                    <span className="block max-w-36 truncate text-xs font-semibold">{user.namaLengkap}</span>
                    <span className="block text-[10px] text-muted-foreground">{ROLE_LABEL[user.role]}</span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  <p className="text-sm font-semibold">{user.namaLengkap}</p>
                  <p className="text-xs font-normal text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profil" className="cursor-pointer">
                    <UserRound className="size-4" /> Profil Saya
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer">
                    <ClipboardList className="size-4" /> Pengajuan Saya
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600 focus:text-red-600">
                  <LogOut className="size-4" /> Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetTitle className="flex items-center gap-2 text-brand">
                  <ShieldCheck className="size-5" /> Menu E-REKOM
                </SheetTitle>
                <nav className="mt-4 flex flex-col gap-1" onClick={() => setMenuOpen(false)}>
                  {navLinks}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>

      <footer className="border-t border-slate-200 bg-white py-4">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-muted-foreground sm:px-6">
          E-REKOM — Dinas Kesehatan Kabupaten Kutai Kartanegara · Jalan Cut Nyak Dien No.33 Tenggarong 75512
        </div>
      </footer>
    </div>
  );
}
