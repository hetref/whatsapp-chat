import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest, createErrorResponse, createSuccessResponse } from '@/lib/api-middleware';

interface TemplateComponent {
    type: string;
    format?: string;
    text?: string;
    example?: Record<string, unknown>;
    buttons?: ButtonComponent[];
}

interface ButtonComponent {
    type: string;
    text: string;
    url?: string;
    phone_number?: string;
}

interface WhatsAppTemplate {
    id: string;
    name: string;
    status: string;
    category: string;
    language: string;
    components: TemplateComponent[];
    previous_category?: string;
    rejected_reason?: string;
    quality_score?: Record<string, unknown>;
}

interface FormattedComponents {
    header: TemplateComponent | null;
    body: TemplateComponent | null;
    footer: TemplateComponent | null;
    buttons: ButtonComponent[];
}

interface TransformedTemplate extends WhatsAppTemplate {
    created_at: string;
    updated_at: string;
    status_color: string;
    category_icon: string;
    formatted_components: FormattedComponents;
}

/**
 * GET - List all message templates
 * Authentication: API Key (Bearer token)
 */
export async function GET(request: NextRequest) {
    try {
        // Authenticate the request
        const authResult = await authenticateApiRequest(request);
        if (!authResult.success) {
            return authResult.response;
        }

        const { settings } = authResult.data;

        // Get query parameters for filtering and pagination
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const limit = searchParams.get('limit') || '50';
        const fields = searchParams.get('fields') || 'id,name,status,category,language,components,previous_category,rejected_reason,quality_score';

        // Build WhatsApp Business API URL
        let apiUrl = `https://graph.facebook.com/${settings.apiVersion}/${settings.businessAccountId}/message_templates`;

        // Add query parameters
        const params = new URLSearchParams({
            fields,
            limit,
        });

        if (status) {
            params.append('status', status);
        }

        apiUrl += `?${params.toString()}`;

        console.log('[WC API] Fetching templates:', { businessAccountId: settings.businessAccountId });

        // Fetch templates from WhatsApp Business API
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
                error: {
                    code: 'WHATSAPP_API_ERROR',
                    message: errorData?.error?.message || errorData?.error?.error_user_msg || 'Failed to fetch templates from WhatsApp',
                    details: {
                        status: response.status,
                        code: errorData?.error?.code,
                        subcode: errorData?.error?.error_subcode,
                        type: errorData?.error?.type,
                    },
                },
                timestamp: new Date().toISOString()
            }, { status: response.status });
        }

        const templatesData = await response.json() as { data: WhatsAppTemplate[]; paging?: Record<string, unknown> };

        console.log(`[WC API] Successfully fetched ${templatesData.data?.length || 0} templates`);

        // Transform the data
        const transformedTemplates: TransformedTemplate[] = templatesData.data?.map((template: WhatsAppTemplate) => ({
            ...template,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status_color: getStatusColor(template.status),
            category_icon: getCategoryIcon(template.category),
            formatted_components: formatComponents(template.components),
        })) || [];

        return createSuccessResponse({
            templates: transformedTemplates,
            pagination: templatesData.paging || null,
            total_count: transformedTemplates.length,
        });

    } catch (error: unknown) {
        console.error('[WC API] Error in templates list:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'An unexpected error occurred',
            500,
            'Internal Server Error'
        );
    }
}

/**
 * POST - Create a new message template
 * Authentication: API Key (Bearer token)
 */
