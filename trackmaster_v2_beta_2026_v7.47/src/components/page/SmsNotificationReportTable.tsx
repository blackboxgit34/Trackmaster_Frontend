import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  notificationTypes,
  notificationData,
  type NotificationData,
  type DeliveryStatus,
} from '@/data/notificationData';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  FileText,
  FileSpreadsheet,
  ChevronsUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  MessageSquare,
  Bell,
  Clock,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Gauge,
  Power,
  BatteryWarning,
  Flame,
  MapPin,
  Lock,
  Eye,
  Layers,
  Activity,
  Car,
  Mail,
  Monitor,
  AlertCircle,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { startOfDay, endOfDay, format, parse } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import WhatsappIcon from '../icons/WhatsappIcon';
import { VehicleCombobox } from '../VehicleCombobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { API_BASE_URL } from '@/config/Api';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandEmpty,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { DataTableRequestModel } from '@/hooks/DataTableRequestModel';
import { useReportDownload, useRawVehicleList } from '@/hooks/useApi';
import { cn } from '@/lib/utils';

type ReportDataKey = keyof NotificationData;

const sortMap: Record<string, string> = {
  vehicleName: 'vehicleName',
  messageDate: 'messageDate',
  messageType: 'messageType',
  mobile: 'mobile',
};

// Helper to get category style & icon for message types
const getMessageTypeConfig = (type: string) => {
  const normalized = (type || '').toLowerCase();

  if (normalized.includes('speed')) {
    return {
      icon: Gauge,
      color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/60',
      dot: 'bg-amber-500',
    };
  }
  if (normalized.includes('ignition')) {
    return {
      icon: Power,
      color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60',
      dot: 'bg-emerald-500',
    };
  }
  if (normalized.includes('theft') || normalized.includes('fuel')) {
    return {
      icon: Flame,
      color: 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/60',
      dot: 'bg-rose-500',
    };
  }
  if (normalized.includes('battery') || normalized.includes('disconnect')) {
    return {
      icon: BatteryWarning,
      color: 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800/60',
      dot: 'bg-orange-500',
    };
  }
  if (normalized.includes('geo') || normalized.includes('poi')) {
    return {
      icon: MapPin,
      color: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800/60',
      dot: 'bg-blue-500',
    };
  }
  if (normalized.includes('immobiliser') || normalized.includes('lock')) {
    return {
      icon: Lock,
      color: 'text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 border-violet-200 dark:border-violet-800/60',
      dot: 'bg-violet-500',
    };
  }
  if (normalized.includes('stop') || normalized.includes('idle')) {
    return {
      icon: Clock,
      color: 'text-amber-800 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700/60',
      dot: 'bg-amber-600',
    };
  }
  if (normalized.includes('driving') || normalized.includes('continuous')) {
    return {
      icon: Activity,
      color: 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800/60',
      dot: 'bg-purple-500',
    };
  }
  if (normalized.includes('sms')) {
    return {
      icon: MessageSquare,
      color: 'text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800/60',
      dot: 'bg-sky-500',
    };
  }

  return {
    icon: Bell,
    color: 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-500',
  };
};

