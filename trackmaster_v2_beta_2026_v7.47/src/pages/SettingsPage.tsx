import { NavLink, useParams, Navigate } from 'react-router-dom';
import { User, Palette, Bell, Settings as FleetSettingsIcon, Users, Car, Fuel } from 'lucide-react';
import { cn } from '@/lib/utils';

import ProfileSettings from '@/components/page/settings/ProfileSettings';
import AppearanceSettings from '@/components/page/settings/AppearanceSettings';
import NotificationSettings from '@/components/page/settings/NotificationSettings';
import FleetSettings from '@/components/page/settings/FleetSettings';
import UserManagement from '@/components/page/settings/UserManagement';
import VehicleManagement from '@/components/page/settings/VehicleManagement';
import FuelManagementSettings from '@/components/page/settings/FuelManagementSettings';
import NotFound from '@/components/page/NotFound';

const settingsNav = [
  { name: 'Profile', href: 'profile', icon: User, component: <ProfileSettings /> },
  { name: 'Appearance', href: 'appearance', icon: Palette, component: <AppearanceSettings /> },
  { name: 'Notifications', href: 'notifications', icon: Bell, component: <NotificationSettings /> },
  { name: 'Set Threshold', href: 'fleet', icon: FleetSettingsIcon, component: <FleetSettings /> },
  { name: 'User Management', href: 'users', icon: Users, component: <UserManagement /> },
  { name: 'Vehicle Management', href: 'vehicle', icon: Car, component: <VehicleManagement /> },
  { name: 'Fuel Management', href: 'fuel', icon: Fuel, component: <FuelManagementSettings /> },
];

const SettingsPage = () => {
  const { subpage } = useParams();

  if (!subpage) {
    return <Navigate to="/settings/profile" replace />;
  }

  const activeComponent = settingsNav.find(nav => nav.href === subpage)?.component;

  if (!activeComponent) {
    return <NotFound />;
  }

  return (
    <div className="p-6 h-full">
      <div className="flex flex-col lg:flex-row gap-8 h-full">
        <aside className="w-full lg:w-56 lg:flex-shrink-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-6">Settings</h1>
          <nav className="flex flex-row lg:flex-col gap-1">
            {settingsNav.map((item) => (
              <NavLink
                key={item.name}
                to={`/settings/${item.href}`}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="flex-1">
          {activeComponent}
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;