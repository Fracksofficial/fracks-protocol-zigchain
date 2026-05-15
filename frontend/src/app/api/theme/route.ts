import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { theme } = await request.json()
    
    const response = NextResponse.json({ success: true })
    response.cookies.set('theme', theme, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    })
    
    return response
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save theme preference' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const theme = request.cookies.get('theme')?.value || 'light'
  return NextResponse.json({ theme })
}