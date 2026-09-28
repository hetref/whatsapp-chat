import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ received: true, note: 'Clerk migrated to Better Auth' }, { status: 200 });
}
