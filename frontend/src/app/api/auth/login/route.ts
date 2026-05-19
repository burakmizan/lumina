import { NextResponse } from 'next/server'

const VALID_USERNAME = process.env.LUMINA_USERNAME || 'admin'
const VALID_PASSWORD = process.env.LUMINA_PASSWORD || 'lumina2024'
const SESSION_VALUE  = 'lumina-authenticated-v1'
const BACKEND_URL    = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function POST(request: Request) {
  const { username, password } = await request.json()

  if (username !== VALID_USERNAME || password !== VALID_PASSWORD) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const response = NextResponse.json({ success: true })

  // Session cookie for Next.js middleware routing
  response.cookies.set('lumina_session', SESSION_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  // Obtain JWT from backend and expose it for the Axios interceptor
  try {
    const backendRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (backendRes.ok) {
      const data = await backendRes.json()
      // Non-httpOnly so the client-side Axios interceptor can read it
      response.cookies.set('lumina_token', data.access_token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })
    }
  } catch {
    // Backend unavailable — session cookie is still set, RBAC will be limited
  }

  return response
}
