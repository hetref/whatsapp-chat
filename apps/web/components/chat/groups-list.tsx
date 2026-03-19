"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Edit, Trash2, ChevronDown, ChevronRight, MessageCircle } from "lucide-react";

interface Group {
  id: string;
  name: string;
  description?: string;
  member_count: number;
  unread_count?: number;
}

interface GroupMember {
  member_id: string;
  user_id: string;
  whatsapp_name?: string;
  custom_name?: string;
  unread_count: number;
}

interface GroupsListProps {
  groups: Group[];
  onEditGroup: (group: Group) => void;
  onDeleteGroup: (groupId: string) => void;
  onSelectMember: (userId: string) => void;
  onBroadcastToGroup: (groupId: string) => void;
}

export function GroupsList({
  groups,
  onEditGroup,
  onDeleteGroup,
  onSelectMember,
  onBroadcastToGroup,
}: GroupsListProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [groupMembers, setGroupMembers] = useState<Record<string, GroupMember[]>>({});
  const [loadingMembers, setLoadingMembers] = useState<Set<string>>(new Set());

  const toggleGroup = async (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
      
      // Load members if not already loaded
      if (!groupMembers[groupId]) {
        await loadGroupMembers(groupId);
      }
    }
    
    setExpandedGroups(newExpanded);
  };

  const loadGroupMembers = async (groupId: string) => {
    setLoadingMembers(prev => new Set(prev).add(groupId));
    
    try {
      console.log(`Loading members for group: ${groupId}`);
      const response = await fetch(`/api/groups/${groupId}/members`);
      const data = await response.json();
      
      console.log('Group members API response:', data);
      
      if (!response.ok) {
        console.error('Failed to load members:', data.error);
        return;
      }
      
      if (data.success && data.members) {
        console.log(`Loaded ${data.members.length} members for group ${groupId}`);
        setGroupMembers(prev => ({
          ...prev,
          [groupId]: data.members,
        }));
      } else {
        console.warn('No members found in response:', data);
      }
    } catch (error) {
      console.error('Error loading group members:', error);
    } finally {
      setLoadingMembers(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupId);
        return newSet;
      });
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (confirm(`Are you sure you want to delete the group "${groupName}"?`)) {
      onDeleteGroup(groupId);
    }
  };

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      {/* Section Header */}
      <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Broadcast Groups ({groups.length})
      </div>

      {/* Groups List */}
      {groups.map(group => {
        const isExpanded = expandedGroups.has(group.id);
        const members = groupMembers[group.id] || [];
        const isLoadingMembers = loadingMembers.has(group.id);
        const totalUnread = members.reduce((sum, m) => sum + (m.unread_count || 0), 0);

        return (
          <div key={group.id} className="border-b border-border/50 last:border-b-0">
            {/* Group Header */}
            <div className="group px-4 py-3 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                {/* Expand/Collapse Button */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                {/* Group Icon */}
                <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>

                {/* Group Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{group.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {group.member_count}
                    </Badge>
                    {totalUnread > 0 && (
                      <Badge className="bg-red-500 text-white text-xs">
                        {totalUnread}
                      </Badge>
                    )}
                  </div>
                  {group.description && (
                    <p className="text-sm text-muted-foreground truncate">
                      {group.description}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onBroadcastToGroup(group.id);
                    }}
                    title="Send broadcast"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditGroup(group);
                    }}
                    title="Edit group"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGroup(group.id, group.name);
                    }}
                    title="Delete group"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Expanded Members List */}
            {isExpanded && (
              <div className="bg-muted/30 border-t border-border/50">
                {isLoadingMembers ? (
                  <div className="px-12 py-4 text-sm text-muted-foreground">
                    Loading members...
                  </div>
                ) : members.length === 0 ? (
                  <div className="px-12 py-4 text-sm text-muted-foreground">
                    No members in this group
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {members.map(member => (
                      <button
                        key={member.member_id}
                        onClick={() => onSelectMember(member.user_id)}
                        className="w-full px-12 py-2 text-left hover:bg-muted/50 transition-colors flex items-center justify-between"
                      >
                        <span className="text-sm">
                          {member.custom_name || member.whatsapp_name || member.user_id}
                        </span>
                        {member.unread_count > 0 && (
                          <Badge className="bg-red-500 text-white text-xs">
                            {member.unread_count}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