export async function POST(request: NextRequest) {
    try {
        // Authenticate the request
        const authResult = await authenticateApiRequest(request);
        if (!authResult.success) {
            return authResult.response;
        }

        const { settings } = authResult.data;

        // Parse request body
        const templateData = await request.json();

        // Validate required fields
        if (!templateData.name || !templateData.category || !templateData.language || !templateData.components) {
            return createErrorResponse(
                'Missing required fields: name, category, language, and components are required',
                400,
                'Validation Error'
            );
        }

        // Validate template name
        if (templateData.name.length > 512) {
            return createErrorResponse(
                'Template name must be 512 characters or less',
                400,
                'Validation Error'
            );
        }

        // Validate category
        const validCategories = ['MARKETING', 'UTILITY', 'AUTHENTICATION'];
        if (!validCategories.includes(templateData.category)) {
            return createErrorResponse(
                'Category must be MARKETING, UTILITY, or AUTHENTICATION',
                400,
                'Validation Error'
            );
        }

        // Validate components
        const validationError = validateComponents(templateData.components);
        if (validationError) {
            return createErrorResponse(validationError, 400, 'Validation Error');
        }

        console.log('[WC API] Creating template:', {
            name: templateData.name,
            category: templateData.category,
            language: templateData.language,
        });

        // Prepare WhatsApp Business API request
        const apiUrl = `https://graph.facebook.com/${settings.apiVersion}/${settings.businessAccountId}/message_templates`;

        const requestBody = {
            name: templateData.name,
            category: templateData.category,
            language: templateData.language,
            components: templateData.components,
            ...(templateData.message_send_ttl_seconds && {
                message_send_ttl_seconds: templateData.message_send_ttl_seconds
            })
        };

        // Create template via WhatsApp Business API
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settings.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error('[WC API] Template creation failed:', {
                status: response.status,
                error: responseData,
            });

            let errorMessage = 'Failed to create template';
            let errorTitle = 'Template Creation Failed';

            if (responseData?.error) {
                if (responseData.error.error_user_msg) {
                    errorMessage = responseData.error.error_user_msg;
                } else if (responseData.error.message) {
                    errorMessage = responseData.error.message;
                }

                if (responseData.error.error_user_title) {
                    errorTitle = responseData.error.error_user_title;
                }
            }

            return NextResponse.json({
                success: false,
                error: {
                    code: 'WHATSAPP_API_ERROR',
                    message: errorMessage,
                    details: {
                        status: response.status,
                        code: responseData?.error?.code,
                        subcode: responseData?.error?.error_subcode,
                        type: responseData?.error?.type,
                        fbtrace_id: responseData?.error?.fbtrace_id,
                    },
                },
                timestamp: new Date().toISOString()
            }, { status: response.status });
        }

        console.log('[WC API] Template created successfully:', responseData.id);

        return createSuccessResponse(
            {
                id: responseData.id,
                status: responseData.status,
                category: responseData.category,
                name: templateData.name,
                language: templateData.language,
                components: templateData.components,
            },
            'Template created successfully',
            201
        );

    } catch (error: unknown) {
        console.error('[WC API] Error creating template:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'An unexpected error occurred',
            500,
            'Internal Server Error'
        );
    }
}

/**
 * Helper function to get status color for UI
 */
function getStatusColor(status: string): string {
    switch (status?.toUpperCase()) {
        case 'APPROVED':
            return 'text-green-600 bg-green-50';
        case 'PENDING':
            return 'text-yellow-600 bg-yellow-50';
        case 'REJECTED':
            return 'text-red-600 bg-red-50';
        case 'PAUSED':
            return 'text-orange-600 bg-orange-50';
        case 'DISABLED':
            return 'text-gray-600 bg-gray-50';
        default:
            return 'text-gray-600 bg-gray-50';
    }
}

/**
 * Helper function to get category icon for UI
 */
function getCategoryIcon(category: string): string {
    switch (category?.toUpperCase()) {
        case 'MARKETING':
            return '📢';
        case 'UTILITY':
            return '🔧';
        case 'AUTHENTICATION':
            return '🔐';
        default:
            return '📄';
    }
}

/**
 * Helper function to format components for easier display
 */
function formatComponents(components: TemplateComponent[]): FormattedComponents {
    if (!components || !Array.isArray(components)) {
        return {
            header: null,
            body: null,
            footer: null,
            buttons: []
        };
    }

    const formatted: FormattedComponents = {
        header: null,
        body: null,
        footer: null,
        buttons: []
    };

    components.forEach(component => {
        switch (component.type?.toUpperCase()) {
            case 'HEADER':
                formatted.header = component;
                break;
            case 'BODY':
                formatted.body = component;
                break;
            case 'FOOTER':
                formatted.footer = component;
                break;
            case 'BUTTONS':
                formatted.buttons = component.buttons || [];
                break;
        }
    });

    return formatted;
}

