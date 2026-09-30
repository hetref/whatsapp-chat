import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * GET /api/users/avatar
 * Returns or redirects to the user's Meta WhatsApp profile picture URL.
 * S3 avatar management has been completely eliminated in favor of direct Meta Cloud synchronization.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      const { userId } = await auth();
      targetUserId = userId;
    }

    if (!targetUserId) {
      return new NextResponse('User ID required', { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { image: true },
    });

    if (user?.image) {
      return NextResponse.redirect(user.image, { status: 307 });
    }

    return new NextResponse('Avatar not found', { status: 404 });
  } catch (error) {
    console.error('[API /users/avatar GET] Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
