import {
  LayoutDashboard,
  Car,
  Map,
  Milestone,
  FileText,
  MapPin,
  Bell,
  Settings,
  CreditCard,
  Puzzle,
  Fuel,
  Thermometer,
  AirVent,
  Clock,
  Box,
  ShieldAlert,
  ArrowUpCircle,
  BarChart,
  Camera,
  Radio,
  Video,
  Gauge,
  Activity,
  Users,
  MessageSquare,
  ClipboardList,
  PlusCircle,
} from 'lucide-react';

export const menuItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/',
  },
  {
    title: 'Vehicle Status',
    icon: Car,
    children: [
      { title: 'Live Status', icon: Map, href: '/vehicle-status/live' },
      { title: 'Vehicle On Map', icon: MapPin, href: '/vehicle-status/on-map' },
      { title: 'Route Playback', icon: Milestone, href: '/vehicle-status/route-playback' },
    ],
  },
  {
    title: 'Reports',
    icon: FileText,
    children: [
      {
        title: 'Trip & Distance Reports',
        icon: Milestone,
        children: [
          { title: 'Distance Report', icon: FileText, href: '/reports/trip-distance/distance' },
          { title: 'Trip Report', icon: FileText, href: '/reports/trip-distance/trip-report' },
          { title: 'Monthly Day-Wise Distance Report', icon: FileText, href: '/reports/trip-distance/monthly-day-wise' },
        ],
      },
      {
        title: 'Time & Activity Analysis',
        icon: Clock,
        children: [
          { title: 'Stoppage Analysis', icon: FileText, href: '/reports/time-activity/stoppage-analysis' },
          { title: 'Idling Analysis', icon: FileText, href: '/reports/time-activity/idling-analysis' },
          { title: 'Ignition On/Off Analysis', icon: FileText, href: '/reports/time-activity/ignition-on-off-analysis' },
          { title: 'Combined Trip Report', icon: FileText, href: '/reports/time-activity/combined-trip-report' },
        ],
      },
      {
        title: 'Speed & Driving Behavior',
        icon: Gauge,
        children: [
          { title: 'Speed Report', icon: FileText, href: '/reports/speed-driving/speed-analysis' },
        ],
      },
      {
        title: 'Vehicle Status & Health',
        icon: Activity,
        children: [
          { title: 'Vehicle Status Report', icon: FileText, href: '/reports/vehicle-status-health/vehicle-status' },
          { title: 'Battery Disconnection Report', icon: FileText, href: '/reports/vehicle-status-health/battery-disconnection' },
        ],
      },
      {
        title: 'Location & Zone Reports',
        icon: MapPin,
        children: [
          { title: 'Entry / Exit Report', icon: FileText, href: '/reports/location-zone/entry-exit-report' },
          { title: 'Exit / Entry Report', icon: FileText, href: '/reports/location-zone/exit-entry-report' },
        ],
      },
      {
        title: 'Operational & Crew Reports',
        icon: Users,
        children: [
          { title: 'Crew Report', icon: FileText, href: '/reports/operational-crew/crew-report' },
        ],
      },
      {
        title: 'Communication & Alerts',
        icon: MessageSquare,
        children: [
          { title: 'SMS & Notification Report', icon: FileText, href: '/reports/communication-alerts/sms-notification-report' },
        ],
      },
      {
        title: 'Custom Report',
        icon: ClipboardList,
        children: [
          { title: 'Create Report', icon: PlusCircle, href: '/reports/custom-report/create' },
          { title: 'My Templates', icon: FileText, href: '/reports/custom-report/templates' },
        ]
      },
      {
        title: 'Consolidated Reports',
        icon: FileText,
        children: [
          { title: 'Consolidated Report', icon: FileText, href: '/reports/consolidated/consolidatedreport' },
          { title: 'Monthly Report', icon: FileText, href: '/reports/consolidated/monthlyreport' },
          { title: 'Day wise report', icon: FileText, href: '/reports/consolidated/daywisereport' },
        ],
      },
    ],
  },
  {
    title: 'Geofencing',
    icon: MapPin,
    children: [
      { title: 'Create Fence', icon: MapPin, href: '/geofencing/create' },
      { title: 'Manage Fence', icon: MapPin, href: '/geofencing/manage' },
      { title: 'Geofence Violations', icon: MapPin, href: '/geofencing/violations' },
      { title: 'Create POI', icon: MapPin, href: '/geofencing/add-poi' },
      { title: 'Manage POI', icon: MapPin, href: '/geofencing/manage-poi' },
    ],
  },
  {
    title: 'Alerts',
    icon: Bell,
    href: '/alerts/high-rpm',
  },
  {
    title: 'My Bills',
    icon: CreditCard,
    children: [
      { title: 'Account Summary', icon: FileText, href: '/bills/account-summary' },
      { title: 'Old Account Summary', icon: FileText, href: '/bills/old-account-summary' },
      { title: 'Payment Options', icon: CreditCard, href: '/bills/payment-options' },
      { title: 'Buy SMS', icon: MessageSquare, href: '/bills/buy-sms' },
      { title: 'Whatsapp Credits', icon: MessageSquare, href: '/bills/buy-whatsapp' },
      { title: 'Account Summary Custom', icon: FileText, href: '/bills/account-summary-custom' },
    ],
  },
  {
    title: 'Settings',
    icon: Settings,
    href: '/settings',
  },
  {
    title: 'Addons',
    icon: Puzzle,
    children: [
      {
        title: 'Fuel Reports',
        icon: Fuel,
        children: [
          { title: 'Fuel Analysis', icon: FileText, href: '/addons/fuel-reports/fuel-analysis' },
          { title: 'Fuel Graphical Report', icon: FileText, href: '/addons/fuel-reports/graphical-report' },
          { title: 'Fuel Filling Report', icon: FileText, href: '/addons/fuel-reports/filling-report' },
          { title: 'Fuel Theft Report', icon: FileText, href: '/addons/fuel-reports/theft-report' },
          { title: 'Disconnection Report', icon: FileText, href: '/addons/fuel-reports/disconnection-report' },
          { title: 'Dirt Error Report', icon: FileText, href: '/addons/fuel-reports/dirt-error-report' },
          { title: 'Consolidated Report', icon: FileText, href: '/addons/fuel-reports/consolidated-report' },
          { title: 'Fuel Consumption Playback', icon: FileText, href: '/addons/fuel-reports/consumption-timeline' },
        ],
      },
      { title: 'Refrigerator Temp.', icon: Thermometer, href: '/addons/refrigerator-temp' },
      { title: 'AC On/Off', icon: AirVent, href: '/addons/ac-on-off' },
      { title: 'Engine Working Hours', icon: Clock, href: '/addons/engine-working-hours' },
      { title: 'Thresher Working Hours', icon: Clock, href: '/addons/thresher-working-hours' },
      { title: 'Door Report', icon: FileText, href: '/addons/door-report' },
      { title: 'Lid Report', icon: Box, href: '/addons/lid-report' },
      { title: 'Panic Report', icon: ShieldAlert, href: '/addons/panic-report' },
      { title: 'Dumper Tilt Report', icon: ArrowUpCircle, href: '/addons/dumper-tilt-report' },
      { title: 'Tilt Angle Report', icon: BarChart, href: '/addons/camera-images' },
      { title: 'Camera Images', icon: Camera, href: '/addons/camera-images' },
      { title: 'RFID Report', icon: Radio, href: '/addons/rfid-report' },
      { title: 'MDVR Streaming', icon: Video, href: '/addons/mdvr-streaming' },
    ],
  },
];