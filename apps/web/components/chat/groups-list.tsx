"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Edit, Trash2, ChevronDown, ChevronRight, MessageCircle, Phone, AlertTriangle, Loader2 } from "lucide-react";

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
  phone_number?: string;
  whatsapp_name?: string;
  custom_name?: string;
  unread_count: number;
}

interface GroupsListProps {
  groups: Group[];
  onEditGroup: (group: Group) => void;
  onDeleteGroup: (groupId: string) => void | Promise<void>;
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

  // Custom modal state for professional broadcast group deletion (replacing native browser confirm)
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [groupDeleteError, setGroupDeleteError] = useState<string | null>(null);

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
        const mappedMembers: GroupMember[] = data.members.map((m: any) => ({
          member_id: m.id || m.member_id,
          user_id: m.contact?.id || m.contact_id || m.user_id,
          phone_number: m.contact?.phone_number || m.phone_number || '',
          whatsapp_name: m.contact?.whatsapp_name || m.whatsapp_name,
          custom_name: m.contact?.custom_name || m.custom_name,
          unread_count: m.unread_count || 0,
        }));
        setGroupMembers(prev => ({
          ...prev,
          [groupId]: mappedMembers,
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

  const handleRequestDeleteGroup = (group: Group) => {
    setGroupDeleteError(null);
    setGroupToDelete(group);
  };

  const handleConfirmDeleteGroup = async () => {
    if (!groupToDelete) return;

    setIsDeletingGroup(true);
    setGroupDeleteError(null);
    try {
      await onDeleteGroup(groupToDelete.id);
      setGroupToDelete(null);
    } catch (error) {
      console.error('Error deleting broadcast group:', error);
      setGroupDeleteError(error instanceof Error ? error.message : 'Failed to delete broadcast group');
    } finally {
      setIsDeletingGroup(false);
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
                <div
                  className="shrink-0 size-9 bg-[#5F7C65]/12 dark:bg-[#5F7C65]/20 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20 rounded-xl flex items-center justify-center shadow-2xs cursor-pointer hover:scale-105 active:scale-95 transition-all"
                  onClick={() => onBroadcastToGroup(group.id)}
                  title="Open broadcast chat"
                >
                  <Users className="h-4.5 w-4.5" />
                </div>

                {/* Group Info */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onBroadcastToGroup(group.id)}
                  title="Open broadcast chat"
                >
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs sm:text-sm font-semibold truncate text-stone-900 dark:text-stone-100 hover:text-[#2D583F] dark:hover:text-[#8EAE95] transition-colors">{group.name}</h3>
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
                      handleRequestDeleteGroup(group);
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
                    {members.map(member => {
                      const displayName = member.custom_name || member.whatsapp_name || member.phone_number || "Contact";
                      return (
                        <button
                          key={member.member_id}
                          onClick={() => onSelectMember(member.user_id)}
                          className="w-full px-10 py-2 text-left hover:bg-[#5F7C65]/8 dark:hover:bg-[#5F7C65]/15 transition-colors flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0">
                            <span className="text-stone-800 dark:text-stone-200 font-medium truncate block">
                              {displayName}
                            </span>
                            {member.phone_number && (
                              <span className="text-[11px] text-stone-500 dark:text-stone-400 font-mono flex items-center gap-1 mt-0.5">
                                <Phone className="h-2.5 w-2.5 opacity-60 shrink-0" />
                                <span>{member.phone_number}</span>
                              </span>
                            )}
                          </div>
                          {member.unread_count > 0 && (
                            <span className="bg-[#B91C1C] text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center shrink-0 ml-2">
                              {member.unread_count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Delete Broadcast Group Confirmation Modal */}
      {groupToDelete && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in-0 duration-150"
          onClick={() => {
            if (!isDeletingGroup) {
              setGroupToDelete(null);
              setGroupDeleteError(null);
            }
          }}
        >
          <div
            className="bg-white dark:bg-[#18201B] border border-stone-200/80 dark:border-stone-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="size-11 rounded-2xl bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center justify-center shrink-0">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                    Delete Broadcast Group
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-stone-900 dark:text-stone-200">
                      &quot;{groupToDelete.name}&quot;
                    </span>
                    {typeof groupToDelete.member_count === 'number' && (
                      <span className="text-stone-500 dark:text-stone-400">
                        {" "}
                        ({groupToDelete.member_count} member{groupToDelete.member_count === 1 ? '' : 's'})
                      </span>
                    )}
                    ?
                  </p>

                  {/* Non-technical user warning */}
                  <div className="mt-3.5 p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      This broadcast group will be permanently deleted. <strong>This operation cannot be reversed.</strong>
                    </p>
                  </div>

                  {groupDeleteError && (
                    <div className="mt-3 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{groupDeleteError}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 bg-stone-50/80 dark:bg-[#131915]/80 border-t border-stone-200/70 dark:border-stone-800/70">
              <Button
                variant="outline"
                size="sm"
                disabled={isDeletingGroup}
                onClick={() => {
                  setGroupToDelete(null);
                  setGroupDeleteError(null);
                }}
                className="rounded-xl border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isDeletingGroup}
                onClick={handleConfirmDeleteGroup}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs gap-1.5"
              >
                {isDeletingGroup ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting Group...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Group</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

