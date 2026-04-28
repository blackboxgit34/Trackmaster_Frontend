import { menuItems } from '@/data/menu';
import { NavLink, useLocation } from 'react-router-dom';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const TopNav = () => {
  const location = useLocation();

  return (
    <>
      <nav
        className={cn(
          'h-14 flex items-center justify-center px-4 border-t',
          'bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]'
        )}
      >
        <div className="flex items-center gap-1">
          {menuItems.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isChildActive =
              hasChildren &&
              item.children.some((child) => {
                if (child.children && child.children.length > 0) {
                  return child.children.some(grandchild => grandchild.href && location.pathname.startsWith(grandchild.href));
                }
                return child.href && location.pathname.startsWith(child.href);
              });

            if (hasChildren) {
              return (
                <HoverCard key={item.title} openDelay={100} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        'flex items-center gap-1 text-sm font-medium h-9 px-4 py-2 hover:bg-white/10 hover:text-white focus:bg-white/10 data-[active]:bg-white/10 data-[state=open]:bg-white/10',
                        isChildActive && 'bg-white/10'
                      )}
                    >
                      {item.icon && <item.icon className="h-4 w-4" />}
                      <span>{item.title}</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent
                    align="start"
                    className="w-64 p-1"
                    sideOffset={10}
                  >
                    <div className="flex flex-col">
                      {item.children?.map((child) => {
                        const hasGrandChildren = child.children && child.children.length > 0;
                        const isGrandChildActive = hasGrandChildren && child.children.some(grandchild => grandchild.href && location.pathname.startsWith(grandchild.href));

                        if (hasGrandChildren) {
                          return (
                            <HoverCard key={child.title} openDelay={100} closeDelay={100}>
                              <HoverCardTrigger asChild>
                                <div className={cn(
                                  'w-full justify-between flex items-center gap-3 cursor-pointer rounded-md p-2 text-sm',
                                  'hover:bg-accent hover:text-accent-foreground',
                                  isGrandChildActive && 'bg-accent text-accent-foreground'
                                )}>
                                  <div className="flex items-center gap-3">
                                    {child.icon && (
                                      <child.icon className={cn("h-4 w-4", isGrandChildActive ? "text-accent-foreground" : "text-muted-foreground")} />
                                    )}
                                    <span>{child.title}</span>
                                  </div>
                                  <ChevronRight className="h-4 w-4" />
                                </div>
                              </HoverCardTrigger>
                              <HoverCardContent side="right" align="start" className="w-64 p-1" sideOffset={5}>
                                <div className="flex flex-col">
                                  {child.children?.map((grandChild) => (
                                    <NavLink
                                      to={grandChild.href || '#'}
                                      key={grandChild.title}
                                      className={({ isActive }) => cn(
                                        'w-full justify-start flex items-center gap-3 cursor-pointer rounded-md p-2 text-sm',
                                        'hover:bg-accent hover:text-accent-foreground',
                                        isActive && 'bg-accent text-accent-foreground'
                                      )}
                                    >
                                      {({ isActive }) => (
                                        <>
                                          {grandChild.icon && (
                                            <grandChild.icon className={cn("h-4 w-4", isActive ? "text-accent-foreground" : "text-muted-foreground")} />
                                          )}
                                          <span>{grandChild.title}</span>
                                        </>
                                      )}
                                    </NavLink>
                                  ))}
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                          );
                        }

                        return (
                          <NavLink
                            to={child.href || '#'}
                            key={child.title}
                            className={({ isActive }) => cn(
                              'w-full justify-start flex items-center gap-3 cursor-pointer rounded-md p-2 text-sm',
                              'hover:bg-accent hover:text-accent-foreground',
                              isActive && 'bg-accent text-accent-foreground'
                            )}
                          >
                            {({ isActive }) => (
                              <>
                                {child.icon && (
                                  <child.icon className={cn("h-4 w-4", isActive ? "text-accent-foreground" : "text-muted-foreground")} />
                                )}
                                <span>{child.title}</span>
                              </>
                            )}
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
                  'flex items-center gap-2 text-sm font-medium h-9 px-4 py-2 rounded-md',
                  'hover:bg-white/10 hover:text-white focus:bg-white/10',
                  isActive && 'bg-white/10'
                )}
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                {item.title}
              </NavLink>
            );
          })}
        </div>
      </nav>
      <div className="h-[3px] bg-brand-orange shadow-[0_4px_12px_-5px_rgba(249,115,22,0.7)]" />
    </>
  );
};

export default TopNav;