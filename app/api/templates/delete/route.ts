import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

interface DeleteTemplateRequest {
  templateId: string;
  templateName: string;
}

/**
 * DELETE handler for deleting message templates
 * Now uses user-specific credentials from database
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify user authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's WhatsApp API credentials
    const settings = await prisma.userSettings.findUnique({
      where: { id: userId },
      select: {
        accessToken: true,
        businessAccountId: true,
        apiVersion: true,
        accessTokenAdded: true
      }
    });

    if (!settings) {
      console.error('User settings not found for user:', userId);
      return NextResponse.json(
        { error: 'WhatsApp credentials not configured. Please complete setup.' },
        { status: 400 }
      );
    }

    if (!settings.accessTokenAdded || !settings.accessToken || !settings.businessAccountId) {
      console.error('WhatsApp API credentials not configured for user:', userId);
      return NextResponse.json(
        { error: 'WhatsApp credentials not configured. Please complete setup in the Settings page.' },
        { status: 400 }
      );
    }

    const WHATSAPP_ACCESS_TOKEN = settings.accessToken;
    const WHATSAPP_BUSINESS_ACCOUNT_ID = settings.businessAccountId;
    const WHATSAPP_API_VERSION = settings.apiVersion || 'v23.0';

    // Parse request body
    const { templateId, templateName }: DeleteTemplateRequest = await request.json();

    if (!templateId || !templateName) {
      return new NextResponse(
        JSON.stringify({
          error: 'Missing required fields',
          message: 'templateId and templateName are required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Attempting to delete template: ${templateName} (ID: ${templateId})`);

    // Delete template from Meta Business API
    const apiUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`;
    const deleteParams = new URLSearchParams({
      name: templateName
    });

    const response = await fetch(`${apiUrl}?${deleteParams.toString()}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Failed to delete template from Meta API:', {
        status: response.status,
        statusText: response.statusText,
        error: responseData,
        templateId,
        templateName
      });

      // Extract user-friendly error message from Meta API response
      let userErrorMessage = 'Failed to delete template';
      let userErrorTitle = '';

      if (responseData?.error) {
        // Check for Meta API specific error format
        if (responseData.error.error_user_msg) {
          userErrorMessage = responseData.error.error_user_msg;
        } else if (responseData.error.message) {
          userErrorMessage = responseData.error.message;
        }

        if (responseData.error.error_user_title) {
          userErrorTitle = responseData.error.error_user_title;
        }
      }

      return NextResponse.json({
        success: false,
        error: userErrorTitle || 'Template Deletion Failed',
        message: userErrorMessage,
        details: {
          metaError: responseData,
          status: response.status,
          templateId,
          templateName,
          code: responseData?.error?.code,
          subcode: responseData?.error?.error_subcode
        }
      }, { status: response.status });
    }

    console.log(`Template deleted successfully: ${templateName} (ID: ${templateId})`);

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
      templateId,
      templateName,
      data: responseData,
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error('Error in delete template API:', error);
    return new NextResponse(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 