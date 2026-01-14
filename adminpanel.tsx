import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Ban, UserCheck, X, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const { profile } = useAuth();
  const [banUsername, setBanUsername] = useState('');
  const [banReason, setBanReason] = useState('');
  const [unbanUsername, setUnbanUsername] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBan = async () => {
    if (!banUsername.trim() || !profile) return;

    setIsProcessing(true);
    try {
      // Find user by display username
      const { data: targetUser, error: findError } = await supabase
        .from('profiles')
        .select('*')
        .eq('display_username', banUsername.trim())
        .single();

      if (findError || !targetUser) {
        toast.error('User not found');
        return;
      }

      if (targetUser.is_admin) {
        toast.error('Cannot ban an admin');
        return;
      }

      // Get a mock IP (in production, you'd track real IPs)
      const mockIp = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

      // Create ban record with reason
      await supabase.from('bans').insert({
        profile_id: targetUser.id,
        ip_address: mockIp,
        banned_by: profile.id,
        reason: banReason.trim() || null,
      });

      // Update profile and clear session token to force logout
      await supabase
        .from('profiles')
        .update({ is_banned: true, ban_ip: mockIp, session_token: null })
        .eq('id', targetUser.id);

      // Delete bug report conversations and their messages when banned
      const { data: bugReportConvos } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', targetUser.id)
        .eq('chat_type', 'report_bug');

      if (bugReportConvos && bugReportConvos.length > 0) {
        const convoIds = bugReportConvos.map(c => c.id);
        await supabase.from('messages').delete().in('conversation_id', convoIds);
        await supabase.from('conversations').delete().in('id', convoIds);
      }

      toast.success(`${banUsername} has been banned`);
      setBanUsername('');
      setBanReason('');
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnban = async () => {
    if (!unbanUsername.trim()) return;

    setIsProcessing(true);
    try {
      // Find user by display username
      const { data: targetUser, error: findError } = await supabase
        .from('profiles')
        .select('*')
        .eq('display_username', unbanUsername.trim())
        .single();

      if (findError || !targetUser) {
        toast.error('User not found');
        return;
      }

      // Remove ban records
      await supabase
        .from('bans')
        .delete()
        .eq('profile_id', targetUser.id);

      // Update profile
      await supabase
        .from('profiles')
        .update({ is_banned: false, ban_ip: null })
        .eq('id', targetUser.id);

      // Delete appeal conversations and their messages when unbanned
      const { data: appealConvos } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', targetUser.id)
        .eq('chat_type', 'appeal');

      if (appealConvos && appealConvos.length > 0) {
        const convoIds = appealConvos.map(c => c.id);
        await supabase.from('messages').delete().in('conversation_id', convoIds);
        await supabase.from('conversations').delete().in('id', convoIds);
      }

      toast.success(`${unbanUsername} has been unbanned`);
      setUnbanUsername('');
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error('Failed to unban user');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold neon-text">Admin Panel</h2>
              <p className="text-xs text-muted-foreground">User Management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Ban Section */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-destructive font-medium">
              <Ban className="w-4 h-4" />
              Ban User
            </h3>
            <input
              type="text"
              value={banUsername}
              onChange={(e) => setBanUsername(e.target.value)}
              placeholder="Enter username to ban"
              className="input-dark w-full"
            />
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Ban reason (optional)"
              className="input-dark w-full min-h-[80px] resize-none"
            />
            <button
              onClick={handleBan}
              disabled={isProcessing || !banUsername.trim()}
              className="w-full px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Ban className="w-4 h-4" /> Ban User</>}
            </button>
            <p className="text-xs text-muted-foreground">
              This will ban the user and prevent them from logging in
            </p>
          </div>

          {/* Unban Section */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-success font-medium">
              <UserCheck className="w-4 h-4" />
              Unban User
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={unbanUsername}
                onChange={(e) => setUnbanUsername(e.target.value)}
                placeholder="Enter username to unban"
                className="input-dark flex-1"
              />
              <button
                onClick={handleUnban}
                disabled={isProcessing || !unbanUsername.trim()}
                className="px-4 py-2 bg-success text-success-foreground rounded-lg font-medium hover:bg-success/90 transition-colors disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Unban'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              This will restore the user's access to the platform
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
