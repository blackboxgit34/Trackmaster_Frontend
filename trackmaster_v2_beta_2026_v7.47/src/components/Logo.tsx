import { cn } from '@/lib/utils';
import logoSrc from '@/assets/images/logo.svg';

const Logo = ({ className }: { className?: string }) => {
  return (
    <img
      src={logoSrc}
      alt="TrackMaster Logo"
      className={cn("h-8 w-auto", className)}
    />
  );
};

export default Logo;
