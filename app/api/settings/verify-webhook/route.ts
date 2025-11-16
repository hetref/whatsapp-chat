import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

/**
 * POST handler for marking webhook as verified
 * This is called internally after successful webhook verification
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const { userId } = await auth();
    if (!userId) {
      console.error('Authentication error: No user ID');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { verified } = body;

    if (typeof verified !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid verified value' },
        { status: 400 }
      );
    }

    console.log(`Setting webhook_verified to ${verified} for user:`, userId);

    // Update webhook_verified status
    const settings = await prisma.userSettings.update({
      where: { id: userId },
      data: {
        webhookVerified: verified,
        updatedAt: new Date(),
      }
    });


    console.log('Webhook verification status updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Webhook verification status updated',
      webhook_verified: settings.webhookVerified,
    });

  } catch (error: unknown) {
    console.error('Error in verify webhook API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

