import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ServerCrash } from 'lucide-react';

const Error500 = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <ServerCrash className="h-16 w-16 text-destructive mb-4" />
      <h1 className="text-6xl font-bold text-foreground">500</h1>
      <h2 className="text-2xl font-semibold text-foreground mt-4">Internal Server Error</h2>
      <p className="text-muted-foreground mt-2 max-w-md">
        Oops! Something went wrong on our end. We are working to fix the problem. Please try again later.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Go back to Dashboard</Link>
      </Button>
    </div>
  );
};

export default Error500;