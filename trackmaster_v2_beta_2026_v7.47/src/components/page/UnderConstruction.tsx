import { Wrench } from 'lucide-react';

const UnderConstruction = ({ pageName }: { pageName: string }) => {
  return (
    <div className="flex flex-col items-center justify-center h-96 rounded-lg border border-dashed shadow-sm bg-card">
      <div className="text-center p-8">
        <Wrench className="mx-auto h-12 w-12 text-primary" />
        <h2 className="mt-6 text-2xl font-semibold">{pageName}</h2>
        <p className="mt-2 text-muted-foreground">
          This page is currently under construction and will be available soon.
        </p>
      </div>
    </div>
  );
};

export default UnderConstruction;