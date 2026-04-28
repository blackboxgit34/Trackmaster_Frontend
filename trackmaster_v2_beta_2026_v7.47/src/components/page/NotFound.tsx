import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TriangleAlert } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <TriangleAlert className="h-16 w-16 text-destructive mb-4" />
      <h1 className="text-6xl font-bold text-foreground">404</h1>
      <h2 className="text-2xl font-semibold text-foreground mt-4">Page Not Found</h2>
      <p className="text-muted-foreground mt-2 max-w-md">
        Sorry, the page you are looking for does not exist. It might have been moved or deleted.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Go back to Dashboard</Link>
      </Button>
    </div>
  );
};

export default NotFound;