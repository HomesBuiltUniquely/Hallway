import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function designApiBase(): string {
  const raw = (
    process.env.DESIGN_MODULE_BASE_URL ||
    process.env.DESIGN_API_URL ||
    'https://api.hubinterior.com'
  ).replace(/\/$/, '');
  try {
    const host = new URL(raw).hostname.toLowerCase();
    if (host === 'design.hubinterior.com') return 'https://api.hubinterior.com';
  } catch {
    /* ignore */
  }
  return raw;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body || {};

    if (!email || typeof email !== 'string' || !email.trim() || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    let response: Response;
    try {
      response = await fetch(`${designApiBase()}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });
    } catch (networkError: any) {
      console.error('Failed to connect to Design Module backend:', networkError);
      return NextResponse.json(
        { message: 'Design Module is unreachable. Try again.' },
        { status: 500 }
      );
    }

    const data = await response.json().catch(() => null);

    if (!data) {
      return NextResponse.json(
        { message: 'Invalid response from Design Module' },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (err: any) {
    console.error('Design login BFF route error:', err);
    return NextResponse.json(
      { message: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
