import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Simple Mock RBAC
    // In a real app, verify JWT or Session

    if (request.nextUrl.pathname.startsWith('/admin')) {
        const role = request.cookies.get('role')?.value;

        // Allow if role is ADMIN
        // For demo purposes, if no cookie is set, we block.
        // To test, user needs to set cookie `role=ADMIN`

        if (role !== 'ADMIN') {
            return NextResponse.redirect(new URL('/', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/admin/:path*',
};
