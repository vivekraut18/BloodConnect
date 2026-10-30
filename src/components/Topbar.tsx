'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Bell,
  Search,
  AlertTriangle,
  ChevronDown,
  CheckCircle,
  Clock,
  User,
  ShieldCheck,
  Edit3,
  LogOut,
  Loader2,
  CheckCheck,
  ExternalLink,
  Droplets,
  Calendar,
  Info,
} from 'lucide-react';
import { useProfile } from './ProfileContext';
import { toast } from 'sonner';

interface TopbarProps {
  onMobileMenuToggle: () => void;
  sidebarCollapsed?: boolean;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

export default function Topbar({ onMobileMenuToggle }: TopbarProps) {
  const router = useRouter();
  const { profile } = useProfile();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const profileName = profile?.name || 'BloodConnect User';
  const isVerified = profile?.verificationStatus === 'verified';

  // Fetch notifications
  const fetchNotifications = async () => {
    setLoadingNotifs(true);
    setNotifError(null);
    try {
      const res = await fetch('/api/notifications?limit=15');
      if (res.ok) {
        const data = await res.json();
        if (data?.data) {
          setNotifications(data.data.notifications || []);
          setUnreadCount(data.data.unreadCount || 0);
        }
      } else {
        setNotifError('Could not load notifications');
      }
    } catch {
      setNotifError('Network error loading notifications');
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggleNotifs = () => {
    if (!notifOpen) {
      fetchNotifications();
    }
    setNotifOpen((prev) => !prev);
    setProfileMenuOpen(false);
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        toast.success('All notifications marked as read');
      }
    } catch {
      toast.error('Failed to mark notifications as read');
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    // Mark single as read if unread
    if (!notif.isRead) {
      try {
        await fetch(`/api/notifications/${notif.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true }),
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    }

    setNotifOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.success('Signed out successfully');
      router.push('/');
      router.refresh();
    } catch {
      router.push('/');
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'emergency':
        return <AlertTriangle size={15} className="text-emergency" />;
      case 'request':
        return <Droplets size={15} className="text-primary" />;
      case 'donation':
        return <CheckCircle size={15} className="text-success" />;
      case 'appointment':
        return <Calendar size={15} className="text-purple-500" />;
      default:
        return <Info size={15} className="text-muted-foreground" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const minutes = Math.floor(diffMs / (60 * 1000));
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <header className="h-14 bg-card border-b border-border flex items-center px-4 gap-3 flex-shrink-0 z-10">
      {/* Mobile menu toggle */}
      <button
        onClick={onMobileMenuToggle}
        className="lg:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      <div className="flex-1" />

      {/* Quick search */}
      <Link
        href="/find-blood-search"
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-border transition-colors"
      >
        <Search size={14} />
        <span>Find Blood</span>
        <span className="text-xs bg-background border border-border rounded px-1 py-0.5 font-mono">⌘K</span>
      </Link>

      {/* Notifications dropdown */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={handleToggleNotifs}
          className={`relative p-2 rounded-lg transition-colors ${
            notifOpen ? 'bg-muted text-foreground' : 'hover:bg-muted text-muted-foreground'
          }`}
          aria-label="Notifications"
          aria-expanded={notifOpen}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-emergency text-white text-[10px] font-bold flex items-center justify-center border-2 border-card">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden slide-up">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-xs bg-emergency text-white rounded-full px-2 py-0.5 font-bold">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                >
                  <CheckCheck size={13} />
                  Mark all as read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="max-h-80 overflow-y-auto scrollbar-thin divide-y divide-border">
              {loadingNotifs ? (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <Loader2 size={20} className="animate-spin text-primary" />
                  <span className="text-xs">Loading notifications…</span>
                </div>
              ) : notifError ? (
                <div className="p-6 text-center text-xs text-error">{notifError}</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground space-y-1.5">
                  <Bell size={24} className="mx-auto opacity-40 mb-2" />
                  <p className="text-sm font-semibold text-foreground">No notifications yet</p>
                  <p className="text-xs text-muted-foreground">
                    You will receive alerts for emergency requests and donation updates.
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={`notif-${n.id}`}
                    onClick={() => handleNotificationClick(n)}
                    className={`px-4 py-3 hover:bg-muted/60 cursor-pointer transition-colors ${
                      !n.isRead ? 'bg-primary-light/40 dark:bg-primary-light/10' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0 p-1.5 rounded-lg bg-card border border-border">
                        {getNotifIcon(n.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs font-bold truncate ${!n.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {n.title}
                          </p>
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        <p className="text-[11px] text-muted-foreground/80 mt-1 font-mono">
                          {formatTimeAgo(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 border-t border-border bg-muted/20 text-center">
              <Link
                href="/donor-dashboard?tab=overview"
                onClick={() => setNotifOpen(false)}
                className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1"
              >
                View Donor Dashboard
                <ExternalLink size={11} />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* User profile dropdown */}
      <div className="relative" ref={profileRef}>
        <button
          onClick={() => {
            setProfileMenuOpen((prev) => !prev);
            setNotifOpen(false);
          }}
          className={`flex items-center gap-2 p-1.5 rounded-xl transition-colors ${
            profileMenuOpen ? 'bg-muted' : 'hover:bg-muted'
          }`}
          aria-label="User Profile Menu"
          aria-expanded={profileMenuOpen}
        >
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {getInitials(profileName)}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-foreground leading-tight truncate max-w-[130px]">
              {profileName}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {isVerified ? 'Verified Donor' : 'Donor'}
            </p>
          </div>
          <ChevronDown
            size={14}
            className={`text-muted-foreground transition-transform duration-200 ${
              profileMenuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {profileMenuOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden slide-up p-1.5">
            {/* User summary header */}
            <div className="px-3 py-2.5 border-b border-border/80 mb-1">
              <p className="text-xs font-bold text-foreground truncate">{profileName}</p>
              <p className="text-[11px] text-muted-foreground truncate">{profile?.email || 'Authenticated Donor'}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[10px] font-bold text-emergency bg-emergency-bg border border-red-200 px-1.5 py-0.5 rounded">
                  {profile?.bloodGroup || 'B+'}
                </span>
                {isVerified ? (
                  <span className="text-[10px] text-success font-semibold flex items-center gap-1">
                    <ShieldCheck size={12} />
                    Verified
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">Pending Verification</span>
                )}
              </div>
            </div>

            {/* Menu options */}
            <div className="space-y-0.5">
              <Link
                href="/donor-dashboard?tab=profile"
                onClick={() => setProfileMenuOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-muted transition-colors text-left"
              >
                <User size={15} className="text-primary" />
                View Profile
              </Link>

              <Link
                href="/donor-dashboard?tab=profile&edit=true"
                onClick={() => setProfileMenuOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-muted transition-colors text-left"
              >
                <Edit3 size={15} className="text-primary" />
                Edit Profile
              </Link>

              <Link
                href="/donor-dashboard?tab=profile"
                onClick={() => setProfileMenuOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-muted transition-colors text-left"
              >
                <ShieldCheck size={15} className="text-success" />
                Profile & Verification
              </Link>
            </div>

            {/* Sign out */}
            <div className="border-t border-border/80 mt-1 pt-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-error hover:bg-error-bg transition-colors text-left"
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();
}