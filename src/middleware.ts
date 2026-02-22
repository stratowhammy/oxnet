import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    if (request.nextUrl.pathname.startsWith('/admin')) {
        // Check session-based role cookie OR legacy role cookie
        const role = request.cookies.get('role')?.value;
        const session = request.cookies.get('oxnet_session')?.value;

        // Allow if role cookie is ADMIN (legacy)
        if (role === 'ADMIN') return NextResponse.next();

        // Allow if session cookie matches admin user ID
        if (session === '10101010') return NextResponse.next();

        // Block non-admin access
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/admin/:path*',
};
