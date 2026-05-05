import { useState } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { dashboardItems } from '@/data/mockData';
import CustomizationSidebar from '@/components/CustomizationSidebar';
import { useTheme } from '@/components/theme-provider';
import DashboardTabs from '@/components/DashboardTabs';
import Reports from '@/components/page/Reports';
import Alerts from '@/components/page/Alerts';
import VehicleReports from '@/components/page/VehicleReports';
import MyBills from '@/components/page/MyBills';
import { useUser } from '@/context/UserContext';
import LoginPage from '@/components/page/Login';
import NotFound from '@/components/page/NotFound';
import Error500 from '@/components/page/Error500';
import LiveStatus from '@/components/page/LiveStatus';
import VehicleOnMap from '@/components/page/VehicleOnMap';
import RoutePlayback from '@/components/page/RoutePlayback';
import Geofencing from '@/components/page/Geofencing';
import SettingsPage from '@/pages/SettingsPage';
import AddonsPage from '@/pages/AddonsPage';
import TripDistanceReportsPage from '@/pages/TripDistanceReportsPage';
import TimeActivityReportsPage from '@/pages/TimeActivityReportsPage';
import SpeedDrivingReportsPage from '@/pages/SpeedDrivingReportsPage';
import VehicleStatusHealthReportsPage from '@/pages/VehicleStatusHealthReportsPage';
import LocationZoneReportsPage from '@/pages/LocationZoneReportsPage';
import OperationalCrewReportsPage from '@/pages/OperationalCrewReportsPage';
import CommunicationAlertsReportsPage from '@/pages/CommunicationAlertsReportsPage';
import SummaryManagementReportsPage from '@/pages/SummaryManagementReportsPage';
import CustomReport from '@/components/page/CustomReport';
import SelectCustomerPage from '@/pages/SelectCustomerPage';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';

function AppLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCustomizationEnabled, setIsCustomizationEnabled] = useState(false);
  const [isCustomizationSidebarOpen, setIsCustomizationSidebarOpen] = useState(false);
  const { menuPosition } = useTheme();
  const [hiddenWidgetIds, setHiddenWidgetIds] = useState<string[]>([]);
  const location = useLocation();
 

   // =========================
  // ✅ CHANGE 1: SEARCH STATE ADDED HERE (GLOBAL SOURCE) neha k
  // =========================
  const [search, setSearch] = useState("");
  const isMapPage = location.pathname === '/vehicle-status/on-map' || location.pathname === '/vehicle-status/route-playback';
  const handleShowWidget = (widgetId: string) => {
    setHiddenWidgetIds((prev) => prev.filter((id) => id !== widgetId));
  };

  return (
    <div className="flex h-screen w-full bg-background">
      {menuPosition === 'sidebar' && (
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
      )}
      <div className="flex flex-col flex-1 min-w-0">
        {/* <Header
          setIsCustomizationSidebarOpen={setIsCustomizationSidebarOpen}
        /> */}

        {/* =========================
            ✅ CHANGE 2: PASS SEARCH HANDLER TO HEADER neha k
           ========================= */}
        <Header
          setIsCustomizationSidebarOpen={setIsCustomizationSidebarOpen}
          onSearchChange={setSearch}   // 👈 NEW
        />
        <main className={cn("flex-1 relative", isMapPage ? "overflow-hidden" : "overflow-y-auto")}>

        {/* <Outlet /> */}
        {/* =========================
              ✅ CHANGE 3: PASS SEARCH TO ALL PAGES neha k
             ========================= */}
        <Outlet context={{ search }} />   {/* 👈 NEW */}
        </main>
      </div>
      <CustomizationSidebar
        isOpen={isCustomizationSidebarOpen}
        onOpenChange={setIsCustomizationSidebarOpen}
        isCustomizationEnabled={isCustomizationEnabled}
        setIsCustomizationEnabled={setIsCustomizationEnabled}
        hiddenWidgetIds={hiddenWidgetIds}
        onShowWidget={handleShowWidget}
        allItems={dashboardItems}
      />
      <Toaster />
    </div>
  );
}
// This component protects routes that require authentication.
function ProtectedRoutes() {
  const { isAuthenticated, isStaffMember } = useUser();

  // If the user is not authenticated, redirect them to the login page.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isStaffMember && location.pathname !== "/select-customer") {
    return <Navigate to="/select-customer" replace />;
  }
  // If they are authenticated, render the main application layout.
  // The nested routes will be rendered inside the <Outlet /> of AppLayout.
  return <AppLayout />;
}

