"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Users, Save, Loader2, Search, Phone } from "lucide-react";

interface ChatUser {
  id: string;
  name: string;
  custom_name?: string;
  whatsapp_name?: string;
  phone_number?: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  member_count: number;
}

interface GroupManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  users: ChatUser[];
  group?: Group | null; // If provided, we're editing; otherwise creating
  onGroupSaved: () => void;
}

export function GroupManagementDialog({
  isOpen,
  onClose,
  users,
  group,
  onGroupSaved,
}: GroupManagementDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing group data if editing
  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description || "");
      loadGroupMembers(group.id);
    } else {
      setName("");
      setDescription("");
      setSelectedUserIds([]);
    }
  }, [group]);

  const loadGroupMembers = async (groupId: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members`);
      const data = await response.json();
      
      if (data.success && data.members) {
        setSelectedUserIds(data.members.map((m: { user_id: string }) => m.user_id));
      }
    } catch (error) {
      console.error('Error loading group members:', error);
    }
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Group name is required");
      return;
    }

    if (selectedUserIds.length === 0) {
      setError("Please select at least one member");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (group) {
        // Update existing group
        const updateResponse = await fetch(`/api/groups/${group.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description }),
        });

        if (!updateResponse.ok) {
          throw new Error('Failed to update group');
        }

        // Get current members
        const membersResponse = await fetch(`/api/groups/${group.id}/members`);
        const membersData = await membersResponse.json();
        const currentMemberIds = membersData.members?.map((m: { user_id: string }) => m.user_id) || [];

        // Find members to add and remove
        const toAdd = selectedUserIds.filter(id => !currentMemberIds.includes(id));
        const toRemove = currentMemberIds.filter((id: string) => !selectedUserIds.includes(id));

        // Add new members
        if (toAdd.length > 0) {
          await fetch(`/api/groups/${group.id}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds: toAdd }),
          });
        }

        // Remove members
        for (const userId of toRemove) {
          await fetch(`/api/groups/${group.id}/members?userId=${userId}`, {
            method: 'DELETE',
          });
        }
      } else {
        // Create new group
        const response = await fetch('/api/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description,
            memberIds: selectedUserIds,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create group');
        }
      }

      onGroupSaved();
      onClose();
    } catch (error) {
      console.error('Error saving group:', error);
      setError(error instanceof Error ? error.message : 'Failed to save group');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    const displayName = (user.custom_name || user.whatsapp_name || user.name || '').toLowerCase();
    const phone = (user.phone_number || user.id || '').toLowerCase();
    return displayName.includes(term) || phone.includes(term);
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-[#18201B] border border-stone-200/80 dark:border-stone-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200/80 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                {group ? 'Edit Group' : 'Create New Group'}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Organize contacts for instant broadcast messaging
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-3 rounded-xl border border-red-200 dark:border-red-900/50 text-sm">
              {error}
            </div>
          )}

          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="group-name" className="text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-300">
              Group Name *
            </Label>
            <Input
              id="group-name"
              placeholder="e.g., VIP Customers, Weekly Newsletter"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border-stone-200/80 dark:border-stone-800"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="group-description" className="text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-300">
              Description (Optional)
            </Label>
            <Textarea
              id="group-description"
              placeholder="Brief description of this group..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border-stone-200/80 dark:border-stone-800"
            />
          </div>

          {/* Members Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-300">
                Select Members *
              </Label>
              <span className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {selectedUserIds.length} selected
              </span>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
              <Input
                placeholder="Search by contact name or phone number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl border-stone-200/80 dark:border-stone-800 text-sm"
              />
            </div>

            {/* User List */}
            <div className="border border-stone-200/80 dark:border-stone-800 rounded-xl max-h-64 overflow-y-auto bg-stone-50/30 dark:bg-stone-900/20">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-500 dark:text-stone-400">
                  No contacts found matching your query
                </div>
              ) : (
                <div className="divide-y divide-stone-200/60 dark:divide-stone-800/60">
                  {filteredUsers.map(user => {
                    const isSelected = selectedUserIds.includes(user.id);
                    const displayName = user.custom_name || user.whatsapp_name || user.name || user.phone_number || "Contact";
                    const phoneNumber = user.phone_number || (user.id.includes('-') ? '' : user.id) || "No phone number";

                    return (
                      <label
                        key={user.id}
                        className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-emerald-500/10 dark:bg-emerald-500/15'
                            : 'hover:bg-stone-100/70 dark:hover:bg-stone-800/50'
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleUser(user.id)}
                          className="rounded-md border-stone-300 dark:border-stone-700 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-stone-900 dark:text-stone-100 truncate">
                            {displayName}
                          </p>
                          <p className="text-xs text-stone-500 dark:text-stone-400 font-mono flex items-center gap-1.5 mt-0.5 truncate">
                            <Phone className="h-3 w-3 text-stone-400 shrink-0" />
                            <span>{phoneNumber}</span>
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-stone-200/80 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {group ? 'Update Group' : 'Create Group'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
