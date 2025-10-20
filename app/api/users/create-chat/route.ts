import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST handler to create or get chat(s) with phone number(s)
 * Supports both single user and bulk user creation
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Parse request body - support both single and bulk creation
    const body = await request.json();
    const { phoneNumber, customName, users } = body;

    // Handle bulk user creation
    if (users && Array.isArray(users)) {
      return handleBulkUserCreation(supabase, user, users);
    }

    // Handle single user creation (legacy support)
    if (!phoneNumber) {
      return new NextResponse('Missing phoneNumber parameter', { status: 400 });
    }

    return handleSingleUserCreation(supabase, user, phoneNumber, customName);

  } catch (error) {
    console.error('Error in create-chat API:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Handle single user creation
 */
async function handleSingleUserCreation(
  supabase: any,
  user: any,
  phoneNumber: string,
  customName?: string
) {
  // Clean and validate phone number - match WhatsApp format (without + prefix)
  const cleanPhoneNumber = phoneNumber.replace(/\s+/g, '').replace(/[^\d]/g, '');
  
  // Validate phone number format
  const phoneRegex = /^\d{10,15}$/;
  if (!phoneRegex.test(cleanPhoneNumber)) {
    return new NextResponse(
      JSON.stringify({ 
        error: 'Invalid phone number format', 
        message: 'Phone number must contain 10-15 digits (e.g., 918097296453)' 
      }), 
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Check if trying to chat with own number
  const userIdWithoutPlus = user.id.replace(/^\+/, '');
  if (cleanPhoneNumber === user.id || cleanPhoneNumber === userIdWithoutPlus) {
    return new NextResponse(
      JSON.stringify({ 
        error: 'Cannot create chat with yourself' 
      }), 
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Validate custom name length
  if (customName && customName.length > 100) {
    return new NextResponse(
      JSON.stringify({ 
        error: 'Custom name too long', 
        message: 'Custom name must be 100 characters or less' 
      }), 
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.log(`Creating/getting chat with ${cleanPhoneNumber}, custom name: "${customName}"`);

  // Call the database function to create or get user
  const { data, error } = await supabase.rpc('create_or_get_user', {
    phone_number: cleanPhoneNumber,
    user_name: customName || null
  });

  if (error) {
    console.error('Error creating/getting user:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to create chat', details: error.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!data || data.length === 0) {
    return new NextResponse(
      JSON.stringify({ error: 'Failed to create or retrieve user' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const userData = data[0];
  console.log(`Successfully ${userData.is_new ? 'created' : 'retrieved'} user:`, userData);

  return NextResponse.json({
    success: true,
    user: {
      id: userData.id,
      name: userData.custom_name || userData.whatsapp_name || userData.name || userData.id,
      custom_name: userData.custom_name,
      whatsapp_name: userData.whatsapp_name,
      last_active: userData.last_active,
      unread_count: 0,
      last_message: '',
      last_message_time: userData.last_active,
      last_message_type: 'text',
      last_message_sender: ''
    },
    isNew: userData.is_new,
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle bulk user creation
 */
async function handleBulkUserCreation(
  supabase: any,
  user: any,
  users: Array<{ phoneNumber: string; customName?: string }>
) {
  if (!Array.isArray(users) || users.length === 0) {
    return new NextResponse(
      JSON.stringify({ error: 'Users array is required and must not be empty' }), 
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (users.length > 50) {
    return new NextResponse(
      JSON.stringify({ error: 'Cannot create more than 50 users at once' }), 
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.log(`Bulk creating ${users.length} users`);

  const results = {
    success: [] as any[],
    failed: [] as any[],
    totalRequested: users.length,
    successCount: 0,
    failedCount: 0
  };

  const userIdWithoutPlus = user.id.replace(/^\+/, '');

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
      if (cleanPhoneNumber === user.id || cleanPhoneNumber === userIdWithoutPlus) {
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

      // Call the database function to create or get user
      const { data, error } = await supabase.rpc('create_or_get_user', {
        phone_number: cleanPhoneNumber,
        user_name: customName || null
      });

      if (error) {
        console.error(`Error creating user ${cleanPhoneNumber}:`, error);
        results.failed.push({
          phoneNumber,
          customName,
          error: error.message || 'Database error'
        });
        results.failedCount++;
        continue;
      }

      if (!data || data.length === 0) {
        results.failed.push({
          phoneNumber,
          customName,
          error: 'Failed to create or retrieve user'
        });
        results.failedCount++;
        continue;
      }

      const userData = data[0];
      results.success.push({
        phoneNumber,
        customName,
        user: {
          id: userData.id,
          name: userData.custom_name || userData.whatsapp_name || userData.name || userData.id,
          custom_name: userData.custom_name,
          whatsapp_name: userData.whatsapp_name,
          last_active: userData.last_active,
          unread_count: 0,
          last_message: '',
          last_message_time: userData.last_active,
          last_message_type: 'text',
          last_message_sender: ''
        },
        isNew: userData.is_new
      });
      results.successCount++;

    } catch (error) {
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