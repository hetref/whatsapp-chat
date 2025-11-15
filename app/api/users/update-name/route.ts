import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

/**
 * POST handler to update user custom name
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const { userId: targetUserId, customName } = await request.json();

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    // Validate custom name length
    if (customName && customName.length > 100) {
      return NextResponse.json(
        { 
          error: 'Custom name too long', 
          message: 'Custom name must be 100 characters or less' 
        }, 
        { status: 400 }
      );
    }

    console.log(`Updating custom name for user ${targetUserId} to "${customName}"`);

    // Update the user's custom name
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { 
        customName: customName || null
      }
    });

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('User name updated successfully:', updatedUser);

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        custom_name: updatedUser.customName,
        whatsapp_name: updatedUser.whatsappName,
        last_active: updatedUser.lastActive
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in update-name API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}

/**
 * GET handler for checking API status
 */
export async function GET() {
  return NextResponse.json({
    status: 'Update User Name API',
    timestamp: new Date().toISOString()
  });
}