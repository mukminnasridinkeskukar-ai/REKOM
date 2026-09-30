import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware sesi Supabase.
 * Menyegarkan access token yang kedaluwarsa pada setiap permintaan dan
 * mempersist kembali cookie sesinya. Tanpa middleware ini, sesi pengguna
 * mati setelah access token berakhir (±1 jam) meskipun refresh token
 * masih sah — gejalanya: 401 tiba-tiba di halaman yang semula normal.
 *
 * Pada Mode Demo (env Supabase kosong) middleware langsung lewat.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return response;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() memicu refresh token bila access token sudah kedaluwarsa
  try {
    await supabase.auth.getUser();
  } catch {
    // jaringan/auth gagal — biarkan halaman yang menilai sesi (redirect ke /login)
  }

  return response;
}

export const config = {
  matcher: [
    // jalankan di semua rute kecuali aset statis
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
