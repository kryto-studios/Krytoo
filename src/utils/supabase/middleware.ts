import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Define protected routes
  const protectedRoutes = ['/profile', '/admin']
  const isProtectedRoute = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route))
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')

  // Not logged in and trying to access a protected route
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Check admin route access
  if (user && isAdminRoute) {
    const adminEmails = ['gamermirchi08@gmail.com', 'krytostudio@gmail.com']
    if (!user.email || !adminEmails.includes(user.email)) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