// Platform Icons (SVG for Android & Apple)
const AndroidIcon = ({ className = 'h-3.5 w-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.996-3.4572c.1557-.2699.0634-.6144-.2064-.7701-.2698-.1558-.6142-.0635-.77.2064l-2.0221 3.5024c-1.3916-.6345-2.9372-.9881-4.579-.9881s-3.1874.3536-4.579.9881L5.7089 5.3028c-.1558-.2699-.5002-.3622-.77-.2064-.2698.1557-.3621.5002-.2064.7701l1.996 3.4572C3.5828 11.0963 1.5 14.7303 1.5 18.9956h21c0-4.2653-2.0828-7.8993-5.1185-9.6742" />
  </svg>
);

const AppleIcon = ({ className = 'h-3.5 w-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.74 1.03-1.77.91-2.8-.88.04-1.96.59-2.59 1.33-.56.65-1.05 1.7-0.92 2.71 1 .08 1.99-.5 2.6-1.24z" />
  </svg>
);

// Helper to validate phone numbers (filters out empty, dashes, all-zeros like '00', '0', '0000000000')
const isValidPhoneNumber = (num?: string | null): boolean => {
  if (!num) return false;
  const cleaned = num.trim();
  if (
    !cleaned ||
    cleaned === '-' ||
    cleaned === '0' ||
    cleaned === '00' ||
    cleaned === '0000000000' ||
    /^0+$/.test(cleaned) ||
    cleaned.toLowerCase() === 'na' ||
    cleaned.toLowerCase() === 'null' ||
    cleaned.toLowerCase() === 'none'
  ) {
    return false;
  }
  return true;
};

// Helper to validate email addresses
const isValidEmailAddress = (email?: string | null): boolean => {
  if (!email) return false;
  const cleaned = email.trim();
  if (
    !cleaned ||
    cleaned === '-' ||
    cleaned.toLowerCase() === 'na' ||
    cleaned.toLowerCase() === 'null' ||
    cleaned.toLowerCase() === 'none' ||
    !cleaned.includes('@')
  ) {
    return false;
  }
  return true;
};

// Helper to extract numbers list
const extractRecipientNumbers = (numbers?: string[], fallback?: string): string[] => {
  if (Array.isArray(numbers) && numbers.length > 0) {
    return numbers.filter(isValidPhoneNumber);
  }
  if (typeof fallback === 'string' && fallback.trim()) {
    return fallback
      .split(',')
      .map((s) => s.trim())
      .filter(isValidPhoneNumber);
  }
  return [];
};

// Helper to extract email list
const extractRecipientEmails = (emails?: string[], fallback?: string): string[] => {
  if (Array.isArray(emails) && emails.length > 0) {
    return emails.filter(isValidEmailAddress);
  }
  if (typeof fallback === 'string' && fallback.trim()) {
    return fallback
      .split(',')
      .map((s) => s.trim())
      .filter(isValidEmailAddress);
  }
  return [];
};

// Normalize status string from API or mock to strongly-typed DeliveryStatus
const parseDeliveryStatus = (raw: any, hasRecipients: boolean): DeliveryStatus => {
  if (!hasRecipients) return 'NA';
  const str = String(raw || 'Delivered').trim();
  const lower = str.toLowerCase();
  if (lower.includes('credit') || lower.includes('subscri') || lower.includes('plan')) {
    return 'No Credits';
  }
  if (lower.includes('tech') || lower.includes('gate') || lower.includes('fail') || lower.includes('err')) {
    return 'Technical Error';
  }
  if (lower.includes('sent')) {
    return 'Sent';
  }
  if (lower.includes('deliv')) {
    return 'Delivered';
  }
  return (str as DeliveryStatus) || 'Delivered';
};

// Sleek segmented chip for table cell (SMS, WhatsApp, Email)
const ChannelSegment = ({
  channel,
  status,
  recipients,
}: {
  channel: 'SMS' | 'WhatsApp' | 'Email';
  status: DeliveryStatus;
  recipients?: string[] | string;
}) => {
  const isEmail = channel === 'Email';
  const list = useMemo(() => {
    return isEmail
      ? extractRecipientEmails(
          Array.isArray(recipients) ? recipients : undefined,
          typeof recipients === 'string' ? recipients : undefined
        )
      : extractRecipientNumbers(
          Array.isArray(recipients) ? recipients : undefined,
          typeof recipients === 'string' ? recipients : undefined
        );
  }, [recipients, isEmail]);

  const hasRecipient = list.length > 0;
  const isDelivered = status === 'Delivered' && hasRecipient;
  const isSent = status === 'Sent' && hasRecipient;
  const isNoCredits = status === 'No Credits' && hasRecipient;
  const isFailed = (status === 'Failed' || status === 'Technical Error') && hasRecipient;
  const isMissing = !hasRecipient || status === 'NA';

  const iconMap = {
    SMS: MessageSquare,
    WhatsApp: WhatsappIcon,
    Email: Mail,
  };
  const IconComp = iconMap[channel];
  const shortLabel = channel === 'WhatsApp' ? 'WA' : channel;
  const missingLabel = isEmail ? 'Mail not added' : 'Insufficient Credits';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium transition-colors cursor-default select-none whitespace-nowrap',
            isMissing && 'text-muted-foreground/60 hover:text-muted-foreground',
            isDelivered && 'text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-500/5',
            isSent && 'text-blue-700 dark:text-blue-300 bg-blue-500/5',
            isNoCredits && 'text-amber-700 dark:text-amber-300 bg-amber-500/5',
            isFailed && 'text-rose-700 dark:text-rose-300 bg-rose-500/5'
          )}
        >
          <IconComp
            className={cn(
              'h-3.5 w-3.5 shrink-0',
              channel === 'SMS' && 'text-amber-500',
              channel === 'WhatsApp' && 'text-emerald-600',
              channel === 'Email' && 'text-sky-500',
              isMissing && 'opacity-40 grayscale'
            )}
          />
          <span className="text-[11px]">{shortLabel}</span>

          {isMissing ? (
            <span className="text-[9px] px-1 py-0.2 rounded bg-muted text-muted-foreground font-medium border border-border/60">
              Not added
            </span>
          ) : (
            <div className="flex items-center gap-1">
              {isDelivered && (
                <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
              )}
              {isSent && (
                <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
              )}
              {isNoCredits && (
                <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              {isFailed && (
                <X className="h-3 w-3 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              {list.length > 1 && (
                <span className="text-[9px] px-1 rounded-full bg-background border border-border/70 font-bold leading-none py-0.5 text-foreground">
                  {list.length}
                </span>
              )}
            </div>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs space-y-1 max-w-[260px]">
        <div className="flex items-center justify-between gap-2 border-b pb-1">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <IconComp className="h-3.5 w-3.5 text-primary" />
            <span>{channel} Alert</span>
          </p>
          <span
            className={cn(
              'font-semibold text-[10px] px-1.5 py-0.5 rounded',
              isMissing && 'bg-muted text-muted-foreground border border-border',
              !isMissing && isDelivered && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
              !isMissing && isSent && 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
              !isMissing && isNoCredits && 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
              !isMissing && isFailed && 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
            )}
          >
            {isMissing ? missingLabel : status}
          </span>
        </div>

        {isMissing ? (
          <div className="space-y-0.5 text-muted-foreground text-[11px]">
            <p className="font-medium text-foreground">{missingLabel}</p>
            <p className="text-[10px]">
              No recipient contact registered for this vehicle alert.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            <p className="text-[11px] text-muted-foreground">
              {isEmail ? 'Recipient Email:' : `Recipient Numbers (${list.length}):`}
            </p>
            {list.map((num, idx) => (
              <p key={idx} className="font-mono text-[11px] text-foreground">
                {num}
              </p>
            ))}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
};

// Sleek segmented chip for Push Notification Session Presence (Android, iOS, Web Portal)
const PushPresenceSegment = ({
  platform,
  isLoggedIn,
}: {
  platform: 'Android' | 'iOS' | 'Web Portal';
  isLoggedIn: boolean;
}) => {
  const shortLabel = platform === 'Web Portal' ? 'Web' : platform;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium transition-colors cursor-default select-none whitespace-nowrap',
            isLoggedIn
              ? 'text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-500/5'
              : 'text-muted-foreground/60'
          )}
        >
          {platform === 'Android' && <AndroidIcon className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
          {platform === 'iOS' && <AppleIcon className="h-3.5 w-3.5 shrink-0 text-slate-800 dark:text-slate-200" />}
          {platform === 'Web Portal' && <Monitor className="h-3.5 w-3.5 shrink-0 text-primary" />}
          <span className="text-[11px]">{shortLabel}</span>
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full shrink-0',
              isLoggedIn ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/30'
            )}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs space-y-0.5">
        <p className="font-semibold text-foreground">{platform} Push Notification</p>
        <p>
          User Session:{' '}
          <span className={isLoggedIn ? 'text-emerald-500 font-semibold' : 'text-muted-foreground'}>
            {isLoggedIn ? 'Logged In (Active)' : 'Logged Out (Offline)'}
          </span>
        </p>
        <p className="text-[10px] text-muted-foreground">
          {isLoggedIn
            ? 'Alert pushed directly to active session'
            : 'User offline; delivered upon next login'}
        </p>
      </TooltipContent>
    </Tooltip>
  );
};

const SmsNotificationReportTable = () => {
  const { toast } = useToast();
  const [messageTypeOpen, setMessageTypeOpen] = useState(false);
  const { data: rawVehicleList } = useRawVehicleList();

  const vehicleList = useMemo(
    () => [
      { label: 'All Vehicles', value: 'all' },
      ...(rawVehicleList || []).map((v: any) => ({
        label: v.vehName,
        value: v.vehName,
      })),
    ],
    [rawVehicleList]
  );

  const [messageTypeList, setMessageTypeList] = useState<
    { label: string; value: string }[]
  >([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{
    key: ReportDataKey;
    direction: 'asc' | 'desc';
  }>({
    key: 'messageDate',
    direction: 'desc',
  });

  const [searchParams] = useSearchParams();
  const urlVehicle = searchParams.get('vehicle') || searchParams.get('vehicleNo');
  const urlFrom = searchParams.get('from');
  const urlTo = searchParams.get('to');
  const urlType = searchParams.get('type') || searchParams.get('messagetype');
  const urlChannel = searchParams.get('channel') || searchParams.get('typeid');

  // Search input state + Debounced search state to prevent rapid keystroke API spam
  const [searchInput, setSearchInput] = useState(
    searchParams.get('search') || searchParams.get('q') || ''
  );
  const [debouncedSearch, setDebouncedSearch] = useState(searchInput);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const [date, setDate] = useState<DateRange | undefined>(() => {
    if (urlFrom) {
      try {
        const parsedFrom = parse(urlFrom, 'yyyy-MM-dd', new Date());
        const parsedTo = urlTo ? parse(urlTo, 'yyyy-MM-dd', new Date()) : parsedFrom;
        return { from: startOfDay(parsedFrom), to: endOfDay(parsedTo) };
      } catch (e) {
        console.error('Date parse error from URL', e);
      }
    }
    return {
      from: startOfDay(new Date()),
      to: endOfDay(new Date()),
    };
  });

  const [selectedVehicle, setSelectedVehicle] = useState(urlVehicle || 'all');
  const [messageTypeFilter, setMessageTypeFilter] = useState(urlType || '0');
  const [notificationTypeFilter, setNotificationTypeFilter] = useState(urlChannel || '0');

  const [reportData, setReportData] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedMessageItem, setSelectedMessageItem] =
    useState<NotificationData | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Real-time KPI summary computed over current alerts data
  const kpiStats = useMemo(() => {
    const total = totalRecords || reportData.length;
    let deliveredCount = 0;
    let activeSessionCount = 0;
    let failureCount = 0;

    reportData.forEach((item) => {
      const isDelivered =
        item.smsStatus === 'Delivered' ||
        item.whatsappStatus === 'Delivered' ||
        item.emailStatus === 'Delivered' ||
        item.pushStatus === 'Delivered';
      if (isDelivered) deliveredCount++;

      const hasActiveSession =
        item.androidLoggedIn || item.iosLoggedIn || item.webLoggedIn;
      if (hasActiveSession) activeSessionCount++;

      const hasFailure =
        item.smsStatus === 'Failed' ||
        item.smsStatus === 'Technical Error' ||
        item.whatsappStatus === 'Failed' ||
        item.whatsappStatus === 'Technical Error' ||
        item.emailStatus === 'Failed' ||
        item.emailStatus === 'Technical Error' ||
        item.pushStatus === 'Failed';
      if (hasFailure) failureCount++;
    });

    const sampleSize = reportData.length || 1;
    const reachRate = reportData.length
      ? Math.round((deliveredCount / sampleSize) * 100)
      : 100;
    const sessionRate = reportData.length
      ? Math.round((activeSessionCount / sampleSize) * 100)
      : 100;

    return {
      total,
      reachRate,
      sessionRate,
      failureCount,
    };
  }, [totalRecords, reportData]);

  const auth = useMemo(
    () => JSON.parse(localStorage.getItem('trackmaster-auth') || '{}'),
    []
  );

  const getMessageReports = useCallback(async () => {
    try {
      setLoading(true);
      const lowerBand = page * rowsPerPage;
      const upperBand = lowerBand + rowsPerPage;
      const requestModel: DataTableRequestModel = {
        CustId: auth.custId,
        sEcho: 1,
        iDisplayStart: lowerBand,
        iDisplayLength: upperBand,
        sSearch: debouncedSearch?.trim() || '',
        sortColumn: sortMap[sortConfig.key] || 'messageDate',
        sortDirection: sortConfig.direction,
      };

      const typeId =
        notificationTypeFilter === '0' ? 0 : Number(notificationTypeFilter);

      const params = new URLSearchParams({
        CustId: String(auth.custId || 0),
        sEcho: String(requestModel.sEcho),
        iDisplayStart: String(requestModel.iDisplayStart),
        iDisplayLength: String(requestModel.iDisplayLength),
        sSearch: requestModel.sSearch || '',
        sortColumn: requestModel.sortColumn || '',
        sortDirection: requestModel.sortDirection || '',
        typeid: String(typeId),
        messagetype: messageTypeFilter,
        beginDate: date?.from ? format(date.from, 'M/d/yyyy h:mm:ss a') : '',
        endDate: date?.to
          ? format(endOfDay(date.to), 'M/d/yyyy h:mm:ss a')
          : date?.from
            ? format(endOfDay(date.from), 'M/d/yyyy h:mm:ss a')
            : '',
        vehicleNo: selectedVehicle,
      });

      if (!auth.custId) {
        // Fallback for development / mock preview
        let filtered = [...notificationData];
        if (selectedVehicle !== 'all') {
          filtered = filtered.filter((d) => d.vehicleName === selectedVehicle);
        }

        // Smart Filtering by Channel Reach & Presence
        if (typeId === 1) {
          filtered = filtered.filter((d) => d.smsStatus === 'Delivered' || d.smsStatus === 'Sent');
        } else if (typeId === 2) {
          filtered = filtered.filter((d) => d.pushStatus !== 'NA');
        } else if (typeId === 3) {
          filtered = filtered.filter((d) => d.emailStatus === 'Delivered' || d.emailStatus === 'Sent');
        } else if (typeId === 4) {
          filtered = filtered.filter((d) => d.whatsappStatus === 'Delivered' || d.whatsappStatus === 'Sent');
        } else if (typeId === 5) {
          filtered = filtered.filter(
            (d) =>
              d.smsStatus === 'Failed' ||
              d.smsStatus === 'Technical Error' ||
              d.whatsappStatus === 'Failed' ||
              d.whatsappStatus === 'Technical Error' ||
              d.emailStatus === 'Failed' ||
              d.emailStatus === 'Technical Error' ||
              d.pushStatus === 'Failed'
          );
        } else if (typeId === 6) {
          filtered = filtered.filter(
            (d) => !d.androidLoggedIn && !d.iosLoggedIn && !d.webLoggedIn
          );
        }

        if (messageTypeFilter !== '0') {
          filtered = filtered.filter((d) => d.messageType === messageTypeFilter);
        }

        if (debouncedSearch.trim()) {
          const q = debouncedSearch.toLowerCase();
          filtered = filtered.filter(
            (d) =>
              d.vehicleName.toLowerCase().includes(q) ||
              d.mobile.toLowerCase().includes(q) ||
              (d.email && d.email.toLowerCase().includes(q)) ||
              d.message.toLowerCase().includes(q)
          );
        }

        setReportData(filtered.slice(lowerBand, upperBand));
        setTotalRecords(filtered.length);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/Reports/GetMessageReports?${params.toString()}`
      );
      const text = await response.text();
      if (!text) {
        setReportData([]);
        setTotalRecords(0);
        return;
      }

      const result = JSON.parse(text);
      const formattedData: NotificationData[] = (result?.aaData || []).map(
        (item: any, index: number) => {
          const rawMobile = item.mobile || item.mobileNo || '';
          const mobileNumbers =
            rawMobile
              ? rawMobile.split(',').map((s: string) => s.trim()).filter(isValidPhoneNumber)
              : [];

          const rawWhatsapp = item.whatsapp || item.whatsappNo || '';
          const whatsappNumbers =
            rawWhatsapp
              ? rawWhatsapp.split(',').map((s: string) => s.trim()).filter(isValidPhoneNumber)
              : mobileNumbers;

          const rawEmail = item.email || item.emailId || item.alertEmail || '';
          const emailAddresses =
            rawEmail
              ? rawEmail.split(',').map((s: string) => s.trim()).filter(isValidEmailAddress)
              : [];

          const smsStatus: DeliveryStatus = parseDeliveryStatus(
            item.smsstatus || item.smsStatus,
            mobileNumbers.length > 0
          );

          const whatsappStatus: DeliveryStatus = parseDeliveryStatus(
            item.whatsappstatus || item.whatsappStatus,
            whatsappNumbers.length > 0
          );

          const emailStatus: DeliveryStatus = parseDeliveryStatus(
            item.emailstatus || item.emailStatus,
            emailAddresses.length > 0
          );

          const pushStatus =
            item.pushstatus ||
            item.pushStatus ||
            item.androidstatus ||
            item.iosstatus ||
            'Delivered';

          const androidLoggedIn =
            item.androidloggedin ?? item.isAndroidLoggedIn ?? true;
          const iosLoggedIn =
            item.iosloggedin ?? item.isIosLoggedIn ?? false;
          const webLoggedIn =
            item.webloggedin ?? item.isWebLoggedIn ?? true;

          return {
            id: index + 1,
            vehicleId: String(item.vehicleId || ''),
            vehicleName: item.vehicleName || item.vehName || '-',
            messageDate: item.messageDate || '-',
            messageType: item.messageType || item.type || '-',
            mobile: mobileNumbers.length > 0 ? mobileNumbers.join(', ') : '-',
            mobileNumbers,
            email: emailAddresses.length > 0 ? emailAddresses.join(', ') : undefined,
            emailAddresses,
            whatsapp: whatsappNumbers.length > 0 ? whatsappNumbers.join(', ') : undefined,
            whatsappNumbers,
            message: item.messageText || item.message || '-',

            smsStatus,
            whatsappStatus,
            emailStatus,
            pushStatus,

            androidLoggedIn,
            iosLoggedIn,
            webLoggedIn,

            androidStatus: item.androidstatus || 'Delivered',
            iosStatus: item.iosstatus || 'Delivered',
            notificationType: 'Multi-Channel Alert',
          };
        }
      );

      setReportData(formattedData);
      setTotalRecords(result?.iTotalRecords || formattedData.length);
    } catch (error) {
      console.error('GetMessageReports API Error:', error);
      setReportData([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  }, [
    auth.custId,
    page,
    rowsPerPage,
    debouncedSearch,
    sortConfig,
    notificationTypeFilter,
    messageTypeFilter,
    date,
    selectedVehicle,
  ]);

  // Load dynamic message types
  useEffect(() => {
    fetch(`${API_BASE_URL}/Reports/GetMessageType`)
      .then(async (res) => {
        const text = await res.text();
        if (!text) return [];
        return JSON.parse(text);
      })
      .then((data) => {
        const messageTypes = data?.data || data || [];
        const formatted = [
          { label: 'All Message Types', value: '0' },
          ...messageTypes.map((item: any) => ({
            label: item.name,
            value: String(item.value),
          })),
        ];
        setMessageTypeList(formatted);
      })
      .catch((err) => {
        console.error('Message Type API error:', err);
        setMessageTypeList([
          { label: 'All Message Types', value: '0' },
          { label: 'Over-speed', value: 'Over-speed' },
          { label: 'Ignition On', value: 'IgnitionOn' },
          { label: 'Geofence', value: 'Geofence' },
          { label: 'Fuel Theft', value: 'Fuel Theft' },
          { label: 'Main Battery Disconnection', value: 'Main Battery Disconnection' },
          { label: 'Daily SMS', value: 'Daily SMS' },
          { label: 'Continuous Driving', value: 'Continuous Driving' },
        ]);
      });
  }, []);

  // Fetch report when filters change
  useEffect(() => {
    getMessageReports();
  }, [getMessageReports]);

  // Sorting
  const handleSort = (key: ReportDataKey) => {
    const direction =
      sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
    setPage(0);
  };

  // Download setup
  const typeId =
    notificationTypeFilter === '0' ? 0 : Number(notificationTypeFilter);

  const requestModel = {
    CustId: auth.custId,
    sEcho: 1,
    sSearch: debouncedSearch?.trim() || '',
    sortColumn: sortMap[sortConfig.key] || '',
    sortDirection: sortConfig.direction || '',
  };

  const extraParams = {
    typeid: String(typeId),
    messagetype: messageTypeFilter,
    beginDate: date?.from ? format(date.from, 'M/d/yyyy h:mm:ss a') : '',
    endDate: date?.to
      ? format(endOfDay(date.to), 'M/d/yyyy h:mm:ss a')
      : date?.from
        ? format(endOfDay(date.from), 'M/d/yyyy h:mm:ss a')
        : '',
    vehicleNo: selectedVehicle,
  };

  const { exportExcel, exportPdf } = useReportDownload(
    '/Reports/GetMessageReports',
    requestModel,
    extraParams
  );

  const handleExportExcel = async () => {
    setLoading(true);
    try {
      await exportExcel();
      toast({
        title: 'Export started',
        description: 'Your Excel file is being generated and downloaded.',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Export failed',
        description: 'Could not export to Excel. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    setLoading(true);
    try {
      await exportPdf();
      toast({
        title: 'Export started',
        description: 'Your PDF file is being generated and downloaded.',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Export failed',
        description: 'Could not export to PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Copy helper
  const handleCopy = (text: string, id: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({
      title: 'Copied to clipboard',
      description: `${label} copied successfully.`,
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedVehicle('all');
    setMessageTypeFilter('0');
    setNotificationTypeFilter('0');
    setDate({ from: startOfDay(new Date()), to: endOfDay(new Date()) });
    setPage(0);
  };

  const hasActiveFilters =
    Boolean(searchInput) ||
    selectedVehicle !== 'all' ||
    messageTypeFilter !== '0' ||
    notificationTypeFilter !== '0';

  const totalPages = Math.ceil(totalRecords / rowsPerPage);
  const firstIndex = totalRecords === 0 ? 0 : page * rowsPerPage + 1;
  const lastIndex = Math.min((page + 1) * rowsPerPage, totalRecords);

  const selectedMessageTypeLabel =
    messageTypeList.find((m) => m.value === messageTypeFilter)?.label ||
    'All Message Types';

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Real-time Operational KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Broadcasts */}
          <Card className="border border-border/70 shadow-xs bg-card p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Total Broadcasts
              </p>
              <p className="text-xl font-bold text-foreground mt-0.5">
                {kpiStats.total}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Sent alerts
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Bell className="h-5 w-5" />
            </div>
          </Card>

          {/* Delivery Reach Rate */}
          <Card className="border border-border/70 shadow-xs bg-card p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Delivery Reach
              </p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {kpiStats.reachRate}%
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Delivered across channels
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </Card>

          {/* User Session Presence */}
          <Card className="border border-border/70 shadow-xs bg-card p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Active Sessions
              </p>
              <p className="text-xl font-bold text-violet-600 dark:text-violet-400 mt-0.5">
                {kpiStats.sessionRate}%
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Logged in at alert time
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Monitor className="h-5 w-5" />
            </div>
          </Card>

          {/* Delivery Failures */}
          <Card
            onClick={() => {
              if (kpiStats.failureCount > 0) {
                setNotificationTypeFilter('5');
                setPage(0);
              }
            }}
            className={cn(
              'border shadow-xs bg-card p-3.5 flex items-center justify-between transition-all',
              kpiStats.failureCount > 0
                ? 'border-rose-200 dark:border-rose-900/60 cursor-pointer hover:bg-rose-50/50 dark:hover:bg-rose-950/20'
                : 'border-border/70'
            )}
          >
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Delivery Failures
              </p>
              <p
                className={cn(
                  'text-xl font-bold mt-0.5',
                  kpiStats.failureCount > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-foreground'
                )}
              >
                {kpiStats.failureCount}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {kpiStats.failureCount > 0 ? 'Click to inspect failures' : 'Zero send errors'}
              </p>
            </div>
            <div
              className={cn(
                'p-2.5 rounded-xl',
                kpiStats.failureCount > 0
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
          </Card>
        </div>

        {/* Main Card with Toolbar & Table */}
        <Card className="border border-border/80 shadow-sm overflow-hidden bg-card">
          {/* Header & Integrated Toolbar */}
          <CardHeader className="border-b bg-muted/20 px-6 py-4 space-y-3.5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                      Alerts Report
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Multi-channel broadcast log of vehicle alerts, delivery reach, and user session presence.
                    </CardDescription>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Export, WhatsApp & Email Subscription */}
              <div className="flex items-center gap-2 self-start lg:self-center flex-wrap">
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFilters}
                    className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Reset Filters
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      className="h-9 gap-2 shadow-sm font-medium bg-black text-white hover:bg-black/85 dark:bg-black dark:text-white dark:hover:bg-neutral-900 dark:border dark:border-white/15 cursor-pointer"
                    >
                      <Download className="h-4 w-4 text-white" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      onClick={handleExportPdf}
                      className="cursor-pointer gap-2"
                    >
                      <FileText className="h-4 w-4 text-rose-500" />
                      Export as PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleExportExcel}
                      className="cursor-pointer gap-2"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                      Export as Excel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Filter Bar Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-0.5">
              {/* Omni Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search vehicle, mobile, email..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full h-9 pl-9 pr-8 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
                />
                {searchInput && (
                  <button
                    onClick={() => {
                      setSearchInput('');
                      setDebouncedSearch('');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Date Range Picker */}
              <DateRangePicker
                date={date}
                setDate={(newDate) => {
                  setDate(newDate);
                  setPage(0);
                }}
                className="w-full"
              />

              {/* Vehicle Combobox */}
              <VehicleCombobox
                vehicles={vehicleList}
                value={selectedVehicle}
                onChange={(val) => {
                  setSelectedVehicle(val);
                  setPage(0);
                }}
                className="w-full"
              />

              {/* Message Type Popover Combobox */}
              <Popover open={messageTypeOpen} onOpenChange={setMessageTypeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full h-9 justify-between text-xs font-normal shadow-sm px-3"
                  >
                    <span className="truncate">{selectedMessageTypeLabel}</span>
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[240px]" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search alert type..."
                      className="text-xs"
                    />
                    <CommandList>
                      <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
                        No alert type found.
                      </CommandEmpty>
                      <CommandGroup className="max-h-60 overflow-y-auto">
                        {messageTypeList.map((item) => {
                          const config = getMessageTypeConfig(item.label);
                          const IconComp = config.icon;
                          return (
                            <CommandItem
                              key={item.value}
                              value={item.label}
                              onSelect={() => {
                                setMessageTypeFilter(item.value);
                                setMessageTypeOpen(false);
                                setPage(0);
                              }}
                              className="text-xs cursor-pointer flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <IconComp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate">{item.label}</span>
                              </div>
                              <Check
                                className={cn(
                                  'h-3.5 w-3.5 shrink-0',
                                  messageTypeFilter === item.value
                                    ? 'opacity-100'
                                    : 'opacity-0'
                                )}
                              />
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Quick Channel Segment Filter Chips */}
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto pb-0.5 scrollbar-none">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mr-1 shrink-0">
                Filter:
              </span>
              {notificationTypes.map((type) => {
                const isSelected = notificationTypeFilter === String(type.id);
                return (
                  <button
                    key={String(type.id)}
                    type="button"
                    onClick={() => {
                      setNotificationTypeFilter(String(type.id));
                      setPage(0);
                    }}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all shrink-0 border cursor-pointer select-none',
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-xs'
                        : 'bg-background hover:bg-muted/70 text-muted-foreground hover:text-foreground border-border/80'
                    )}
                  >
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>
          </CardHeader>

          {/* Table Content */}
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/80">
                    {/* Vehicle */}
                    <TableHead
                      className="cursor-pointer px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider group"
                      onClick={() => handleSort('vehicleName')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Vehicle</span>
                        {sortConfig.key === 'vehicleName' ? (
                          sortConfig.direction === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5 text-foreground" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5 text-foreground" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground" />
                        )}
                      </div>
                    </TableHead>

                    {/* Date & Time */}
                    <TableHead
                      className="cursor-pointer px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider group whitespace-nowrap"
                      onClick={() => handleSort('messageDate')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Date & Time</span>
                        {sortConfig.key === 'messageDate' ? (
                          sortConfig.direction === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5 text-foreground" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5 text-foreground" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground" />
                        )}
                      </div>
                    </TableHead>

                    {/* Alert Type */}
                    <TableHead
                      className="cursor-pointer px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider group whitespace-nowrap"
                      onClick={() => handleSort('messageType')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Alert Type</span>
                        {sortConfig.key === 'messageType' ? (
                          sortConfig.direction === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5 text-foreground" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5 text-foreground" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground" />
                        )}
                      </div>
                    </TableHead>

                    {/* Alert Message Content */}
                    <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[200px] max-w-[280px]">
                      Alert Description
                    </TableHead>

                    {/* Block 1: SMS, Email & WhatsApp */}
                    <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center min-w-[260px]">
                      <div className="flex items-center justify-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-primary" />
                        <span>SMS, Email & WhatsApp</span>
                      </div>
                    </TableHead>

                    {/* Block 2: Push Notifications (Android, iOS, Web Portal) */}
                    <TableHead className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center min-w-[210px]">
                      <div className="flex items-center justify-center gap-1.5">
                        <Bell className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Push Notifications</span>
                      </div>
                    </TableHead>

                    {/* Sticky Action Column Header */}
                    <TableHead className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right sticky right-0 bg-muted/95 backdrop-blur-xs z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)]">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    // Skeleton Loading Rows
                    Array.from({ length: 5 }).map((_, idx) => (
                      <TableRow key={idx} className="border-b border-border/50">
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Skeleton className="h-8 w-8 rounded-lg" />
                            <div className="space-y-1.5">
                              <Skeleton className="h-4 w-24" />
                              <Skeleton className="h-3 w-14" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Skeleton className="h-5 w-20 rounded-full" />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Skeleton className="h-4 w-full max-w-[220px]" />
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <Skeleton className="h-7 w-48 mx-auto rounded-lg" />
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <Skeleton className="h-7 w-44 mx-auto rounded-lg" />
                        </TableCell>
                        <TableCell className="px-3 py-3 text-right sticky right-0 bg-card z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)]">
                          <Skeleton className="h-7 w-16 ml-auto rounded-md" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : reportData.length > 0 ? (
                    reportData.map((row) => {
                      const typeConfig = getMessageTypeConfig(row.messageType);
                      const TypeIcon = typeConfig.icon;

                      return (
                        <TableRow
                          key={row.id}
                          onClick={() => {
                            setSelectedMessageItem(row);
                            setIsDetailModalOpen(true);
                          }}
                          className="bg-card hover:bg-muted/50 transition-colors border-b border-border/60 group cursor-pointer"
                        >
                          {/* Vehicle Info */}
                          <TableCell className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border">
                                <Car className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="font-semibold text-sm text-foreground">
                                  {row.vehicleName}
                                </div>
                                {row.vehicleId && row.vehicleId !== '-' && (
                                  <div className="text-[11px] font-mono text-muted-foreground">
                                    {row.vehicleId}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Message Date */}
                          <TableCell className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                              <span className="font-medium text-foreground/90">
                                {row.messageDate}
                              </span>
                            </div>
                          </TableCell>

                          {/* Alert Type Badge */}
                          <TableCell className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                                typeConfig.color
                              )}
                            >
                              <TypeIcon className="h-3.5 w-3.5 shrink-0" />
                              <span>{row.messageType}</span>
                            </span>
                          </TableCell>

                          {/* Message Content Preview */}
                          <TableCell className="px-4 py-3 max-w-[280px]">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className="text-xs text-muted-foreground line-clamp-2 leading-relaxed break-words hover:text-foreground transition-colors"
                                title="Click row to view full alert audit"
                              >
                                {row.message}
                              </p>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(row.message, `msg-${row.id}`, 'Alert message');
                                }}
                                className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                              >
                                {copiedId === `msg-${row.id}` ? (
                                  <Check className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </TableCell>

                          {/* Block 1: SMS, Email & WhatsApp */}
                          <TableCell className="px-4 py-3 text-center">
                            {(() => {
                              const smsList = extractRecipientNumbers(
                                row.mobileNumbers,
                                row.mobile
                              );
                              const whatsappList = extractRecipientNumbers(
                                row.whatsappNumbers,
                                row.whatsapp || row.mobile
                              );
                              const emailList = extractRecipientEmails(
                                row.emailAddresses,
                                row.email
                              );

                              const hasSms =
                                (row.smsStatus === 'Delivered' || row.smsStatus === 'Sent') &&
                                smsList.length > 0;
                              const hasWhatsapp =
                                (row.whatsappStatus === 'Delivered' || row.whatsappStatus === 'Sent') &&
                                whatsappList.length > 0;
                              const hasEmail =
                                (row.emailStatus === 'Delivered' || row.emailStatus === 'Sent') &&
                                emailList.length > 0;

                              const hasAny = hasSms || hasWhatsapp || hasEmail;

                              if (!hasAny) {
                                return (
                                  <span
                                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium text-muted-foreground bg-muted/40 border border-border/60 select-none"
                                    title="No SMS, WhatsApp, or Email alert sent"
                                  >
                                    No alert sent
                                  </span>
                                );
                              }

                              return (
                                <div className="inline-flex items-center rounded-lg border border-border/70 bg-card p-0.5 shadow-2xs divide-x divide-border/60">
                                  {hasSms && (
                                    <ChannelSegment
                                      channel="SMS"
                                      status={row.smsStatus}
                                      recipients={smsList}
                                    />
                                  )}
                                  {hasWhatsapp && (
                                    <ChannelSegment
                                      channel="WhatsApp"
                                      status={row.whatsappStatus}
                                      recipients={whatsappList}
                                    />
                                  )}
                                  {hasEmail && (
                                    <ChannelSegment
                                      channel="Email"
                                      status={row.emailStatus}
                                      recipients={emailList}
                                    />
                                  )}
                                </div>
                              );
                            })()}
                          </TableCell>

                          {/* Block 2: Push Notifications (Android, iOS, Web Portal) */}
                          <TableCell className="px-4 py-3 text-center">
                            {(() => {
                              const hasAndroid = Boolean(row.androidLoggedIn);
                              const hasIos = Boolean(row.iosLoggedIn);
                              const hasWeb = Boolean(row.webLoggedIn);

                              const hasAnyPush = hasAndroid || hasIos || hasWeb;

                              if (!hasAnyPush) {
                                return (
                                  <span
                                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium text-muted-foreground bg-muted/40 border border-border/60 select-none"
                                    title="User offline (not logged in on any device/portal)"
                                  >
                                    No alert sent
                                  </span>
                                );
                              }

                              return (
                                <div className="inline-flex items-center rounded-lg border border-border/70 bg-card p-0.5 shadow-2xs divide-x divide-border/60">
                                  {hasAndroid && (
                                    <PushPresenceSegment
                                      platform="Android"
                                      isLoggedIn={true}
                                    />
                                  )}
                                  {hasIos && (
                                    <PushPresenceSegment
                                      platform="iOS"
                                      isLoggedIn={true}
                                    />
                                  )}
                                  {hasWeb && (
                                    <PushPresenceSegment
                                      platform="Web Portal"
                                      isLoggedIn={true}
                                    />
                                  )}
                                </div>
                              );
                            })()}
                          </TableCell>

                          {/* Action Button - Sticky */}
                          <TableCell
                            className="px-3 py-3 text-right sticky right-0 bg-card group-hover:bg-muted/50 transition-colors z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedMessageItem(row);
                                setIsDetailModalOpen(true);
                              }}
                              className="h-8 px-2.5 text-xs gap-1 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                            >
                              <Eye className="h-3.5 w-3.5 text-primary" />
                              <span className="hidden sm:inline">Details</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    // Empty State
                    <TableRow>
                      <TableCell colSpan={7} className="py-16 text-center">
                        <div className="max-w-sm mx-auto flex flex-col items-center">
                          <div className="p-4 rounded-full bg-muted/60 text-muted-foreground mb-3">
                            <Bell className="h-8 w-8 opacity-60" />
                          </div>
                          <h3 className="text-base font-semibold text-foreground">
                            No alerts or notification logs found
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1 text-center">
                            {hasActiveFilters
                              ? 'No records match your selected filters. Try broadening your criteria or reset the search.'
                              : 'No vehicle alerts or notifications have been sent for this date interval.'}
                          </p>
                          {hasActiveFilters && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleResetFilters}
                              className="mt-4 h-8 text-xs gap-1.5"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Reset all filters
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>

          {/* Footer & Pagination */}
          <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3.5 px-6 border-t bg-muted/10">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-medium">
                Rows per page:
              </span>
              <Select
                value={String(rowsPerPage)}
                onValueChange={(val) => {
                  setRowsPerPage(Number(val));
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-18 h-8 text-xs bg-background">
                  <SelectValue placeholder={rowsPerPage} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10" className="text-xs">10</SelectItem>
                  <SelectItem value="25" className="text-xs">25</SelectItem>
                  <SelectItem value="50" className="text-xs">50</SelectItem>
                  <SelectItem value="100" className="text-xs">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-xs text-muted-foreground font-medium">
                Showing{' '}
                <span className="font-semibold text-foreground">
                  {firstIndex}-{lastIndex}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-foreground">
                  {totalRecords}
                </span>{' '}
                records
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setPage(0)}
                  disabled={page === 0 || loading}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setPage((p) => Math.max(p - 1, 0))}
                  disabled={page === 0 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-medium px-2 text-foreground">
                  Page {totalPages === 0 ? 0 : page + 1} of {Math.max(totalPages, 1)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    setPage((p) => Math.min(p + 1, Math.max(totalPages - 1, 0)))
                  }
                  disabled={page >= totalPages - 1 || loading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setPage(Math.max(totalPages - 1, 0))}
                  disabled={page >= totalPages - 1 || loading}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* Modernized Alert Details & Reach Audit Dialog */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-5">
            <DialogHeader className="space-y-1 pb-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <Bell className="h-4.5 w-4.5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    Alert Transmission & Reach Audit
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Transmission verification across direct messaging channels and live app session presence.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {selectedMessageItem && (() => {
              const typeConfig = getMessageTypeConfig(selectedMessageItem.messageType);
              const TypeIcon = typeConfig.icon;

              const modalSmsNumbers = extractRecipientNumbers(
                selectedMessageItem.mobileNumbers,
                selectedMessageItem.mobile
              );
              const modalWhatsappNumbers = extractRecipientNumbers(
                selectedMessageItem.whatsappNumbers,
                selectedMessageItem.whatsapp || selectedMessageItem.mobile
              );
              const modalEmailAddresses = extractRecipientEmails(
                selectedMessageItem.emailAddresses,
                selectedMessageItem.email
              );

              return (
                <div className="space-y-3 text-sm pt-1">
                  {/* Vehicle & Event Context Card */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/70 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-7 w-7 rounded-md bg-background border border-border/80 flex items-center justify-center text-muted-foreground shrink-0 shadow-2xs">
                        <Car className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                          Vehicle
                        </span>
                        <span className="font-semibold text-foreground truncate block">
                          {selectedMessageItem.vehicleName}
                        </span>
                        {selectedMessageItem.vehicleId && selectedMessageItem.vehicleId !== '-' && (
                          <span className="text-[10px] font-mono text-muted-foreground block truncate">
                            ID: {selectedMessageItem.vehicleId}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-7 w-7 rounded-md bg-background border border-border/80 flex items-center justify-center text-muted-foreground shrink-0 shadow-2xs">
                        <Clock className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                          Triggered At
                        </span>
                        <span className="font-medium text-foreground text-xs block">
                          {selectedMessageItem.messageDate}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-7 w-7 rounded-md bg-background border border-border/80 flex items-center justify-center text-muted-foreground shrink-0 shadow-2xs">
                        <TypeIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                          Alert Event
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border mt-0.5',
                            typeConfig.color
                          )}
                        >
                          {selectedMessageItem.messageType}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Alert Message Box */}
                  <div className="rounded-lg border border-border/70 bg-card p-2.5 shadow-2xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Alert Message Content
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopy(
                            selectedMessageItem.message,
                            'modal-copy',
                            'Alert message'
                          )
                        }
                        className="h-5 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                      >
                        {copiedId === 'modal-copy' ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        <span>{copiedId === 'modal-copy' ? 'Copied' : 'Copy'}</span>
                      </Button>
                    </div>
                    <div className="p-2 rounded bg-muted/30 border border-border/60 text-xs leading-relaxed text-foreground font-mono">
                      {selectedMessageItem.message}
                    </div>
                  </div>

                  {/* Direct Message Channels (SMS, WhatsApp, Email) */}
                  <div className="rounded-lg border border-border/80 bg-card overflow-hidden shadow-2xs">
                    <div className="flex items-center justify-between gap-1 px-3.5 py-2 bg-muted/40 border-b border-border/70">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                          Direct Messaging Channels
                        </span>
                      </div>
                    </div>

                    <div className="divide-y divide-border/60">
                      {/* SMS Row */}
                      <div className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted/10 transition-colors">
                        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                          <div className="h-7 w-7 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0 mt-0.5 sm:mt-0">
                            <MessageSquare className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-foreground">SMS Alert</span>
                              {modalSmsNumbers.length > 0 && (
                                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {modalSmsNumbers.length} added
                                </span>
                              )}
                            </div>
                            {modalSmsNumbers.length === 0 ? (
                              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium mt-0.5">
                                Alert not sent • Inactive subscription or insufficient alert credits
                              </p>
                            ) : (
                              <>
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                  {modalSmsNumbers.map((num, i) => (
                                    <span
                                      key={i}
                                      className="font-mono text-[11px] bg-muted/60 px-1.5 py-0.5 rounded border border-border/60 text-foreground"
                                    >
                                      {num}
                                    </span>
                                  ))}
                                </div>
                                {selectedMessageItem.smsStatus === 'No Credits' && (
                                  <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium mt-1">
                                    Alert not sent • Inactive subscription or insufficient alert credits
                                  </p>
                                )}
                                {(selectedMessageItem.smsStatus === 'Technical Error' ||
                                  selectedMessageItem.smsStatus === 'Failed') && (
                                  <p className="text-[11px] text-rose-700 dark:text-rose-400 font-medium mt-1">
                                    Alert not sent • Telecom gateway error (rare)
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 self-start sm:self-center">
                          {modalSmsNumbers.length === 0 ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300/50">
                              Insufficient Credits
                            </span>
                          ) : (
                            <span
                              className={cn(
                                'text-[10px] font-bold px-2 py-0.5 rounded border',
                                selectedMessageItem.smsStatus === 'Delivered' &&
                                  'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300/50',
                                selectedMessageItem.smsStatus === 'Sent' &&
                                  'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300/50',
                                (selectedMessageItem.smsStatus === 'No Credits' ||
                                  selectedMessageItem.smsStatus === 'NA') &&
                                  'bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300/50',
                                (selectedMessageItem.smsStatus === 'Technical Error' ||
                                  selectedMessageItem.smsStatus === 'Failed') &&
                                  'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300/50'
                              )}
                            >
                              {selectedMessageItem.smsStatus === 'No Credits' ||
                              selectedMessageItem.smsStatus === 'NA'
                                ? 'Insufficient Credits'
                                : selectedMessageItem.smsStatus === 'Failed'
                                  ? 'Technical Error'
                                  : selectedMessageItem.smsStatus}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* WhatsApp Row */}
                      <div className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted/10 transition-colors">
                        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                          <div className="h-7 w-7 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5 sm:mt-0">
                            <WhatsappIcon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-foreground">WhatsApp Alert</span>
                              {modalWhatsappNumbers.length > 0 && (
                                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {modalWhatsappNumbers.length} added
                                </span>
                              )}
                            </div>
                            {modalWhatsappNumbers.length === 0 ? (
                              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium mt-0.5">
                                Alert not sent • Inactive subscription or insufficient alert credits
                              </p>
                            ) : (
                              <>
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                  {modalWhatsappNumbers.map((num, i) => (
                                    <span
                                      key={i}
                                      className="font-mono text-[11px] bg-muted/60 px-1.5 py-0.5 rounded border border-border/60 text-foreground"
                                    >
                                      {num}
                                    </span>
                                  ))}
                                </div>
                                {selectedMessageItem.whatsappStatus === 'No Credits' && (
                                  <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium mt-1">
                                    Alert not sent • Inactive subscription or insufficient alert credits
                                  </p>
                                )}
                                {(selectedMessageItem.whatsappStatus === 'Technical Error' ||
                                  selectedMessageItem.whatsappStatus === 'Failed') && (
                                  <p className="text-[11px] text-rose-700 dark:text-rose-400 font-medium mt-1">
                                    Alert not sent • Gateway delivery error (rare)
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 self-start sm:self-center">
                          {modalWhatsappNumbers.length === 0 ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300/50">
                              Insufficient Credits
                            </span>
                          ) : (
                            <span
                              className={cn(
                                'text-[10px] font-bold px-2 py-0.5 rounded border',
                                selectedMessageItem.whatsappStatus === 'Delivered' &&
                                  'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300/50',
                                selectedMessageItem.whatsappStatus === 'Sent' &&
                                  'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300/50',
                                (selectedMessageItem.whatsappStatus === 'No Credits' ||
                                  selectedMessageItem.whatsappStatus === 'NA') &&
                                  'bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300/50',
                                (selectedMessageItem.whatsappStatus === 'Technical Error' ||
                                  selectedMessageItem.whatsappStatus === 'Failed') &&
                                  'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300/50'
                              )}
                            >
                              {selectedMessageItem.whatsappStatus === 'No Credits' ||
                              selectedMessageItem.whatsappStatus === 'NA'
                                ? 'Insufficient Credits'
                                : selectedMessageItem.whatsappStatus === 'Failed'
                                  ? 'Technical Error'
                                  : selectedMessageItem.whatsappStatus}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Email Row */}
                      <div className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted/10 transition-colors">
                        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                          <div className="h-7 w-7 rounded-md bg-sky-500/10 flex items-center justify-center text-sky-600 shrink-0 mt-0.5 sm:mt-0">
                            <Mail className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-foreground">Email Alert</span>
                              {modalEmailAddresses.length > 0 && (
                                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {modalEmailAddresses.length} added
                                </span>
                              )}
                            </div>
                            {modalEmailAddresses.length === 0 ? (
                              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                                Mail not added
                              </p>
                            ) : (
                              <>
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                  {modalEmailAddresses.map((email, i) => (
                                    <span
                                      key={i}
                                      className="font-mono text-[11px] bg-muted/60 px-1.5 py-0.5 rounded border border-border/60 text-foreground"
                                    >
                                      {email}
                                    </span>
                                  ))}
                                </div>
                                {(selectedMessageItem.emailStatus === 'Technical Error' ||
                                  selectedMessageItem.emailStatus === 'Failed') && (
                                  <p className="text-[11px] text-rose-700 dark:text-rose-400 font-medium mt-1">
                                    Alert not sent • Mail server error (rare)
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 self-start sm:self-center">
                          {modalEmailAddresses.length === 0 ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted/70 text-muted-foreground border border-border">
                              Mail not added
                            </span>
                          ) : (
                            <span
                              className={cn(
                                'text-[10px] font-bold px-2 py-0.5 rounded border',
                                selectedMessageItem.emailStatus === 'Delivered' &&
                                  'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300/50',
                                selectedMessageItem.emailStatus === 'Sent' &&
                                  'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300/50',
                                (selectedMessageItem.emailStatus === 'Technical Error' ||
                                  selectedMessageItem.emailStatus === 'Failed') &&
                                  'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300/50',
                                selectedMessageItem.emailStatus === 'NA' &&
                                  'bg-muted text-muted-foreground border-border'
                              )}
                            >
                              {selectedMessageItem.emailStatus === 'Failed'
                                ? 'Technical Error'
                                : selectedMessageItem.emailStatus}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Push Notifications & App Presence (Android, iOS, Web Portal) */}
                  <div className="rounded-lg border border-border/80 bg-card overflow-hidden shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-3.5 py-2 bg-muted/40 border-b border-border/70">
                      <div className="flex items-center gap-2">
                        <Bell className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                          Push Notifications & User Presence
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium bg-background px-2 py-0.5 rounded border border-border/60 w-fit">
                        Live Session at Alert Time
                      </span>
                    </div>

                    <div className="p-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {/* Android App Card */}
                      <div
                        className={cn(
                          'p-2.5 rounded-lg border flex flex-col justify-between gap-2 transition-colors',
                          selectedMessageItem.androidLoggedIn
                            ? 'bg-emerald-500/[0.04] border-emerald-500/30 dark:bg-emerald-950/20'
                            : 'bg-muted/20 border-border/60'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <div className="h-6 w-6 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                              <AndroidIcon className="h-3 w-3" />
                            </div>
                            <span className="text-xs font-semibold text-foreground">Android App</span>
                          </div>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border',
                              selectedMessageItem.androidLoggedIn
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300/50'
                                : 'bg-muted/50 text-muted-foreground border-border'
                            )}
                          >
                            <span
                              className={cn(
                                'h-1.5 w-1.5 rounded-full shrink-0',
                                selectedMessageItem.androidLoggedIn
                                  ? 'bg-emerald-500 animate-pulse'
                                  : 'bg-muted-foreground/40'
                              )}
                            />
                            {selectedMessageItem.androidLoggedIn ? 'Logged In' : 'Logged Out'}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          {selectedMessageItem.androidLoggedIn
                            ? 'Active session • Delivered to device'
                            : 'User was offline at alert trigger'}
                        </p>
                      </div>

                      {/* iOS App Card */}
                      <div
                        className={cn(
                          'p-2.5 rounded-lg border flex flex-col justify-between gap-2 transition-colors',
                          selectedMessageItem.iosLoggedIn
                            ? 'bg-emerald-500/[0.04] border-emerald-500/30 dark:bg-emerald-950/20'
                            : 'bg-muted/20 border-border/60'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <div className="h-6 w-6 rounded-md bg-slate-500/10 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                              <AppleIcon className="h-3 w-3" />
                            </div>
                            <span className="text-xs font-semibold text-foreground">iOS App</span>
                          </div>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border',
                              selectedMessageItem.iosLoggedIn
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300/50'
                                : 'bg-muted/50 text-muted-foreground border-border'
                            )}
                          >
                            <span
                              className={cn(
                                'h-1.5 w-1.5 rounded-full shrink-0',
                                selectedMessageItem.iosLoggedIn
                                  ? 'bg-emerald-500 animate-pulse'
                                  : 'bg-muted-foreground/40'
                              )}
                            />
                            {selectedMessageItem.iosLoggedIn ? 'Logged In' : 'Logged Out'}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          {selectedMessageItem.iosLoggedIn
                            ? 'Active session • Delivered to device'
                            : 'User was offline at alert trigger'}
                        </p>
                      </div>

                      {/* Web Portal Card */}
                      <div
                        className={cn(
                          'p-2.5 rounded-lg border flex flex-col justify-between gap-2 transition-colors',
                          selectedMessageItem.webLoggedIn
                            ? 'bg-emerald-500/[0.04] border-emerald-500/30 dark:bg-emerald-950/20'
                            : 'bg-muted/20 border-border/60'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
                              <Monitor className="h-3 w-3" />
                            </div>
                            <span className="text-xs font-semibold text-foreground">Web Portal</span>
                          </div>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border',
                              selectedMessageItem.webLoggedIn
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300/50'
                                : 'bg-muted/50 text-muted-foreground border-border'
                            )}
                          >
                            <span
                              className={cn(
                                'h-1.5 w-1.5 rounded-full shrink-0',
                                selectedMessageItem.webLoggedIn
                                  ? 'bg-emerald-500 animate-pulse'
                                  : 'bg-muted-foreground/40'
                              )}
                            />
                            {selectedMessageItem.webLoggedIn ? 'Logged In' : 'Logged Out'}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          {selectedMessageItem.webLoggedIn
                            ? 'Active session • Delivered on portal'
                            : 'User was offline on portal'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <DialogFooter className="pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetailModalOpen(false)}
                className="w-full sm:w-auto text-xs"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default SmsNotificationReportTable;