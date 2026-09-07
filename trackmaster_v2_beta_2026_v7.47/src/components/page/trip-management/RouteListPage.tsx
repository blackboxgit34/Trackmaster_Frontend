import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrips } from '@/context/TripContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Plus,
  Trash2,
  Route,
  ArrowRight,
  Truck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function RouteListPage() {
  const { routes, trips, deleteRoute } = useTrips();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const navigate = useNavigate();
  const { toast } = useToast();

  const filteredRoutes = useMemo(() => {
    return routes.filter(
      (route) =>
        route.name.toLowerCase().includes(search.toLowerCase()) ||
        route.originName.toLowerCase().includes(search.toLowerCase()) ||
        route.destName.toLowerCase().includes(search.toLowerCase())
    );
  }, [routes, search]);

  const activeTripsCountByRoute = useMemo(() => {
    const counts: Record<string, number> = {};
    trips.forEach(t => {
      if (t.status === 'In Transit') {
        counts[t.routeId] = (counts[t.routeId] || 0) + 1;
      }
    });
    return counts;
  }, [trips]);

  const getActiveTripsCount = (routeId: string) => {
    return activeTripsCountByRoute[routeId] || 0;
  };

  const handleDelete = (id: string, name: string) => {
    deleteRoute(id);
    
    // Adjust pagination if the current page becomes empty
    const itemsRemaining = filteredRoutes.length - 1;
    if (itemsRemaining > 0 && page > 0 && itemsRemaining <= page * rowsPerPage) {
      setPage(page - 1);
    }
    
    toast({
      title: 'Route Deleted',
      description: `Route "${name}" has been removed.`,
      variant: 'destructive',
    });
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    setPage(0);
  };

  const paginatedData = filteredRoutes.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const totalPages = Math.ceil(filteredRoutes.length / rowsPerPage);
  const firstRowIndex = page * rowsPerPage + 1;
  const lastRowIndex = Math.min(
    (page + 1) * rowsPerPage,
    filteredRoutes.length
  );

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-xl font-bold text-foreground">
            Fleet Routes
          </CardTitle>
          <CardDescription>
            A list of all configured routes available for truck assignment.
          </CardDescription>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search routes..."
              value={search}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>
          <Button
            onClick={() => navigate('/trip-management/create-route')}
            className="flex items-center gap-2 shrink-0"
          >
            <Plus className="h-4 w-4" /> Create Route
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filteredRoutes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Route className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="font-semibold text-lg">No routes found</p>
            <p className="text-muted-foreground text-sm max-w-sm mt-1">
              {search ? 'Try adjusting your search keywords.' : 'Get started by creating your first transit route.'}
            </p>
            {!search && (
              <Button onClick={() => navigate('/trip-management/create-route')} className="mt-4" variant="outline">
                Create Route
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                  <TableHead className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Route Name
                  </TableHead>
                  <TableHead className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Origin / Destination
                  </TableHead>
                  <TableHead className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Distance
                  </TableHead>
                  <TableHead className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Est. Duration
                  </TableHead>
                  <TableHead className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Active Trips
                  </TableHead>
                  <TableHead className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((route) => {
                  const activeTrips = getActiveTripsCount(route.id);
                  return (
                    <TableRow key={route.id} className="bg-card hover:bg-muted/50 border-b">
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">
                        <div>{route.name}</div>
                        {route.consigneeName && (
                          <div className="text-xs text-muted-foreground font-normal mt-0.5">
                            Consignee: {route.consigneeName}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground font-medium">{route.originName}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-foreground font-medium">{route.destName}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          ({route.originCoords.lat.toFixed(4)}, {route.originCoords.lng.toFixed(4)}) → ({route.destCoords.lat.toFixed(4)}, {route.destCoords.lng.toFixed(4)})
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {route.distance} km
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {route.duration} hrs
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${
                          activeTrips > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-muted text-muted-foreground'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${activeTrips > 0 ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                          {activeTrips} active
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/trip-management/assign?routeId=${route.id}`)}
                          >
                            <Truck className="h-4 w-4 text-blue-500" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the route "{route.name}" and cancel all active trips on this route.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(route.id, route.name)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {filteredRoutes.length > 0 && (
        <CardFooter className="flex items-center justify-between py-3 px-6 border-t bg-card">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select
              value={String(rowsPerPage)}
              onValueChange={(value) => {
                setRowsPerPage(Number(value));
                setPage(0);
              }}
            >
              <SelectTrigger className="w-20 h-9 text-sm focus:ring-2 focus:ring-primary">
                <SelectValue placeholder={rowsPerPage} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {firstRowIndex}-{lastRowIndex} of {filteredRoutes.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent"
                onClick={() => setPage(0)}
                disabled={page === 0}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent"
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent"
                onClick={() => setPage(totalPages - 1)}
                disabled={page >= totalPages - 1}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
