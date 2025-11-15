import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

/**
 * GET - Fetch all groups for the authenticated user
 */
export async function GET() {
  try {
    // Verify user authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get groups with member counts using Prisma
    const groups = await prisma.chatGroup.findMany({
      where: {
        ownerId: userId,
      },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                customName: true,
                whatsappName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format the response to match the expected structure
    const formattedGroups = groups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      created_at: group.createdAt,
      updated_at: group.updatedAt,
      owner_id: group.ownerId,
      member_count: group._count.members,
      members: group.members.map(member => ({
        id: member.id,
        user_id: member.userId,
        added_at: member.addedAt,
        user: member.user,
      })),
    }));

    return NextResponse.json({
      success: true,
      groups: formattedGroups,
    });

  } catch (error) {
    console.error('Error in groups API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new group
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

    const body = await request.json();
    const { name, description, memberIds } = body;

    // Validate input
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    // Create the group with members in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the group
      const group = await tx.chatGroup.create({
        data: {
          ownerId: userId,
          name: name.trim(),
          description: description?.trim() || null,
        },
      });

      // Add members if provided
      if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
        await tx.groupMember.createMany({
          data: memberIds.map((memberId: string) => ({
            groupId: group.id,
            userId: memberId,
          })),
          skipDuplicates: true,
        });
      }

      return group;
    });

    return NextResponse.json({
      success: true,
      message: 'Group created successfully',
      group: result,
    });

  } catch (error) {
    console.error('Error in create group API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

