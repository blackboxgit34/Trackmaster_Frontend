import { NavLink, useParams, Navigate, useLocation } from 'react-router-dom';
import { User, Palette, Bell, Settings as FleetSettingsIcon, Users, Car, Fuel, FlaskConical, Puzzle } from 'lucide-react';
import { cn } from '@/lib/utils';

import ProfileSettings from '@/components/page/settings/ProfileSettings';
import AppearanceSettings from '@/components/page/settings/AppearanceSettings';
import NotificationSettings from '@/components/page/settings/NotificationSettings';
import FleetSettings from '@/components/page/settings/FleetSettings';
import UserManagement from '@/components/page/settings/UserManagement';
import VehicleManagement from '@/components/page/settings/VehicleManagement';
import CrewManagementSettings from '@/components/page/settings/CrewManagementSettings';
import FuelManagementSettings from '@/components/page/settings/FuelManagementSettings';
import TemporarySettings from '@/components/page/settings/TemporarySettings';
import AddonSettings from '@/components/page/settings/AddonSettings';
import NotFound from '@/components/page/NotFound';

const settingsNav = [
  { name: 'Profile', href: 'profile', icon: User, component: <ProfileSettings /> },
  { name: 'Appearance', href: 'appearance', icon: Palette, component: <AppearanceSettings /> },
  { name: 'Notifications', href: 'notifications', icon: Bell, component: <NotificationSettings /> },
  { name: 'Set Threshold', href: 'fleet', icon: FleetSettingsIcon, component: <FleetSettings /> },
  { name: 'User Management', href: 'users', icon: Users, component: <UserManagement /> },
  { name: 'Vehicle Management', href: 'vehicle', icon: Car, component: <VehicleManagement /> },
  { name: 'Crew Management', href: 'crew', icon: Users, component: <CrewManagementSettings /> },
  { name: 'Fuel Management', href: 'fuel', icon: Fuel, component: <FuelManagementSettings /> },
  { name: 'Temp Settings', href: 'temp', icon: FlaskConical, component: <TemporarySettings /> },
  { name: 'Addon Settings', href: 'addon-settings', icon: Puzzle, component: <AddonSettings /> },
];

const SettingsPage = () => {
  const { subpage } = useParams();
  const location = useLocation();

  if (!subpage) {
    return <Navigate to="/settings/profile" replace />;
  }

  const activeComponent = settingsNav.find(nav => nav.href === subpage)?.component;

  if (!activeComponent) {
    return <NotFound />;
  }

  return (
    <div className="p-6 h-full">
      <div className="flex flex-col lg:flex-row gap-6 h-full">
        <aside className="w-full lg:w-44 lg:shrink-0 lg:border-r lg:border-border/40 lg:pr-4">
          <h1 className="text-xl font-bold tracking-tight text-foreground mb-4">Settings</h1>
          <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
            {settingsNav.map((item) => {
              const isItemActive = location.pathname.startsWith(`/settings/${item.href}`);
              return (
                <NavLink
                  key={item.name}
                  to={`/settings/${item.href}`}
                  className={
                    cn(
                      'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
                      isItemActive
                        ? 'bg-accent text-accent-foreground font-semibold'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 min-w-0 overflow-y-auto">
          {activeComponent}
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;