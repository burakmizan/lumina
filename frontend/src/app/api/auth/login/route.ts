import { NextResponse } from 'next/server'

const VALID_USERNAME = process.env.LUMINA_USERNAME || 'admin'
const VALID_PASSWORD = process.env.LUMINA_PASSWORD || 'lumina2024'
const SESSION_VALUE  = 'lumina-authenticated-v1'

export async function POST(request: Request) {
  const { username, password } = await request.json()

  if (username !== VALID_USERNAME || password !== VALID_PASSWORD) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set('lumina_session', SESSION_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
  return response
}
