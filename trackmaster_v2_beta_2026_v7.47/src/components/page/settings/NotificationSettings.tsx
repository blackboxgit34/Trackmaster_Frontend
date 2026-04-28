import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  smsSettingsData, 
  inAppSettingsData, 
  emailSettingsData, 
  whatsAppSettingsData, 
  alertKeys,
  type SmsAlertSetting,
  type InAppAlertSetting,
  type EmailAlertSetting,
  type WhatsAppAlertSetting
} from '@/data/vehicleNotificationSettings';
import { Search, ArrowUp, ArrowDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Settings2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type SortKey<T> = keyof Omit<T, 'alerts'>;

const SortableHeader = <T,>({ children, sortKey, currentSort, onSort }: { children: React.ReactNode; sortKey: SortKey<T>; currentSort: { key: SortKey<T>; direction: 'asc' | 'desc' }; onSort: (key: SortKey<T>) => void; }) => {
  const isSorted = currentSort.key === sortKey;
  return (
    <TableHead
      className="cursor-pointer px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-2">
        {children}
        {isSorted ? (
          currentSort.direction === 'asc' ? <ArrowUp className="h-4 w-4 ml-1.5" /> : <ArrowDown className="h-4 w-4 ml-1.5" />
        ) : null}
      </div>
    </TableHead>
  );
};

interface BaseAlertSettingsTableProps<T extends { id: string; vehicleName: string; alerts: Record<string, boolean> }> {
  data: T[];
  setData: React.Dispatch<React.SetStateAction<T[]>>;
  sortConfig: { key: SortKey<T>; direction: 'asc' | 'desc' };
  setSortConfig: React.Dispatch<React.SetStateAction<{ key: SortKey<T>; direction: 'asc' | 'desc' }>>;
  pagination: { pageIndex: number; pageSize: number };
  setPagination: React.Dispatch<React.SetStateAction<{ pageIndex: number; pageSize: number }>>;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  extraColumns?: { key: keyof T; header: string; render: (item: T) => React.ReactNode }[];
  title: string;
}

const BaseAlertSettingsTable = <T extends { id: string; vehicleName: string; alerts: Record<string, boolean> }>({
  data,
  setData,
  sortConfig,
  setSortConfig,
  pagination,
  setPagination,
  searchTerm,
  setSearchTerm,
  extraColumns,
  title,
}: BaseAlertSettingsTableProps<T>) => {
  const { toast } = useToast();

  const handleCheckboxChange = (id: string, alertType: keyof T['alerts'], checked: boolean) => {
    setData(prev => prev.map(item => item.id === id ? { ...item, alerts: { ...item.alerts, [alertType]: checked } } : item));
  };

  const handleSort = (key: SortKey<T>) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedData = useMemo(() => {
    const filtered = data.filter(item => item.vehicleName.toLowerCase().includes(searchTerm.toLowerCase()));
    return [...filtered].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof T];
      const bValue = b[sortConfig.key as keyof T];
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, searchTerm, sortConfig]);

  const paginatedData = sortedData.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize
  );
  const pageCount = Math.ceil(sortedData.length / pagination.pageSize);
  const firstRowIndex = pagination.pageIndex * pagination.pageSize + 1;
  const lastRowIndex = Math.min((pagination.pageIndex + 1) * pagination.pageSize, sortedData.length);

  const handleSaveChanges = () => {
    toast({ title: 'Settings Saved', description: `${title} preferences have been updated.` });
  };

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="px-6 py-4">
        {title === 'SMS Alert' && <p className="text-sm text-purple-600">Note: Each SMS alert 30 paisa only.</p>}
        <div className="flex justify-between items-center mt-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search Vehicle Name" className="pl-9 h-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link to="/settings/fleet">
                <Settings2 className="mr-2 h-4 w-4" />
                Set Threshold
              </Link>
            </Button>
            <Button onClick={handleSaveChanges}>Save Changes</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                <SortableHeader sortKey={'vehicleName' as SortKey<T>} currentSort={sortConfig} onSort={handleSort}>Vehicle Name</SortableHeader>
                {extraColumns?.map(col => (
                  <SortableHeader key={String(col.key)} sortKey={col.key as SortKey<T>} currentSort={sortConfig} onSort={handleSort}>{col.header}</SortableHeader>
                ))}
                {alertKeys.map(alertKey => (
                  <TableHead key={alertKey} className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider capitalize">{alertKey.replace(/([A-Z])/g, ' $1')}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item) => (
                <TableRow key={item.id} className="bg-card hover:bg-muted/50 border-b">
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{item.vehicleName}</TableCell>
                  {extraColumns?.map(col => (
                    <TableCell key={String(col.key)} className="px-6 py-4 whitespace-nowrap">{col.render(item)}</TableCell>
                  ))}
                  {alertKeys.map(key => (
                    <TableCell key={key} className="px-6 py-4 whitespace-nowrap">
                      <Checkbox checked={item.alerts[key]} onCheckedChange={(checked) => handleCheckboxChange(item.id, key, !!checked)} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between py-3 px-6 border-t bg-card">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select value={String(pagination.pageSize)} onValueChange={(value) => setPagination({ pageIndex: 0, pageSize: Number(value) })}>
            <SelectTrigger className="w-20 h-9 text-sm focus:ring-2 focus:ring-primary"><SelectValue placeholder={pagination.pageSize} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{firstRowIndex}-{lastRowIndex} of {sortedData.length}</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPagination(p => ({ ...p, pageIndex: 0 }))} disabled={pagination.pageIndex === 0}><ChevronsLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex - 1 }))} disabled={pagination.pageIndex === 0}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex + 1 }))} disabled={pagination.pageIndex >= pageCount - 1}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPagination(p => ({ ...p, pageIndex: pageCount - 1 }))} disabled={pagination.pageIndex >= pageCount - 1}><ChevronsRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

