import React from 'react';
import { Search, Bell, User, Settings, Sun, Moon, GaugeCircle, MapPin, Wrench, LogOut, Palette, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from './ui/badge';
import { useTheme } from './theme-provider';
import TopNav from './TopNav';
import { cn } from '@/lib/utils';
import Logo from './Logo';
import { useUser } from '@/context/UserContext';
interface User {
  custId: number;
  name: string;
  role: string;
  userName: string;
  isStaffMember: boolean;
}
type HeaderProps = {
  //setIsCustomizationSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>; previous
  setIsCustomizationSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onSearchChange: (value: string) => void; // neha k
};

// const Header = ({ setIsCustomizationSidebarOpen }: HeaderProps) => {previous
const Header = ({ setIsCustomizationSidebarOpen ,onSearchChange,}: HeaderProps) => {
// neha k
 const { theme, setTheme, menuPosition } = useTheme();
 const { user, logout } = useUser();
 const navigate = useNavigate();
  const { updateUser } = useUser();

  const handleGoBack = () => {
    updateUser({
      isStaffMember: true
    });
    navigate("/select-customer");
  };
  const canGoBack = localStorage.getItem("AccessToGoBackToCustomerSelect") === "true";
 return (
    <header className={cn(
      "sticky top-0 z-30 bg-card",
      menuPosition === 'sidebar' && 'border-b'
    )}>
      <div className="flex items-center justify-between h-14 px-6">
        {menuPosition === 'sidebar' ? (
          <div>
            {/* This space is intentionally left blank. The title is now below the header. */}
          </div>
        ) : (
          <a href="#" className="flex items-center">
            <Logo />
          </a>
        )}
        <div className="flex items-center gap-2">
          {canGoBack && (
            <button
              onClick={handleGoBack}
              className="h-8 px-3 flex items-center gap-2 bg-gray-200 hover:bg-gray-300 rounded"
            >
              <Users className="h-4 w-4" />
              Change Customer
            </button>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            {/* {<Input placeholder="Search vehicles, reports..." className="pl-10 w-64" />} */}
            <Input placeholder="Search vehicles, reports..." className="pl-10 w-64" onChange={(e) => onSearchChange(e.target.value)} />
            {/*  CHANGE 3: controlled input + send value to parent  neha k */}
          </div>

          <Button variant="ghost" size="icon" onClick={() => setIsCustomizationSidebarOpen(true)}>
            <Palette className="h-5 w-5" />
            <span className="sr-only">Customize Theme</span>
          </Button>

          <Button variant="ghost" size="icon" onClick={(e) => setTheme(theme === 'dark' ? 'light' : 'dark', e)}>
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span className="sr-only">Toggle theme</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 justify-center rounded-full p-0 text-xs">3</Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex gap-3">
                <div className="bg-red-500/10 text-red-500 p-2 rounded-full"><GaugeCircle className="h-5 w-5" /></div>
                <div>
                  <p className="font-semibold">Overspeed Alert</p>
                  <p className="text-xs text-muted-foreground">Vehicle MH-12-AB-1234 exceeded speed limit.</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex gap-3">
                <div className="bg-yellow-500/10 text-yellow-500 p-2 rounded-full"><MapPin className="h-5 w-5" /></div>
                <div>
                  <p className="font-semibold">Geofence Entry</p>
                  <p className="text-xs text-muted-foreground">Vehicle KA-01-CD-5678 entered Mumbai.</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex gap-3">
                <div className="bg-blue-500/10 text-blue-500 p-2 rounded-full"><Wrench className="h-5 w-5" /></div>
                <div>
                  <p className="font-semibold">Service Due</p>
                  <p className="text-xs text-muted-foreground">Service for DL-03-EF-9012 is due tomorrow.</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="justify-center">
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <User className="h-5 w-5" />
                <div>
                  <p className="text-sm font-semibold">{user?.name || 'Guest'}</p>
                  <p className="text-xs text-muted-foreground">{user?.role || 'User'}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {menuPosition === 'header' && (<TopNav />)}
    </header>
  );
};

export default Header;