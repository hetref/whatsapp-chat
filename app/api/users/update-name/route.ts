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
    const { userId: contactId, customName } = await request.json(); // Still using userId param for backwards compat

    if (!contactId) {
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

    console.log(`Updating custom name for contact ${contactId} to "${customName}"`);

    // Verify the contact belongs to this user, then update
    const updatedContact = await prisma.contact.updateMany({
      where: {
        id: contactId,
        userId: userId // Ensure this contact belongs to the current user
      },
      data: {
        customName: customName || null
      }
    });

    if (updatedContact.count === 0) {
      return NextResponse.json(
        { error: 'Contact not found or access denied' },
        { status: 404 }
      );
    }

    // Fetch the updated contact to return
    const contact = await prisma.contact.findUnique({
      where: { id: contactId }
    });

    console.log('Contact name updated successfully:', contact);

    return NextResponse.json({
      success: true,
      user: {
        id: contact!.id,
        name: contact!.customName || contact!.whatsappName || contact!.phoneNumber,
        custom_name: contact!.customName,
        whatsapp_name: contact!.whatsappName,
        last_active: contact!.lastActive
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
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