/**
 * Extract variables from text (e.g., {{1}}, {{2}})
 */
function extractVariables(text: string): number[] {
    const variableRegex = /\{\{(\d+)\}\}/g;
    const variables: number[] = [];
    let match;

    while ((match = variableRegex.exec(text)) !== null) {
        const varNum = parseInt(match[1], 10);
        if (!variables.includes(varNum)) {
            variables.push(varNum);
        }
    }

    return variables.sort((a, b) => a - b);
}

/**
 * Validate template components
 */
function validateComponents(components: TemplateComponent[]): string | null {
    if (!Array.isArray(components) || components.length === 0) {
        return 'Components array is required and cannot be empty';
    }

    let hasBody = false;
    let headerCount = 0;
    let footerCount = 0;
    let buttonsCount = 0;

    for (const component of components) {
        if (!component.type) {
            return 'Component type is required';
        }

        switch (component.type) {
            case 'HEADER':
                headerCount++;
                if (headerCount > 1) {
                    return 'Only one HEADER component is allowed';
                }
                if (!component.format) {
                    return 'HEADER component requires format field';
                }
                if (component.format === 'TEXT') {
                    if (!component.text) {
                        return 'TEXT HEADER component requires text field';
                    }

                    const headerVariables = extractVariables(component.text);
                    if (headerVariables.length > 0) {
                        if (!component.example || !component.example.header_text) {
                            return `HEADER contains variables but no examples provided. Please provide example values.`;
                        }
                        if (Array.isArray(component.example.header_text) && component.example.header_text.length !== headerVariables.length) {
                            return `HEADER has ${headerVariables.length} variable(s) but ${component.example.header_text.length} example(s) provided.`;
                        }
                    }
                }
                break;

            case 'BODY':
                hasBody = true;
                if (!component.text) {
                    return 'BODY component requires text field';
                }
                if (component.text.length > 1024) {
                    return 'BODY text must be 1024 characters or less';
                }

                const bodyVariables = extractVariables(component.text);
                if (bodyVariables.length > 0) {
                    if (!component.example || !component.example.body_text || !Array.isArray(component.example.body_text) || !component.example.body_text[0]) {
                        return `BODY contains variables but no examples provided. Please provide example values.`;
                    }
                    if (component.example.body_text[0].length !== bodyVariables.length) {
                        return `BODY has ${bodyVariables.length} variable(s) but ${component.example.body_text[0].length} example(s) provided.`;
                    }
                }
                break;

            case 'FOOTER':
                footerCount++;
                if (footerCount > 1) {
                    return 'Only one FOOTER component is allowed';
                }
                if (!component.text) {
                    return 'FOOTER component requires text field';
                }
                if (component.text.length > 60) {
                    return 'FOOTER text must be 60 characters or less';
                }

                const footerVariables = extractVariables(component.text);
                if (footerVariables.length > 0) {
                    return 'FOOTER component does not support variables';
                }
                break;

            case 'BUTTONS':
                buttonsCount++;
                if (buttonsCount > 1) {
                    return 'Only one BUTTONS component is allowed';
                }
                if (!component.buttons || !Array.isArray(component.buttons) || component.buttons.length === 0) {
                    return 'BUTTONS component requires buttons array';
                }
                if (component.buttons.length > 10) {
                    return 'Maximum 10 buttons are allowed';
                }

                for (const button of component.buttons) {
                    if (!button.type || !button.text) {
                        return 'Button type and text are required';
                    }
                    if (button.text.length > 25) {
                        return 'Button text must be 25 characters or less';
                    }
                    if (button.type === 'URL' && !button.url) {
                        return 'URL button requires url field';
                    }
                    if (button.type === 'PHONE_NUMBER' && !button.phone_number) {
                        return 'PHONE_NUMBER button requires phone_number field';
                    }
                }
                break;

            default:
                return `Invalid component type: ${component.type}`;
        }
    }

    if (!hasBody) {
        return 'BODY component is required';
    }

    return null;
}
