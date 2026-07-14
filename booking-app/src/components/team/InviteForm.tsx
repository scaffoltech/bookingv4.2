'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Loader2, Mail, Copy, Check } from 'lucide-react';

interface InviteTeamMemberFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteTeamMemberForm({ onClose, onSuccess }: InviteTeamMemberFormProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'agent'>('agent');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!email || !/\S+@\S+\.\S+/.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      const res = await fetch('/api/organizations/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invite');
      }

      setInviteLink(data.inviteLink);
    } catch (err: any) {
      console.error('Failed to send invite:', err);
      setError(err.message || 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-clio-navy/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-clio-gray-900 rounded-2xl w-full max-w-md border border-clio-gray-200 dark:border-clio-gray-800 shadow-strong overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-clio-gray-100 dark:border-clio-gray-800 bg-clio-gray-50/50 dark:bg-clio-gray-800/20">
          <h2 className="text-xl font-bold text-clio-gray-900 dark:text-white uppercase tracking-tight">Invite Team Member</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-clio-gray-400 hover:text-clio-gray-600 dark:hover:text-clio-gray-200" onClick={onClose} disabled={loading}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleInvite} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Invite Link Display */}
          {inviteLink && (
            <div className="p-5 bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 rounded-2xl space-y-4">
              <div className="flex items-start">
                <div className="p-2 bg-white dark:bg-clio-gray-950 rounded-lg shadow-sm mr-3">
                  <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-green-900 dark:text-green-400 uppercase tracking-tight">Invite Link Generated</p>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400/80 mt-0.5">
                    Share this link with {email} to join your team.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  value={inviteLink}
                  readOnly
                  className="text-xs font-mono bg-white dark:bg-clio-gray-950 border-green-200 dark:border-green-900/50"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0 border-green-200 dark:border-green-900/50 hover:bg-green-100 dark:hover:bg-green-900/30"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-green-600 dark:text-green-400" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {!inviteLink && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-bold text-clio-gray-500 uppercase tracking-widest ml-1">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="teammate@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-[10px] font-bold text-clio-gray-500 uppercase tracking-widest ml-1">Role & Permissions</Label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'agent')}
                  className="w-full h-12 px-4 bg-clio-gray-50 dark:bg-clio-gray-950 border border-clio-gray-200 dark:border-clio-gray-800 rounded-xl text-clio-gray-900 dark:text-white focus:ring-2 focus:ring-clio-blue/20 focus:border-clio-blue transition-all font-bold uppercase tracking-tight text-xs"
                  disabled={loading}
                >
                  <option value="agent">Agent - Team Member Access</option>
                  <option value="admin">Admin - Full Workspace Access</option>
                </select>
                <p className="text-[10px] font-medium text-clio-gray-400 uppercase tracking-tight ml-1">
                  You can change permissions anytime from settings.
                </p>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-clio-gray-100 dark:border-clio-gray-800">
            <Button type="button" variant="ghost" className="font-bold uppercase tracking-tight text-xs h-11 px-6" onClick={onClose} disabled={loading}>
              {inviteLink ? 'Close' : 'Cancel'}
            </Button>
            {!inviteLink && (
              <Button type="submit" className="font-bold uppercase tracking-tight text-xs h-11 px-8 rounded-xl shadow-lg shadow-clio-blue/20" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending Invite...
                  </>
                ) : (
                  'Send Invite'
                )}
              </Button>
            )}
            {inviteLink && (
              <Button
                type="button"
                className="font-bold uppercase tracking-tight text-xs h-11 px-10 rounded-xl"
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
              >
                Done
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
