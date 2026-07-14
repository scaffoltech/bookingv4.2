import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/AuthProvider';

export function useOrganization() {
  const { org, membership } = useAuth();
  const queryClient = useQueryClient();

  const membersQuery = useQuery({
    queryKey: ['org-members', org?.id],
    queryFn: async () => {
      const res = await fetch('/api/organizations/members');
      if (!res.ok) throw new Error('Failed to fetch members');
      const data = await res.json();
      return data.members;
    },
    enabled: !!org?.id,
  });

  const inviteMember = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const res = await fetch('/api/organizations/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to invite member');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members', org?.id] });
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
    },
  });

  const updateMemberRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const res = await fetch(`/api/organizations/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update role');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members', org?.id] });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await fetch(`/api/organizations/members/${memberId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove member');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members', org?.id] });
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
    },
  });

  const updateOrgName = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update organization');
      }
      return res.json();
    },
  });

  return {
    org,
    membership,
    members: membersQuery.data || [],
    membersLoading: membersQuery.isLoading,
    inviteMember,
    updateMemberRole,
    removeMember,
    updateOrgName,
  };
}
