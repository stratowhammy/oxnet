'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function loginAsStudent() {
    const cookieStore = await cookies();
    cookieStore.set('role', 'STUDENT');
    cookieStore.set('userId', 'demo-user-1'); // Keep consistent with seed
    redirect('/');
}

export async function loginAsAdmin() {
    const cookieStore = await cookies();
    cookieStore.set('role', 'ADMIN');
    cookieStore.set('userId', 'admin-user'); // Keep consistent with seed
    redirect('/admin');
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete('role');
    cookieStore.delete('userId');
    redirect('/login');
}