export default function AppRoutes() {
  const { isAuthenticated } = useUser();
  return (
    <Routes>
      {/* Public Route: Login Page */}
      {/* If the user is already logged in, navigating to /login will redirect them to the dashboard. */}
      <Route
        path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route path="/select-customer" element={<SelectCustomerPage />} />
      {/* Protected Routes Wrapper */}
      {/* All routes inside this wrapper require authentication. */}
      <Route element={<ProtectedRoutes />}>
        <Route path="/" element={<DashboardTabs />} />
        <Route path="/vehicle-status/live" element={<LiveStatus />} />
        <Route path="/vehicle-status/on-map" element={<VehicleOnMap />} />
        <Route path="/vehicle-status/route-playback" element={<RoutePlayback />} />
        <Route path="/reports/consolidated" element={<Navigate to="/reports/consolidated/consolidatedreport" replace />} />
        <Route path="/reports/consolidated/:subpage" element={<Reports />} />
        <Route path="/reports/vehicle" element={<Navigate to="/reports/vehicle/working-hour" replace />} />
        <Route path="/reports/vehicle/:subpage" element={<VehicleReports />} />
        <Route path="/reports/summary-management" element={<Navigate to="/reports/summary-management/daily-summary" replace />} />
        <Route path="/reports/summary-management/:subpage" element={<SummaryManagementReportsPage />} />
        <Route path="/reports/trip-distance" element={<Navigate to="/reports/trip-distance/distance" replace />} />
        <Route path="/reports/trip-distance/:subpage" element={<TripDistanceReportsPage />} />
        <Route path="/reports/time-activity" element={<Navigate to="/reports/time-activity/stoppage-analysis" replace />} />
        <Route path="/reports/time-activity/:subpage" element={<TimeActivityReportsPage />} />
        <Route path="/reports/speed-driving" element={<Navigate to="/reports/speed-driving/speed-analysis" replace />} />
        <Route path="/reports/speed-driving/:subpage" element={<SpeedDrivingReportsPage />} />
        <Route path="/reports/vehicle-status-health" element={<Navigate to="/reports/vehicle-status-health/vehicle-status" replace />} />
        <Route path="/reports/vehicle-status-health/:subpage" element={<VehicleStatusHealthReportsPage />} />
        <Route path="/reports/location-zone" element={<Navigate to="/reports/location-zone/entry-exit-report" replace />} />
        <Route path="/reports/location-zone/:subpage" element={<LocationZoneReportsPage />} />
        <Route path="/reports/operational-crew" element={<Navigate to="/reports/operational-crew/crew-report" replace />} />
        <Route path="/reports/operational-crew/:subpage" element={<OperationalCrewReportsPage />} />
        <Route path="/reports/communication-alerts" element={<Navigate to="/reports/communication-alerts/sms-notification-report" replace />} />
        <Route path="/reports/communication-alerts/:subpage" element={<CommunicationAlertsReportsPage />} />
        <Route path="/reports/custom-report" element={<Navigate to="/reports/custom-report/create" replace />} />
        <Route path="/reports/custom-report/:subpage" element={<CustomReport />} />
        <Route path="/geofencing" element={<Navigate to="/geofencing/manage" replace />} />
        <Route path="/geofencing/:subpage" element={<Geofencing />} />
        <Route path="/alerts" element={<Navigate to="/alerts/high-rpm" replace />} />
        <Route path="/alerts/:subpage" element={<Alerts />} />
        <Route path="/bills" element={<Navigate to="/bills/account-summary" replace />} />
        <Route path="/bills/:subpage" element={<MyBills />} />
        <Route path="/settings" element={<Navigate to="/settings/profile" replace />} />
        <Route path="/settings/:subpage" element={<SettingsPage />} />
        <Route path="/addons" element={<Navigate to="/addons/fuel-reports/fuel-analysis" replace />} />
        <Route path="/addons/fuel-reports/:reportType" element={<AddonsPage />} />
        <Route path="/addons/:subpage" element={<AddonsPage />} />

        <Route path="/500" element={<Error500 />} />

        {/* This is the catch-all route for any invalid paths when the user is logged in. */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}