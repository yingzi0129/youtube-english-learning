import { createServerClient, type CookieOptions } from '@supabase/ssr'
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

  // 刷新 session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 如果用户未登录且不在登录/注册页面，重定向到登录页
  if (!user && !request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 检查管理员路由权限
  if (user && request.nextUrl.pathname.startsWith('/admin')) {
    // 使用RPC函数查询用户角色（绕过RLS限制）
    const { data: role, error: roleError } = await supabase.rpc('get_user_role')

    console.log('检查管理员权限:', { userId: user.id, role, roleError })

    // 如果不是管理员，重定向到首页
    if (roleError || !role || role !== 'admin') {
      console.log('非管理员访问，重定向到首页')
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    console.log('管理员访问通过')
  }

  return supabaseResponse
}
