import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { checkContactsLimit, checkSubscriptionActive } from '@/lib/plan-limits';

interface TemplateComponent {
  type: string;
  text?: string;
  format?: string;
}

/**
 * Send a text message via WhatsApp Cloud API
 */
async function sendWhatsAppMessage(
  to: string,
  message: string,
  accessToken: string,
  phoneNumberId: string,
  apiVersion: string
): Promise<{ messages: { id: string }[] }> {
  const whatsappApiUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  const messageData = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'text',
    text: {
      body: message
    }
  };

  const response = await fetch(whatsappApiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messageData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WhatsApp API error: ${errorText}`);
  }

  return await response.json();
}

/**
 * POST handler for sending WhatsApp messages
 * Now properly creates contacts scoped to the user
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

    // Check subscription is active (not paused/expired/cancelled)
    const subCheck = await checkSubscriptionActive(userId);
    if (!subCheck.active) {
      return NextResponse.json(
        { error: 'Messaging blocked', message: subCheck.message, subscriptionStatus: subCheck.status },
        { status: 403 }
      );
    }

    // Parse request body
    const { to, message } = await request.json();

    // Validate required parameters
    if (!to || !message) {
      console.error('Missing required parameters:', { to: !!to, message: !!message });
      return NextResponse.json(
        { error: 'Missing required parameters: to, message' },
        { status: 400 }
      );
    }

    // Clean and validate phone number
    const cleanPhoneNumber = to.replace(/\s+/g, '').replace(/[^\d]/g, '');

    // Validate phone number format (10-15 digits)
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

    // Get user settings for WhatsApp credentials
    const userSettings = await prisma.userSettings.findUnique({
      where: { id: userId },
      select: {
        accessToken: true,
        phoneNumberId: true,
        apiVersion: true
      }
    });

    if (!userSettings || !userSettings.accessToken || !userSettings.phoneNumberId) {
      console.error('Settings not configured for user:', userId);
      return NextResponse.json(
        { error: 'WhatsApp credentials not configured. Please complete setup.' },
        { status: 400 }
      );
    }

    const { accessToken, phoneNumberId, apiVersion = 'v23.0' } = userSettings;

    // Find or create contact for this user
    let contact = await prisma.contact.findUnique({
      where: {
        contacts_user_id_phone_number_key: {
          userId: userId,
          phoneNumber: cleanPhoneNumber
        }
      }
    });

    if (!contact) {
      // Check contacts limit before creating
      const contactCheck = await checkContactsLimit(userId);
      if (!contactCheck.allowed) {
        return NextResponse.json(
          { error: `Contacts limit reached (${contactCheck.current}/${contactCheck.limit}). Upgrade your plan to add more contacts.` },
          { status: 403 }
        );
      }

      // Create new contact for this user
      console.log(`Creating new contact ${cleanPhoneNumber} for user ${userId}`);
      contact = await prisma.contact.create({
        data: {
          userId: userId,
          phoneNumber: cleanPhoneNumber,
          lastActive: new Date()
        }
      });
    }

    // Send message via WhatsApp API
    console.log(`Sending message to ${cleanPhoneNumber}`);
    const response = await sendWhatsAppMessage(
      cleanPhoneNumber,
      message,
      accessToken,
      phoneNumberId,
      apiVersion
    );

    const messageId = response.messages?.[0]?.id;
    if (!messageId) {
      throw new Error('No message ID returned from WhatsApp API');
    }

    // Store message in database
    const timestamp = new Date();
    await prisma.message.create({
      data: {
        id: messageId,
        userId: userId,
        contactId: contact.id,
        content: message,
        timestamp: timestamp,
        isSentByMe: true,
        isRead: true, // Outgoing messages are "read" by sender
        messageType: 'text'
      }
    });

    console.log('Message sent and stored successfully:', messageId);

    return NextResponse.json({
      success: true,
      messageId: messageId,
      timestamp: timestamp.toISOString()
    });

  } catch (error: unknown) {
    console.error('Error in send-message API:', error);
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
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const settings = await prisma.userSettings.findUnique({
      where: { id: userId },
      select: {
        accessToken: true,
        apiVersion: true
      }
    });

    const isConfigured = settings?.accessToken || false;
    const apiVersion = settings?.apiVersion || 'v23.0';

    return NextResponse.json({
      status: 'WhatsApp Send Message API',
      configured: isConfigured,
      version: apiVersion,
      timestamp: new Date().toISOString()
    });
  } catch {
    return NextResponse.json({
      status: 'WhatsApp Send Message API',
      configured: false,
      error: 'Failed to check configuration',
      timestamp: new Date().toISOString()
    });
  }
}
