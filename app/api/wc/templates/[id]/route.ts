import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-middleware';

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

/**
 * GET - Get a specific template by ID
 * Authentication: API Key (Bearer token)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        // Authenticate the request
        const authResult = await authenticateApiRequest(request);
        if (!authResult.success) {
            return authResult.response;
        }

        const { settings } = authResult.data;
        const { id } = await params;

        if (!id) {
            return createErrorResponse('Template ID is required', 400, 'Validation Error');
        }

        console.log('[WC API] Fetching template:', id);

        // Build WhatsApp Business API URL
        const fields = 'id,name,status,category,language,components,previous_category,rejected_reason,quality_score';
        const apiUrl = `https://graph.facebook.com/${settings.apiVersion}/${id}?fields=${fields}`;

        // Fetch template from WhatsApp Business API
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${settings.accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[WC API] WhatsApp API error:', {
                status: response.status,
                error: errorText,
            });

            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { message: errorText };
            }

            return NextResponse.json({
                success: false,
                error: 'WhatsApp API Error',
                message: errorData?.error?.message || errorData?.error?.error_user_msg || 'Failed to fetch template from WhatsApp',
                details: {
                    status: response.status,
                    code: errorData?.error?.code,
                    subcode: errorData?.error?.error_subcode,
                    type: errorData?.error?.type,
                },
                timestamp: new Date().toISOString()
            }, { status: response.status });
        }

        const templateData = await response.json();

        console.log('[WC API] Successfully fetched template:', templateData.id);

        return createSuccessResponse({
            template: templateData,
        });

    } catch (error: unknown) {
        console.error('[WC API] Error fetching template:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'An unexpected error occurred',
            500,
            'Internal Server Error'
        );
    }
}

/**
 * DELETE - Delete a template by ID
 * Authentication: API Key (Bearer token)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        // Authenticate the request
        const authResult = await authenticateApiRequest(request);
        if (!authResult.success) {
            return authResult.response;
        }

        const { settings } = authResult.data;
        const { id } = await params;

        if (!id) {
            return createErrorResponse('Template ID is required', 400, 'Validation Error');
        }

        // Get template name from query parameter (required by WhatsApp API)
        const { searchParams } = new URL(request.url);
        const templateName = searchParams.get('name');

        if (!templateName) {
            return createErrorResponse(
                'Template name is required. Please provide the template name as a query parameter: ?name=your_template_name',
                400,
                'Validation Error'
            );
        }

        console.log('[WC API] Deleting template:', { id, name: templateName });

        // Build WhatsApp Business API URL for deletion
        // Note: WhatsApp requires the WABA ID and template name for deletion
        const apiUrl = `https://graph.facebook.com/${settings.apiVersion}/${settings.businessAccountId}/message_templates?name=${encodeURIComponent(templateName)}`;

        // Delete template via WhatsApp Business API
        const response = await fetch(apiUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${settings.accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[WC API] Template deletion failed:', {
                status: response.status,
                error: errorText,
            });

            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { message: errorText };
            }

            let errorMessage = 'Failed to delete template';
            let errorTitle = 'Template Deletion Failed';

            if (errorData?.error) {
                if (errorData.error.error_user_msg) {
                    errorMessage = errorData.error.error_user_msg;
                } else if (errorData.error.message) {
                    errorMessage = errorData.error.message;
                }

                if (errorData.error.error_user_title) {
                    errorTitle = errorData.error.error_user_title;
                }
            }

            return NextResponse.json({
                success: false,
                error: errorTitle,
                message: errorMessage,
                details: {
                    status: response.status,
                    code: errorData?.error?.code,
                    subcode: errorData?.error?.error_subcode,
                    type: errorData?.error?.type,
                },
                timestamp: new Date().toISOString()
            }, { status: response.status });
        }

        const responseData = await response.json();

        console.log('[WC API] Template deleted successfully:', responseData);

        return createSuccessResponse(
            {
                success: responseData.success || true,
                template_name: templateName,
            },
            'Template deleted successfully'
        );

    } catch (error: unknown) {
        console.error('[WC API] Error deleting template:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'An unexpected error occurred',
            500,
            'Internal Server Error'
        );
    }
}
