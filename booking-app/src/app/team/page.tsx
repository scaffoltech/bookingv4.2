'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRole } from '@/hooks/useRole';
import { useOrganization } from '@/hooks/useOrganization';
import { useSubscription } from '@/hooks/useSubscription';
import { InviteTeamMemberForm } from '@/components/team/InviteForm';
import { Users, UserPlus, Shield, Briefcase, Crown, Loader2, AlertCircle, Trash2 } from 'lucide-react';

export default function TeamPage() {
  const { isAdmin, isOwner, loading: roleLoading } = useRole();
  const { members, membersLoading, removeMember, updateMemberRole } = useOrganization();
  const { data: subscriptionStatus } = useSubscription();
  const subscription = subscriptionStatus?.subscription;
  const [showInviteForm, setShowInviteForm] = useState(false);

  const activeMembers = members?.filter((m: any) => m.status === 'active') || [];
  const pendingMembers = members?.filter((m: any) => m.status === 'pending') || [];
  const seatCount = subscription?.seat_count || activeMembers.length || 1;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return (
          <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-none shadow-none text-[10px] font-bold uppercase tracking-tight">
            <Crown className="w-3 h-3 mr-1" />
            Owner
          </Badge>
        );
      case 'admin':
        return (
          <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 border-none shadow-none text-[10px] font-bold uppercase tracking-tight">
            <Shield className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        );
      case 'agent':
        return (
          <Badge className="bg-clio-blue/10 dark:bg-clio-blue/20 text-clio-blue border-none shadow-none text-[10px] font-bold uppercase tracking-tight">
            <Briefcase className="w-3 h-3 mr-1" />
            Agent
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tight">{role}</Badge>;
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from the team? This will revoke their access.`)) return;
    try {
      await removeMember.mutateAsync(memberId);
    } catch (err: any) {
      alert(`Failed to remove member: ${err.message}`);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      await updateMemberRole.mutateAsync({ memberId, role: newRole as any });
    } catch (err: any) {
      alert(`Failed to update role: ${err.message}`);
    }
  };

  if (roleLoading || membersLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-12 h-12 animate-spin text-clio-blue" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-clio-gray-900 rounded-2xl border border-clio-gray-200 dark:border-clio-gray-800 shadow-sm">
            <AlertCircle className="w-16 h-16 text-red-600 dark:text-red-400 mb-6" />
            <h2 className="text-3xl font-bold text-clio-gray-900 dark:text-white mb-2 uppercase tracking-tight">Access Denied</h2>
            <p className="text-clio-gray-600 dark:text-clio-gray-400 font-medium">You must be an admin to view this page.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-clio-gray-900 dark:text-white uppercase tracking-tight">Team Management</h1>
            <p className="text-clio-gray-600 dark:text-clio-gray-400 font-medium mt-2">
              Manage your team members and their permissions
            </p>
          </div>

          <Button
            className="mt-4 md:mt-0 font-bold uppercase tracking-tight"
            onClick={() => setShowInviteForm(true)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Team Member
          </Button>
        </div>

        {/* Team Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-clio-gray-500 dark:text-clio-gray-400">Seats Used</CardTitle>
              <Users className="h-4 w-4 text-clio-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-clio-gray-900 dark:text-white">
                {activeMembers.length} <span className="text-lg text-clio-gray-400">/ {seatCount}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-clio-gray-500 dark:text-clio-gray-400">Admins</CardTitle>
              <Shield className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-clio-gray-900 dark:text-white">
                {activeMembers.filter((m: any) => m.role === 'admin' || m.role === 'owner').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-clio-gray-500 dark:text-clio-gray-400">Pending Invites</CardTitle>
              <UserPlus className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-clio-gray-900 dark:text-white">
                {pendingMembers.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Invites */}
        {pendingMembers.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-clio-gray-900 dark:text-white uppercase tracking-tight">Pending Invites ({pendingMembers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingMembers.map((member: any) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/20 rounded-xl"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400 text-sm font-bold">
                        {(member.invited_email || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-clio-gray-900 dark:text-white">{member.invited_email}</div>
                        <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Pending</div>
                      </div>
                    </div>
                    {getRoleBadge(member.role)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold text-clio-gray-900 dark:text-white uppercase tracking-tight">Active Members ({activeMembers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {activeMembers.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-clio-gray-50 dark:bg-clio-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-clio-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-clio-gray-900 dark:text-white mb-2 uppercase tracking-tight">No team members</h3>
                <p className="text-sm font-medium text-clio-gray-500 dark:text-clio-gray-400">Start by inviting your first team member.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeMembers.map((member: any) => {
                  const user = member.users;
                  const displayName = user?.full_name || member.invited_email || 'Unknown';
                  const displayEmail = user?.email || member.invited_email || '';

                  return (
                    <div
                      key={member.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-clio-gray-50/50 dark:bg-clio-gray-900/50 border border-clio-gray-100 dark:border-clio-gray-800 rounded-2xl hover:border-clio-blue dark:hover:border-clio-blue/50 transition-all group"
                    >
                      <div className="flex items-center space-x-5 mb-4 sm:mb-0">
                        <div className="w-14 h-14 bg-clio-blue rounded-full flex items-center justify-center text-white text-xl font-black uppercase shadow-lg shadow-clio-blue/20">
                          {displayName[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-lg font-bold text-clio-gray-900 dark:text-white uppercase tracking-tight group-hover:text-clio-blue transition-colors">
                            {displayName}
                          </div>
                          <div className="text-sm font-medium text-clio-gray-500 dark:text-clio-gray-400">{displayEmail}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="flex-shrink-0">
                          {getRoleBadge(member.role)}
                        </div>

                        {/* Role Selector - can't change owner */}
                        {member.role !== 'owner' && isOwner && (
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                            className="h-10 px-4 bg-white dark:bg-clio-gray-950 border border-clio-gray-200 dark:border-clio-gray-800 text-clio-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-clio-blue/20 focus:border-clio-blue transition-all font-bold uppercase tracking-tight text-xs min-w-[120px]"
                          >
                            <option value="admin">Admin</option>
                            <option value="agent">Agent</option>
                          </select>
                        )}

                        {/* Remove button - can't remove owner */}
                        {member.role !== 'owner' && isOwner && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-clio-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                            onClick={() => handleRemoveMember(member.id, displayName)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invite Form Modal */}
        {showInviteForm && (
          <InviteTeamMemberForm
            onClose={() => setShowInviteForm(false)}
            onSuccess={() => setShowInviteForm(false)}
          />
        )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
