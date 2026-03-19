"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Users, Save, Loader2, Search } from "lucide-react";

interface ChatUser {
  id: string;
  name: string;
  custom_name?: string;
  whatsapp_name?: string;
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

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-green-600" />
            <h2 className="text-2xl font-bold">
              {group ? 'Edit Group' : 'Create New Group'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name *</Label>
            <Input
              id="group-name"
              placeholder="e.g., VIP Customers, Weekly Newsletter"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="group-description">Description (Optional)</Label>
            <Textarea
              id="group-description"
              placeholder="Brief description of this group..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none"
            />
          </div>

          {/* Members Selection */}
          <div className="space-y-3">
            <Label>Select Members * ({selectedUserIds.length} selected)</Label>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* User List */}
            <div className="border border-border rounded-lg max-h-64 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No users found
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredUsers.map(user => (
                    <label
                      key={user.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedUserIds.includes(user.id)}
                        onCheckedChange={() => handleToggleUser(user.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.id}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700"
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

