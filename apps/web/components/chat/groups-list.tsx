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
      const response = await fetch(`/api/groups/${groupId}/members`);
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Failed to load members:', data.error);
        return;
      }
      
      if (data.success && data.members) {
        setGroupMembers(prev => ({
          ...prev,
          [groupId]: data.members,
        }));
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
    <div className="space-y-0.5">
      {/* Section Header */}
      <div className="px-4 py-2 text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider bg-stone-50/60 dark:bg-[#0E1310]/60 border-b border-stone-200/60 dark:border-stone-800/60 flex items-center justify-between">
        <span>Broadcast Groups</span>
        <span className="font-mono text-[10px] text-stone-400">({groups.length})</span>
      </div>

      {/* Groups List */}
      {groups.map(group => {
        const isExpanded = expandedGroups.has(group.id);
        const members = groupMembers[group.id] || [];
        const isLoadingMembers = loadingMembers.has(group.id);
        const totalUnread = members.reduce((sum, m) => sum + (m.unread_count || 0), 0);

        return (
          <div key={group.id} className="border-b border-stone-200/60 dark:border-stone-800/60 last:border-b-0">
            {/* Group Header */}
            <div className="group px-3.5 py-2.5 hover:bg-stone-100/60 dark:hover:bg-stone-800/40 transition-colors">
              <div className="flex items-center gap-2.5">
                {/* Expand/Collapse Button */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="p-1 hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded-lg text-stone-500 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </button>

                {/* Group Icon */}
                <div className="shrink-0 size-9 bg-[#5F7C65]/12 dark:bg-[#5F7C65]/20 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20 rounded-xl flex items-center justify-center shadow-2xs">
                  <Users className="h-4.5 w-4.5" />
                </div>

                {/* Group Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs sm:text-sm font-semibold truncate text-stone-900 dark:text-stone-100">{group.name}</h3>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200/70 dark:border-stone-700/60">
                      {group.member_count}
                    </span>
                    {totalUnread > 0 && (
                      <span className="bg-[#B91C1C] text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                        {totalUnread}
                      </span>
                    )}
                  </div>
                  {group.description && (
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                      {group.description}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg text-stone-500 hover:text-[#2D583F] dark:hover:text-[#8EAE95] hover:bg-[#5F7C65]/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onBroadcastToGroup(group.id);
                    }}
                    title="Send broadcast"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditGroup(group);
                    }}
                    title="Edit group"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg text-stone-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGroup(group.id, group.name);
                    }}
                    title="Delete group"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Expanded Members List */}
            {isExpanded && (
              <div className="bg-stone-50/50 dark:bg-[#131915]/50 border-t border-stone-200/60 dark:border-stone-800/60">
                {isLoadingMembers ? (
                  <div className="px-10 py-3 text-xs text-stone-500 dark:text-stone-400">
                    Loading members...
                  </div>
                ) : members.length === 0 ? (
                  <div className="px-10 py-3 text-xs text-stone-500 dark:text-stone-400">
                    No members in this group
                  </div>
                ) : (
                  <div className="divide-y divide-stone-200/50 dark:divide-stone-800/50">
                    {members.map(member => (
                      <button
                        key={member.member_id}
                        onClick={() => onSelectMember(member.user_id)}
                        className="w-full px-10 py-2 text-left hover:bg-[#5F7C65]/8 dark:hover:bg-[#5F7C65]/15 transition-colors flex items-center justify-between text-xs"
                      >
                        <span className="text-stone-800 dark:text-stone-200 font-medium truncate">
                          {member.custom_name || member.whatsapp_name || member.user_id}
                        </span>
                        {member.unread_count > 0 && (
                          <span className="bg-[#B91C1C] text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                            {member.unread_count}
                          </span>
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

