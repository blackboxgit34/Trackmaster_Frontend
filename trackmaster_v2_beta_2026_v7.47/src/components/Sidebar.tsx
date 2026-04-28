import {
  ChevronRight,
  HelpCircle,
  Moon,
  Sun,
  Bell,
  MoreHorizontal,
  PanelLeftClose,
  PanelRightOpen,
  type LucideIcon,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { menuItems } from '@/data/menu';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { useTheme } from './theme-provider';
import Logo from './Logo';

interface MenuItem {
  title: string;
  icon: LucideIcon;
  href?: string;
  children?: MenuItem[];
}

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

const Sidebar = ({ isCollapsed, setIsCollapsed }: SidebarProps) => {
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  const renderMenuItem = (item: MenuItem) => {
    const hasChildren = item.children && item.children.length > 0;
    const isChildActive = hasChildren && item.children?.some((child: MenuItem) => {
      if (child.children && child.children.length > 0) {
        return child.children.some(grandchild => grandchild.href && location.pathname.startsWith(grandchild.href));
      }
      return child.href && location.pathname.startsWith(child.href);
    });

    if (hasChildren) {
      return (
        <HoverCard key={item.title} openDelay={100} closeDelay={100}>
          <HoverCardTrigger asChild>
            <div
              className={cn(
                "flex items-center rounded-md transition-all group text-sm cursor-pointer",
                "hover:opacity-100 focus:opacity-100",
                isChildActive ? "opacity-100 font-semibold" : "opacity-70 font-medium",
                isCollapsed
                  ? "w-full h-12 justify-center"
                  : "w-full justify-between px-3 py-2"
              )}
            >
              <div className={cn("flex items-center", !isCollapsed && "gap-3")}>
                <item.icon className="h-5 w-5" />
                {!isCollapsed && <span>{item.title}</span>}
              </div>
              {!isCollapsed && (
                <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
              )}
            </div>
          </HoverCardTrigger>
          <HoverCardContent
            side="right"
            align="start"
            sideOffset={isCollapsed ? 5 : 10}
            className="w-64 p-2 z-[60]"
          >
            <div className="flex flex-col">
              <p className="px-2 py-1.5 text-sm font-semibold">{item.title}</p>
              {item.children?.map((child: MenuItem) => {
                const hasGrandChildren = child.children && child.children.length > 0;
                const isGrandChildActive = hasGrandChildren && child.children?.some(grandchild => grandchild.href && location.pathname.startsWith(grandchild.href));

                if (hasGrandChildren) {
                  return (
                    <HoverCard key={child.title} openDelay={100} closeDelay={100}>
                      <HoverCardTrigger asChild>
                        <div className={cn(
                          'flex items-center justify-between w-full select-none rounded-md p-3 text-sm transition-colors cursor-pointer',
                          'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
                          isGrandChildActive && 'bg-accent text-accent-foreground'
                        )}>
                          <div className="flex items-center gap-2">
                            {child.icon && <child.icon className="h-4 w-4" />}
                            <span>{child.title}</span>
                          </div>
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent side="right" align="start" sideOffset={5} className="w-64 p-2 z-[60]">
                        <div className="flex flex-col">
                          <p className="px-2 py-1.5 text-sm font-semibold">{child.title}</p>
                          {child.children?.map((grandChild: MenuItem) => (
                            <NavLink
                              key={grandChild.title}
                              to={grandChild.href || '#'}
                              className={({ isActive }) => cn(
                                "flex items-center gap-2 w-full select-none rounded-md p-3 text-sm transition-colors",
                                "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                                isActive && "bg-accent text-accent-foreground"
                              )}
                            >
                              {grandChild.icon && <grandChild.icon className="h-4 w-4" />}
                              <span>{grandChild.title}</span>
                            </NavLink>
                          ))}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  );
                }

                return (
                  <NavLink
                    key={child.title}
                    to={child.href || '#'}
                    className={({ isActive }) => cn(
                      "flex items-center gap-2 w-full select-none rounded-md p-3 text-sm transition-colors",
                      "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                      isActive && "bg-accent text-accent-foreground"
                    )}
                  >
                    {child.icon && <child.icon className="h-4 w-4" />}
                    <span>{child.title}</span>
                  </NavLink>
                );
              })}
            </div>
          </HoverCardContent>
        </HoverCard>
      );
    }

    return (
      <NavLink
        key={item.title}
        to={item.href || '#'}
        end={item.href === '/'}
        className={({ isActive }) => cn(
          "flex items-center rounded-md transition-all text-sm",
          "hover:opacity-100",
          isActive ? "opacity-100 font-semibold" : "opacity-70 font-medium",
          isCollapsed
            ? "w-full h-12 justify-center"
            : "w-full gap-3 px-3 py-2"
        )}
      >
        <item.icon className="h-5 w-5" />
        {!isCollapsed && <span>{item.title}</span>}
      </NavLink>
    );
  };

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-white/10 sticky top-0 h-screen transition-all duration-300 ease-in-out z-40",
        "bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center h-16 border-b border-white/10 px-4",
          isCollapsed ? "justify-center" : "justify-between"
        )}
      >
        {!isCollapsed && (
          <a href="#" className="flex items-center">
            <Logo />
          </a>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-current opacity-70 hover:opacity-100 hover:bg-white/10"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <PanelRightOpen className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="flex flex-col items-start w-full px-2 gap-1">
          {menuItems.map((item) => renderMenuItem(item as MenuItem))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto p-4 border-t border-white/10">
        {!isCollapsed && (
          <div className="bg-white/10 rounded-lg p-3 mb-4 cursor-pointer hover:bg-white/20">
            <h3 className="font-semibold text-yellow-400">Get a plan</h3>
            <p className="text-sm opacity-80 mt-1">Unlock more features</p>
          </div>
        )}
        <div
          className={cn(
            "flex items-center",
            isCollapsed ? "flex-col gap-y-2" : "justify-between"
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="text-current opacity-70 hover:opacity-100 hover:bg-white/10 rounded-full"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-current opacity-70 hover:opacity-100 hover:bg-white/10 rounded-full"
            onClick={(e) => setTheme(theme === "dark" ? "light" : "dark", e)}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="relative text-current opacity-70 hover:opacity-100 hover:bg-white/10 rounded-full"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 flex items-center justify-center h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] font-bold">
              3
            </span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-current opacity-70 hover:opacity-100 hover:bg-white/10 rounded-full"
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;