const NotificationSettings = () => {
  const [smsSettings, setSmsSettings] = useState<SmsAlertSetting[]>(smsSettingsData);
  const [inAppSettings, setInAppSettings] = useState<InAppAlertSetting[]>(inAppSettingsData);
  const [emailSettings, setEmailSettings] = useState<EmailAlertSetting[]>(emailSettingsData);
  const [whatsAppSettings, setWhatsAppSettings] = useState<WhatsAppAlertSetting[]>(whatsAppSettingsData);

  const [smsSearch, setSmsSearch] = useState('');
  const [inAppSearch, setInAppSearch] = useState('');
  const [emailSearch, setEmailSearch] = useState('');
  const [whatsAppSearch, setWhatsAppSearch] = useState('');

  const [smsPagination, setSmsPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [inAppPagination, setInAppPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [emailPagination, setEmailPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [whatsAppPagination, setWhatsAppPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const [smsSort, setSmsSort] = useState<{ key: SortKey<SmsAlertSetting>; direction: 'asc' | 'desc' }>({ key: 'vehicleName', direction: 'asc' });
  const [inAppSort, setInAppSort] = useState<{ key: SortKey<InAppAlertSetting>; direction: 'asc' | 'desc' }>({ key: 'vehicleName', direction: 'asc' });
  const [emailSort, setEmailSort] = useState<{ key: SortKey<EmailAlertSetting>; direction: 'asc' | 'desc' }>({ key: 'vehicleName', direction: 'asc' });
  const [whatsAppSort, setWhatsAppSort] = useState<{ key: SortKey<WhatsAppAlertSetting>; direction: 'asc' | 'desc' }>({ key: 'vehicleName', direction: 'asc' });

  return (
    <Tabs defaultValue="sms-alert">
      <TabsList>
        <TabsTrigger value="sms-alert">SMS Alert</TabsTrigger>
        <TabsTrigger value="in-app-alerts">In-App Alerts</TabsTrigger>
        <TabsTrigger value="email-alerts">Email Alerts</TabsTrigger>
        <TabsTrigger value="whatsapp-alerts">WhatsApp Alerts</TabsTrigger>
      </TabsList>
      <TabsContent value="sms-alert" className="mt-4">
        <BaseAlertSettingsTable
          title="SMS Alert"
          data={smsSettings}
          setData={setSmsSettings}
          sortConfig={smsSort}
          setSortConfig={setSmsSort}
          pagination={smsPagination}
          setPagination={setSmsPagination}
          searchTerm={smsSearch}
          setSearchTerm={setSmsSearch}
          extraColumns={[
            { key: 'alertOnMNo', header: 'Alert on M-No', render: (item) => <Input value={(item as SmsAlertSetting).alertOnMNo} onChange={e => setSmsSettings(prev => prev.map(s => s.id === item.id ? { ...s, alertOnMNo: e.target.value } : s))} className="w-32 h-8" /> }
          ]}
        />
      </TabsContent>
      <TabsContent value="in-app-alerts" className="mt-4">
        <BaseAlertSettingsTable
          title="In-App Alerts"
          data={inAppSettings}
          setData={setInAppSettings}
          sortConfig={inAppSort}
          setSortConfig={setInAppSort}
          pagination={inAppPagination}
          setPagination={setInAppPagination}
          searchTerm={inAppSearch}
          setSearchTerm={setInAppSearch}
        />
      </TabsContent>
      <TabsContent value="email-alerts" className="mt-4">
        <BaseAlertSettingsTable
          title="Email Alerts"
          data={emailSettings}
          setData={setEmailSettings}
          sortConfig={emailSort}
          setSortConfig={setEmailSort}
          pagination={emailPagination}
          setPagination={setEmailPagination}
          searchTerm={emailSearch}
          setSearchTerm={setEmailSearch}
          extraColumns={[
            { key: 'alertOnEmail', header: 'Alert on Email', render: (item) => <Input value={(item as EmailAlertSetting).alertOnEmail} onChange={e => setEmailSettings(prev => prev.map(s => s.id === item.id ? { ...s, alertOnEmail: e.target.value } : s))} className="w-48 h-8" /> }
          ]}
        />
      </TabsContent>
      <TabsContent value="whatsapp-alerts" className="mt-4">
        <BaseAlertSettingsTable
          title="WhatsApp Alerts"
          data={whatsAppSettings}
          setData={setWhatsAppSettings}
          sortConfig={whatsAppSort}
          setSortConfig={setWhatsAppSort}
          pagination={whatsAppPagination}
          setPagination={setWhatsAppPagination}
          searchTerm={whatsAppSearch}
          setSearchTerm={setWhatsAppSearch}
          extraColumns={[
            { key: 'alertOnWhatsAppNo', header: 'Alert on WhatsApp No', render: (item) => <Input value={(item as WhatsAppAlertSetting).alertOnWhatsAppNo} onChange={e => setWhatsAppSettings(prev => prev.map(s => s.id === item.id ? { ...s, alertOnWhatsAppNo: e.target.value } : s))} className="w-32 h-8" /> }
          ]}
        />
      </TabsContent>
    </Tabs>
  );
};

export default NotificationSettings;