import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

/**
 * POST handler to create or get chat(s) with phone number(s)
 * Supports both single user and bulk user creation
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

    // Parse request body - support both single and bulk creation
    const body = await request.json();
    const { phoneNumber, customName, users } = body;

    // Handle bulk user creation
    if (users && Array.isArray(users)) {
      return handleBulkUserCreation(userId, users);
    }

    // Handle single user creation (legacy support)
    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Missing phoneNumber parameter' },
        { status: 400 }
      );
    }

    return handleSingleUserCreation(userId, phoneNumber, customName);

  } catch (error: unknown) {
    console.error('Error in create-chat API (POST):', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle single user creation
 */
async function handleSingleUserCreation(
  currentUserId: string,
  phoneNumber: string,
  customName?: string
) {
  // Clean and validate phone number - match WhatsApp format (without + prefix)
  const cleanPhoneNumber = phoneNumber.replace(/\s+/g, '').replace(/[^\d]/g, '');

  // Validate phone number format
  const phoneRegex = /^\d{10,15}$/;
  if (!phoneRegex.test(cleanPhoneNumber)) {
    return NextResponse.json(
      {
        error: 'Invalid phone number format',
        message: 'Phone number must contain 10-15 digits (e.g., 918097296453)'
      },
      { status: 400 }
    );
  }

  // Check if trying to chat with own number
  const userIdWithoutPlus = currentUserId.replace(/^\+/, '');
  if (cleanPhoneNumber === currentUserId || cleanPhoneNumber === userIdWithoutPlus) {
    return NextResponse.json(
      {
        error: 'Cannot create chat with yourself'
      },
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

  console.log(`Creating/getting chat with ${cleanPhoneNumber}, custom name: "${customName}"`);

  try {
    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { id: cleanPhoneNumber }
    });

    let isNew = false;
    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          id: cleanPhoneNumber,
          name: cleanPhoneNumber, // Default name is phone number
          customName: customName || null,
          lastActive: new Date()
        }
      });
      isNew = true;
    } else if (customName && customName !== user.customName) {
      // Update custom name if provided and different
      user = await prisma.user.update({
        where: { id: cleanPhoneNumber },
        data: { customName }
      });
    }

    console.log(`Successfully ${isNew ? 'created' : 'retrieved'} user:`, user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.customName || user.whatsappName || user.name || user.id,
        custom_name: user.customName,
        whatsapp_name: user.whatsappName,
        last_active: user.lastActive.toISOString(),
        unread_count: 0,
        last_message: '',
        last_message_time: user.lastActive.toISOString(),
        last_message_type: 'text',
        last_message_sender: ''
      },
      isNew,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error creating/getting user:', error);
    return NextResponse.json(
      { error: 'Failed to create chat', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Handle bulk user creation
 */
async function handleBulkUserCreation(
  currentUserId: string,
  users: Array<{ phoneNumber: string; customName?: string }>
) {
  if (!Array.isArray(users) || users.length === 0) {
    return NextResponse.json(
      { error: 'Users array is required and must not be empty' },
      { status: 400 }
    );
  }

  if (users.length > 50) {
    return NextResponse.json(
      { error: 'Cannot create more than 50 users at once' },
      { status: 400 }
    );
  }

  console.log(`Bulk creating ${users.length} users`);

  const results = {
    success: [] as Array<{ phoneNumber: string; customName?: string; user: unknown; isNew?: boolean }>,
    failed: [] as Array<{ phoneNumber: string; customName?: string; error: string }>,
    totalRequested: users.length,
    successCount: 0,
    failedCount: 0
  };

  const userIdWithoutPlus = currentUserId.replace(/^\+/, '');

  // Process each user
  for (const userInput of users) {
    try {
      const { phoneNumber, customName } = userInput;

      if (!phoneNumber || !phoneNumber.trim()) {
        results.failed.push({
          phoneNumber: phoneNumber || 'empty',
          customName,
          error: 'Phone number is required'
        });
        results.failedCount++;
        continue;
      }

      // Clean and validate phone number
      const cleanPhoneNumber = phoneNumber.replace(/\s+/g, '').replace(/[^\d]/g, '');

      // Validate phone number format
      const phoneRegex = /^\d{10,15}$/;
      if (!phoneRegex.test(cleanPhoneNumber)) {
        results.failed.push({
          phoneNumber,
          customName,
          error: 'Invalid phone number format (must be 10-15 digits)'
        });
        results.failedCount++;
        continue;
      }

      // Check if trying to chat with own number
      if (cleanPhoneNumber === currentUserId || cleanPhoneNumber === userIdWithoutPlus) {
        results.failed.push({
          phoneNumber,
          customName,
          error: 'Cannot create chat with yourself'
        });
        results.failedCount++;
        continue;
      }

      // Validate custom name length
      if (customName && customName.length > 100) {
        results.failed.push({
          phoneNumber,
          customName,
          error: 'Custom name too long (max 100 characters)'
        });
        results.failedCount++;
        continue;
      }

      // Check if user already exists
      let user = await prisma.user.findUnique({
        where: { id: cleanPhoneNumber }
      });

      let isNew = false;
      if (!user) {
        // Create new user
        user = await prisma.user.create({
          data: {
            id: cleanPhoneNumber,
            name: cleanPhoneNumber, // Default name is phone number
            customName: customName || null,
            lastActive: new Date()
          }
        });
        isNew = true;
      } else if (customName && customName !== user.customName) {
        // Update custom name if provided and different
        user = await prisma.user.update({
          where: { id: cleanPhoneNumber },
          data: { customName }
        });
      }

      results.success.push({
        phoneNumber,
        customName,
        user: {
          id: user.id,
          name: user.customName || user.whatsappName || user.name || user.id,
          custom_name: user.customName,
          whatsapp_name: user.whatsappName,
          last_active: user.lastActive.toISOString(),
          unread_count: 0,
          last_message: '',
          last_message_time: user.lastActive.toISOString(),
          last_message_type: 'text',
          last_message_sender: ''
        },
        isNew
      });
      results.successCount++;

    } catch (error: unknown) {
      console.error('Error processing user:', error);
      results.failed.push({
        phoneNumber: userInput.phoneNumber,
        customName: userInput.customName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      results.failedCount++;
    }
  }

  console.log(`Bulk creation completed: ${results.successCount} success, ${results.failedCount} failed`);

  return NextResponse.json({
    success: true,
    results,
    timestamp: new Date().toISOString()
  });
}

/**
 * GET handler for checking API status
 */
export async function GET() {
  return NextResponse.json({
    status: 'Create Chat API',
    timestamp: new Date().toISOString()
  });
} 