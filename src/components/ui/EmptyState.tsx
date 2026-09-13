import React from 'react';
import { Droplets, Search, Bell, FileText, Calendar } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


type EmptyStateVariant = 'requests' | 'donors' | 'donations' | 'notifications' | 'search' | 'appointments';

interface EmptyStateProps {
  variant: EmptyStateVariant;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

const variantDefaults: Record<EmptyStateVariant, { Icon: React.ElementType; title: string; description: string }> = {
  requests: {
    Icon: Droplets,
    title: 'No blood requests yet',
    description: 'Active blood requests near you will appear here. Stay available to help save lives.',
  },
  donors: {
    Icon: Droplets,
    title: 'No matching donors found',
    description: 'No verified donors match this blood group in the selected radius. Try expanding the search area.',
  },
  donations: {
    Icon: FileText,
    title: 'No donation history',
    description: 'Your completed and confirmed donations will be recorded here by hospital staff.',
  },
  notifications: {
    Icon: Bell,
    title: 'No notifications',
    description: "You're all caught up. New alerts for nearby requests and updates will appear here.",
  },
  search: {
    Icon: Search,
    title: 'No results found',
    description: 'No blood banks or donors matched your search criteria. Try adjusting the blood group, location, or search radius.',
  },
  appointments: {
    Icon: Calendar,
    title: 'No upcoming appointments',
    description: 'Scheduled donation appointments will appear here once confirmed by a blood bank or hospital.',
  },
};

export default function EmptyState({ variant, title, description, action }: EmptyStateProps) {
  const { Icon, title: defTitle, description: defDesc } = variantDefaults[variant];
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon size={28} className="text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1.5">{title ?? defTitle}</h3>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">{description ?? defDesc}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}