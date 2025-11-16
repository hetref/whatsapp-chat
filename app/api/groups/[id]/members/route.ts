import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

/**
 * GET - Get all members of a group
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify user authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: groupId } = await params;

    // Verify group ownership
    const group = await prisma.chatGroup.findFirst({
      where: {
        id: groupId,
        ownerId: userId
      }
    });

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found or unauthorized' },
        { status: 404 }
      );
    }

    // Get members with details
    const members = await prisma.groupMember.findMany({
      where: {
        groupId: groupId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            customName: true,
            whatsappName: true,
            lastActive: true
          }
        }
      }
    });

    // Format the response to match expected structure
    const formattedMembers = members.map((member: typeof members[0]) => ({
      id: member.id,
      user_id: member.userId,
      added_at: member.addedAt.toISOString(),
      user: {
        id: member.user.id,
        name: member.user.name,
        custom_name: member.user.customName,
        whatsapp_name: member.user.whatsappName,
        last_active: member.user.lastActive.toISOString()
      }
    }));

    return NextResponse.json({
      success: true,
      members: formattedMembers,
    });

  } catch (error) {
    console.error('Error in get members API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Add members to a group
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify user authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: groupId } = await params;
    const body = await request.json();
    const { userIds } = body;

    // Validate input
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'User IDs array is required' },
        { status: 400 }
      );
    }

    // Verify group ownership
    const group = await prisma.chatGroup.findFirst({
      where: {
        id: groupId,
        ownerId: userId
      }
    });

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found or unauthorized' },
        { status: 404 }
      );
    }

    // Add members (duplicates will be ignored due to unique constraint)
    const members = userIds.map(userId => ({
      groupId: groupId,
      userId: userId,
    }));

    try {
      const result = await prisma.groupMember.createMany({
        data: members,
        skipDuplicates: true
      });

      return NextResponse.json({
        success: true,
        message: `${result.count} member(s) added successfully`,
        added: result.count,
      });
    } catch (dbError) {
      console.error('Error adding members:', dbError);
      return NextResponse.json(
        { error: 'Failed to add members', details: dbError instanceof Error ? dbError.message : 'Database error' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in add members API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove a member from a group
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify user authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: groupId } = await params;
    const { searchParams } = new URL(request.url);
    const userIdToRemove = searchParams.get('userId');

    if (!userIdToRemove) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Verify group ownership
    const group = await prisma.chatGroup.findFirst({
      where: {
        id: groupId,
        ownerId: userId
      }
    });

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found or unauthorized' },
        { status: 404 }
      );
    }

    // Remove member
    const result = await prisma.groupMember.deleteMany({
      where: {
        groupId: groupId,
        userId: userIdToRemove
      }
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Member not found in group' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully',
    });

  } catch (error) {
    console.error('Error in remove member API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

