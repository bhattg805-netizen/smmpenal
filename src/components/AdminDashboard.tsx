import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Users,
  Coins,
  TrendingUp,
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
  XCircle,
  Megaphone,
  Ticket,
  Percent,
  List,
  FileText,
  UserCheck,
  Globe,
  RotateCcw,
  Clock,
  Shield,
  Activity,
  Settings,
  Sliders,
  Palette,
  Trash2,
  Sun,
  Moon,
  BookOpen,
  QrCode,
  Smartphone,
  Facebook,
  Instagram,
  Youtube,
  Twitter,
  Music,
  Send,
} from 'lucide-react';
import { User, Category, Service, Order, Ticket as TicketType, Coupon, Announcement, ActivityLog } from '../types.ts';
import { AnimatedLogo } from './AnimatedLogo.tsx';
import { applyThemeVariables, themeDefinitions } from '../lib/theme.ts';
import { PRESET_ICONS, getCategoryIcon } from '../lib/icons.tsx';

interface AdminDashboardProps {
  token: string;
  onGoToUserView: () => void;
  onRefreshProfile?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ token, onGoToUserView, onRefreshProfile }) => {
  const [activeTab, setActiveTab] = useState('stats');
  const [adminTheme, setAdminTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('admin_theme') as 'dark' | 'light') || 'dark';
  });

  const toggleAdminTheme = () => {
    const nextTheme = adminTheme === 'dark' ? 'light' : 'dark';
    setAdminTheme(nextTheme);
    localStorage.setItem('admin_theme', nextTheme);
  };

  // Stats / Analytics state
  const [stats, setStats] = useState({
    usersCount: 0,
    ordersCount: 0,
    totalRevenue: 0,
    totalDeposited: 0,
    statusChart: [] as { status: string; count: number }[],
  });

  // Main data states
  const [usersList, setUsersList] = useState<User[]>([]);
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);

  // Child panels and refill requests state
  const [childPanels, setChildPanels] = useState<any[]>([]);
  const [refills, setRefills] = useState<any[]>([]);
  
  // SMM API Providers States
  const [providersList, setProvidersList] = useState<any[]>([]);
  const [newProvider, setNewProvider] = useState({ name: '', apiUrl: '', apiKey: '' });
  const [selectedProviderForEdit, setSelectedProviderForEdit] = useState<any | null>(null);
  const [providerIdToDelete, setProviderIdToDelete] = useState<number | null>(null);
  const [categoryIdToDelete, setCategoryIdToDelete] = useState<number | null>(null);
  const [serviceIdToDelete, setServiceIdToDelete] = useState<number | null>(null);
  const [syncingOrders, setSyncingOrders] = useState(false);

  // Blogs Writing States
  const [blogsList, setBlogsList] = useState<any[]>([]);
  const [fetchingBlogs, setFetchingBlogs] = useState(false);
  const [blogForm, setBlogForm] = useState({
    title: '',
    slug: '',
    content: '',
    status: 'published',
    coverImage: '',
  });
  const [selectedBlogForEdit, setSelectedBlogForEdit] = useState<any | null>(null);
  const [savingBlog, setSavingBlog] = useState(false);
  const [blogIdToDelete, setBlogIdToDelete] = useState<number | null>(null);
  const [blogEditorOpen, setBlogEditorOpen] = useState(false);

  // Modals & Forms states
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryIcon, setEditingCategoryIcon] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [newService, setNewService] = useState({
    categoryId: '',
    name: '',
    description: '',
    price: '',
    min: '10',
    max: '10000',
    providerId: '',
    providerServiceId: '',
    icon: '',
  });
  
  // Editing Service State
  const [selectedServiceForEdit, setSelectedServiceForEdit] = useState<Service | null>(null);

  // SMM Provider Services Importer State
  const [serviceSubTab, setServiceSubTab] = useState<'catalog' | 'importer'>('catalog');
  const [selectedImporterProviderId, setSelectedImporterProviderId] = useState<string>('');
  const [importerServices, setImporterServices] = useState<any[]>([]);
  const [importerLoading, setImporterLoading] = useState<boolean>(false);
  const [importerError, setImporterError] = useState<string>('');
  const [importerSearchQuery, setImporterSearchQuery] = useState<string>('');
  const [selectedImporterServiceIds, setSelectedImporterServiceIds] = useState<Set<any>>(new Set());
  const [priceMultiplier, setPriceMultiplier] = useState<string>('1.5');

  const handleFetchProviderServices = async (providerId: string) => {
    if (!providerId) {
      setImporterServices([]);
      return;
    }
    setImporterLoading(true);
    setImporterError('');
    setSelectedImporterServiceIds(new Set());
    try {
      const res = await fetch(`/api/admin/providers/${providerId}/services`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setImporterServices(data);
      } else {
        setImporterError(data.error || 'Failed to fetch provider services.');
      }
    } catch (err: any) {
      setImporterError(err.message || 'Error loading services.');
    } finally {
      setImporterLoading(false);
    }
  };

  const handleImportSelectedServices = async () => {
    if (selectedImporterServiceIds.size === 0) {
      showError('Please select at least one service to import.');
      return;
    }
    const servicesToImport = importerServices.filter(item => 
      selectedImporterServiceIds.has(item.service)
    );

    try {
      const res = await fetch('/api/admin/services/import-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          services: servicesToImport,
          providerId: parseInt(selectedImporterProviderId),
          priceMultiplier: parseFloat(priceMultiplier) || 1.0,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess(`Successfully imported ${data.count} services!`);
        setSelectedImporterServiceIds(new Set());
        // Refresh SMM services list
        fetchAdminData();
      } else {
        showError(data.error || 'Failed to import services.');
      }
    } catch (err: any) {
      showError(err.message || 'Error during import.');
    }
  };

  const toggleSelectAllImporterServices = (filteredServices: any[]) => {
    const newSelected = new Set(selectedImporterServiceIds);
    const allFilteredSelected = filteredServices.every(item => newSelected.has(item.service));
    
    if (allFilteredSelected) {
      filteredServices.forEach(item => newSelected.delete(item.service));
    } else {
      filteredServices.forEach(item => newSelected.add(item.service));
    }
    setSelectedImporterServiceIds(newSelected);
  };

  // Manual Seller Sync States
  const [selectedSyncProviderId, setSelectedSyncProviderId] = useState<string>('');
  const [syncScope, setSyncScope] = useState<'all' | 'new_only' | 'price_only' | 'selected'>('all');
  const [syncProfitPercentage, setSyncProfitPercentage] = useState<string>('30');
  const [syncPreviewServices, setSyncPreviewServices] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string>('');
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<{ addedCount: number; updatedCount: number; skippedCount: number; totalProcessed: number } | null>(null);
  const [selectedSyncServiceIds, setSelectedSyncServiceIds] = useState<Set<string>>(new Set());
  const [manualSyncIdsStr, setManualSyncIdsStr] = useState<string>('');
  const [syncSearchQuery, setSyncSearchQuery] = useState<string>('');

  // Admin SMM Order Sync Cron Job States
  const [cronState, setCronState] = useState<{
    lastRun: string | null;
    runCount: number;
    status: 'idle' | 'running' | 'success' | 'failed';
    lastSyncedCount: number;
    error: string | null;
    intervalMs: number;
    isActive: boolean;
  } | null>(null);
  const [cronIntervalMinutes, setCronIntervalMinutes] = useState<string>('2');
  const [updatingCronSettings, setUpdatingCronSettings] = useState<boolean>(false);
  const [triggeringCron, setTriggeringCron] = useState<boolean>(false);

  const updateSelectedSyncServiceIds = (newSet: Set<string>) => {
    setSelectedSyncServiceIds(newSet);
    setManualSyncIdsStr(Array.from(newSet).sort().join(', '));
  };

  const handleManualSyncIdsChange = (val: string) => {
    setManualSyncIdsStr(val);
    const parsedIds = val
      .split(/[\s,;]+/)
      .map(id => id.trim().replace('#', ''))
      .filter(id => id.length > 0 && !isNaN(Number(id)));
    setSelectedSyncServiceIds(new Set<string>(parsedIds));
  };

  const handleFetchSyncPreview = async () => {
    if (!selectedSyncProviderId) {
      showError('Please select an SMM Provider first.');
      return;
    }
    setPreviewLoading(true);
    setPreviewError('');
    setSyncResult(null);
    updateSelectedSyncServiceIds(new Set());
    try {
      const res = await fetch(`/api/admin/providers/${selectedSyncProviderId}/services`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setSyncPreviewServices(data);
        showSuccess(`Loaded ${data.length} services from provider inventory!`);
      } else {
        setPreviewError(data.error || 'Failed to retrieve provider list.');
      }
    } catch (err: any) {
      setPreviewError(err.message || 'Network error connecting to provider API.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExecuteSync = async () => {
    if (!selectedSyncProviderId) {
      showError('Please select a provider to sync.');
      return;
    }
    if (syncScope === 'selected' && selectedSyncServiceIds.size === 0) {
      showError('Please select at least one service for "Only Selected Services" scope.');
      return;
    }

    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/admin/services/seller-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          providerId: parseInt(selectedSyncProviderId),
          syncScope,
          profitPercentage: parseFloat(syncProfitPercentage) || 0,
          selectedServiceIds: syncScope === 'selected' ? Array.from(selectedSyncServiceIds) : null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncResult({
          addedCount: data.addedCount,
          updatedCount: data.updatedCount,
          skippedCount: data.skippedCount,
          totalProcessed: data.totalProcessed,
        });
        showSuccess('Manual seller sync executed successfully!');
        fetchAdminData(); // refresh main database catalog in stats and services
      } else {
        showError(data.error || 'Failed to run sync process.');
      }
    } catch (err: any) {
      showError(err.message || 'Error occurred during sync.');
    } finally {
      setSyncing(false);
    }
  };

  const toggleSelectAllSyncServices = (filtered: any[]) => {
    const newSelected = new Set<string>(selectedSyncServiceIds);
    const allSelected = filtered.every(item => newSelected.has(String(item.service)));
    if (allSelected) {
      filtered.forEach(item => newSelected.delete(String(item.service)));
    } else {
      filtered.forEach(item => newSelected.add(String(item.service)));
    }
    updateSelectedSyncServiceIds(newSelected);
  };

  const [newCoupon, setNewCoupon] = useState({ code: '', discountPercent: '' });
  const [newAnn, setNewAnn] = useState({ title: '', content: '', type: 'info' });

  // Users balance/status action state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [balanceInput, setBalanceInput] = useState('');
  const [balanceAction, setBalanceAction] = useState<'add' | 'set'>('add');

  // Search terms
  const [userSearch, setUserSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  // Ticket reply states
  const [activeTicketId, setActiveTicketId] = useState<number | null>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [replyMessage, setReplyMessage] = useState('');

  // Feedback states
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Settings State
  const [panelSettings, setPanelSettings] = useState<any>({
    websiteLogo: '',
    favicon: '',
    websiteName: '',
    defaultLanguage: 'en',
    homepageYoutubeId: '',
    addFundPageContent: '',
    orderIdSkip: '0',
    seoKeywords: '',
    seoDescription: '',
    additionalHeaderCode: '',
    additionalFooterCode: '',
    additionalHeaderCodeAfterLogin: '',
    whatsappNumber: '',
    bharatpePhone: '',
    bharatpeMerchantName: '',
    bharatpeVpa: '',
    bharatpeStatus: 'unlinked',
    stripeStatus: 'enabled',
    paypalStatus: 'enabled',
    usdManualStatus: 'enabled',
    stripePublishableKey: '',
    stripeSecretKey: '',
    paypalClientId: '',
    paypalSecretKey: '',
    phonepeStatus: 'enabled',
    razorpayStatus: 'enabled',
    upiStatus: 'enabled',
    inrStripeStatus: 'enabled',
    inrManualStatus: 'enabled',
    upiDirectVpa: 'admin@upi',
    upiDirectMerchantName: 'SMM QR Business',
    upiDirectQrUrl: 'https://assets.gpay.com/images/default_upi_qr.png',
    phonepeMerchantId: '',
    phonepeSaltKey: '',
    phonepeSaltIndex: '1',
    razorpayKeyId: '',
    razorpayKeySecret: ''
  });

  // BharatPe Linking State
  const [setupStep, setSetupStep] = useState<'intro' | 'mobile' | 'otp'>('intro');
  const [bharatpePhone, setBharatpePhone] = useState('');
  const [bharatpeOTP, setBharatpeOTP] = useState('');
  const [bharatpeMerchantName, setBharatpeMerchantName] = useState('');
  const [bharatpeVpa, setBharatpeVpa] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpSentCode, setOtpSentCode] = useState('');
  const [bpLoading, setBpLoading] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, [token, activeTab]);

  const fetchAdminData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      if (activeTab === 'stats') {
        const res = await fetch('/api/admin/stats', { headers });
        if (res.ok) setStats(await res.json());
      } else if (activeTab === 'users') {
        const res = await fetch('/api/admin/users', { headers });
        if (res.ok) setUsersList(await res.json());
      } else if (activeTab === 'orders') {
        const res = await fetch('/api/admin/orders', { headers });
        if (res.ok) setOrdersList(await res.json());
        fetchCronStatus();
      } else if (activeTab === 'providers') {
        const res = await fetch('/api/admin/providers', { headers });
        if (res.ok) setProvidersList(await res.json());
        fetchCronStatus();
      } else if (activeTab === 'services') {
        const [catRes, srvRes, provRes] = await Promise.all([
          fetch('/api/user/categories', { headers }),
          fetch('/api/admin/services', { headers }), // Fetch COMPLETE admin catalog (with SMM credentials)
          fetch('/api/admin/providers', { headers }), // Fetch SMM providers list for selectors
        ]);
        if (catRes.ok) setCategories(await catRes.json());
        if (srvRes.ok) setServices(await srvRes.json());
        if (provRes.ok) setProvidersList(await provRes.json());
      } else if (activeTab === 'coupons') {
        const res = await fetch('/api/admin/coupons', { headers });
        if (res.ok) setCoupons(await res.json());
      } else if (activeTab === 'tickets') {
        const res = await fetch('/api/admin/tickets', { headers });
        if (res.ok) setTickets(await res.json());
      } else if (activeTab === 'logs') {
        const res = await fetch('/api/admin/logs', { headers });
        if (res.ok) setLogs(await res.json());
      } else if (activeTab === 'child-panels') {
        const res = await fetch('/api/admin/child-panels', { headers });
        if (res.ok) setChildPanels(await res.json());
      } else if (activeTab === 'refills') {
        const res = await fetch('/api/admin/refill-requests', { headers });
        if (res.ok) setRefills(await res.json());
      } else if (activeTab === 'blogs') {
        await fetchBlogs();
      } else if (activeTab === 'settings' || activeTab === 'themes') {
        const [settingsRes, supabaseRes] = await Promise.all([
          fetch('/api/admin/settings', { headers }),
          fetch('/api/admin/supabase-status', { headers }),
        ]);
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setPanelSettings((prev: any) => ({ ...prev, ...data }));
        }
        if (supabaseRes.ok) {
          setSupabaseStatus(await supabaseRes.json());
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCronStatus = async () => {
    try {
      const res = await fetch('/api/admin/cron/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.cronState) {
          setCronState(data.cronState);
          setCronIntervalMinutes(String(Math.round(data.cronState.intervalMs / 1000 / 60 * 10) / 10));
        }
      }
    } catch (err) {
      console.error('Error fetching cron status:', err);
    }
  };

  const handleToggleCron = async () => {
    try {
      const res = await fetch('/api/admin/cron/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ active: !cronState?.isActive }),
      });
      if (res.ok) {
        const data = await res.json();
        showSuccess(data.cronState?.isActive ? 'Automatic background SMM status sync enabled!' : 'Automatic background sync disabled.');
        setCronState(data.cronState);
      } else {
        showError('Failed to toggle background sync status.');
      }
    } catch (err) {
      showError('Network error toggling background sync.');
    }
  };

  const handleTriggerCronSync = async () => {
    setTriggeringCron(true);
    try {
      const res = await fetch('/api/admin/cron/trigger', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Automatic SMM sync triggered successfully! Processed orders count: ${data.cronState?.lastSyncedCount}`);
        setCronState(data.cronState);
        fetchAdminData();
      } else {
        showError(data.error || 'Failed to trigger SMM status sync.');
        if (data.cronState) setCronState(data.cronState);
      }
    } catch (err) {
      showError('Network error triggering background sync.');
    } finally {
      setTriggeringCron(false);
    }
  };

  const handleUpdateCronSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingCronSettings(true);
    try {
      const res = await fetch('/api/admin/cron/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ intervalMinutes: parseFloat(cronIntervalMinutes) }),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Background sync interval updated to ${cronIntervalMinutes} minutes!`);
        setCronState(data.cronState);
      } else {
        showError(data.error || 'Failed to update cron interval.');
      }
    } catch (err) {
      showError('Network error updating sync interval.');
    } finally {
      setUpdatingCronSettings(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 4000);
  };

  const fetchBlogs = async () => {
    setFetchingBlogs(true);
    try {
      const res = await fetch('/api/admin/blogs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setBlogsList(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch blogs:', err);
    } finally {
      setFetchingBlogs(false);
    }
  };

  const handleSaveBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blogForm.title.trim() || !blogForm.slug.trim() || !blogForm.content.trim()) {
      showError('Please fill in title, slug, and content.');
      return;
    }
    setSavingBlog(true);
    try {
      const isEdit = !!selectedBlogForEdit;
      const url = isEdit 
        ? `/api/admin/blogs/${selectedBlogForEdit.id}`
        : '/api/admin/blogs';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(blogForm),
      });

      const data = await res.json();
      if (res.ok) {
        showSuccess(isEdit ? 'Blog post updated successfully!' : 'Blog post created successfully!');
        setBlogEditorOpen(false);
        setSelectedBlogForEdit(null);
        setBlogForm({ title: '', slug: '', content: '', status: 'published', coverImage: '' });
        fetchBlogs();
      } else {
        showError(data.error || 'Failed to save blog post.');
      }
    } catch (err) {
      console.error(err);
      showError('Network error. Failed to save blog post.');
    } finally {
      setSavingBlog(false);
    }
  };

  const handleDeleteBlog = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/blogs/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        showSuccess('Blog post deleted successfully!');
        setBlogIdToDelete(null);
        fetchBlogs();
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to delete blog post.');
      }
    } catch (err) {
      console.error(err);
      showError('Network error. Failed to delete blog post.');
    }
  };

  // Create Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          name: newCategory,
          icon: newCategoryIcon || null,
        }),
      });
      if (res.ok) {
        showSuccess('Category created successfully!');
        setNewCategory('');
        setNewCategoryIcon('');
        fetchAdminData();
      }
    } catch (err) {
      showError('Failed to create category.');
    } finally {
      setLoading(false);
    }
  };

  // Update Category
  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategoryName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editingCategoryName,
          icon: editingCategoryIcon || null,
        }),
      });
      if (res.ok) {
        showSuccess('Category updated successfully!');
        setEditingCategory(null);
        setEditingCategoryName('');
        setEditingCategoryIcon('');
        fetchAdminData();
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to update category.');
      }
    } catch (err) {
      showError('Failed to update category.');
    } finally {
      setLoading(false);
    }
  };

  // Create Service
  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.categoryId || !newService.name || !newService.price) {
      showError('Please fill all required fields.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          categoryId: parseInt(newService.categoryId),
          name: newService.name,
          description: newService.description,
          pricePerThousand: parseFloat(newService.price),
          minAmount: parseInt(newService.min),
          maxAmount: parseInt(newService.max),
          providerId: newService.providerId ? parseInt(newService.providerId) : null,
          providerServiceId: newService.providerServiceId || null,
          icon: newService.icon || null,
        }),
      });
      if (res.ok) {
        showSuccess('Service added successfully!');
        setNewService({
          categoryId: '',
          name: '',
          description: '',
          price: '',
          min: '10',
          max: '10000',
          providerId: '',
          providerServiceId: '',
          icon: '',
        });
        fetchAdminData();
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to add service.');
      }
    } catch (err) {
      showError('Failed to add service.');
    } finally {
      setLoading(false);
    }
  };

  // Update Service
  const handleUpdateService = async (serviceId: number, updatedFields: any) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/services/${serviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedFields),
      });
      if (res.ok) {
        showSuccess('Service updated successfully!');
        setSelectedServiceForEdit(null);
        fetchAdminData();
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to update service.');
      }
    } catch (err) {
      showError('Error updating service.');
    } finally {
      setLoading(false);
    }
  };

  // Delete Service
  const handleDeleteService = async (serviceId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/services/${serviceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showSuccess('Service deleted.');
        setServiceIdToDelete(null);
        fetchAdminData();
      } else {
        showError('Failed to delete service.');
      }
    } catch (err) {
      showError('Error deleting service.');
    } finally {
      setLoading(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (categoryId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showSuccess('Category and all its services deleted successfully.');
        setCategoryIdToDelete(null);
        fetchAdminData();
      } else {
        showError('Failed to delete category.');
      }
    } catch (err) {
      showError('Error deleting category.');
    } finally {
      setLoading(false);
    }
  };

  // Clear Entire Catalog (Bulk delete all categories and services)
  const handleClearCatalog = async () => {
    if (!confirm('WARNING: Are you absolutely sure you want to delete ALL categories and ALL services? This action cannot be undone!')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/clear-catalog', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showSuccess('Entire catalog has been successfully cleared!');
        fetchAdminData();
      } else {
        showError('Failed to clear catalog.');
      }
    } catch (err) {
      showError('Error clearing catalog.');
    } finally {
      setLoading(false);
    }
  };

  // Bulk Delete Selected Categories
  const handleBulkDeleteCategories = async () => {
    if (selectedCategoryIds.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/categories/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: selectedCategoryIds }),
      });
      if (res.ok) {
        showSuccess(`Successfully deleted ${selectedCategoryIds.length} selected categories.`);
        setSelectedCategoryIds([]);
        setShowBulkDeleteConfirm(false);
        fetchAdminData();
      } else {
        const errData = await res.json();
        showError(errData.error || 'Failed to bulk delete selected categories.');
      }
    } catch (err) {
      showError('Error bulk deleting selected categories.');
    } finally {
      setLoading(false);
    }
  };

  // Save SMM Panel Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(panelSettings),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setPanelSettings(data.settings);
        }
        showSuccess('Settings saved successfully!');
        // Refresh site settings on next render
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to update settings.');
      }
    } catch (err) {
      console.error(err);
      showError('Error updating settings.');
    } finally {
      setLoading(false);
    }
  };

  // BharatPe QR Link Handlers
  const handleRequestBharatpeOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bharatpePhone || bharatpePhone.trim().length < 10) {
      showError('Please enter a valid phone number (min 10 digits).');
      return;
    }
    setBpLoading(true);
    try {
      const res = await fetch('/api/admin/bharatpe/request-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone: bharatpePhone }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpRequested(true);
        setSetupStep('otp'); // Set step to otp
        setOtpSentCode(data.otp || '123456');
        showSuccess(data.message || 'OTP Sent successfully!');
      } else {
        showError(data.error || 'Failed to request OTP.');
      }
    } catch (err) {
      showError('Error connecting to gateway.');
    } finally {
      setBpLoading(false);
    }
  };

  const handleVerifyBharatpeOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bharatpeOTP) {
      showError('Please enter the 6-digit verification code.');
      return;
    }
    setBpLoading(true);
    try {
      const res = await fetch('/api/admin/bharatpe/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone: bharatpePhone,
          otp: bharatpeOTP,
          merchantName: bharatpeMerchantName,
          vpa: bharatpeVpa,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.settings) {
          setPanelSettings(data.settings);
        }
        showSuccess(data.message || 'BharatPe account linked successfully!');
        // Reset local form states
        setBharatpeOTP('');
        setOtpRequested(false);
        setOtpSentCode('');
        setSetupStep('intro'); // Reset setup step
      } else {
        showError(data.error || 'Verification failed.');
      }
    } catch (err) {
      showError('Error verifying OTP.');
    } finally {
      setBpLoading(false);
    }
  };

  const handleUnlinkBharatpe = async () => {
    if (!window.confirm('Are you sure you want to unlink your BharatPe merchant account and disable dynamic QR payments?')) {
      return;
    }
    setBpLoading(true);
    try {
      const res = await fetch('/api/admin/bharatpe/unlink', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        if (data.settings) {
          setPanelSettings(data.settings);
        }
        setBharatpePhone('');
        setBharatpeMerchantName('');
        setBharatpeVpa('');
        showSuccess(data.message || 'BharatPe unlinked successfully.');
        setSetupStep('intro'); // Reset setup step to intro
      } else {
        showError(data.error || 'Failed to unlink.');
      }
    } catch (err) {
      showError('Error unlinking.');
    } finally {
      setBpLoading(false);
    }
  };

  // Direct Inline Save of BharatPe Customizations
  const handleSaveBharatpeSettings = async () => {
    setBpLoading(true);
    try {
      const payload = {
        bharatpePhone: panelSettings.bharatpePhone,
        bharatpeMerchantName: panelSettings.bharatpeMerchantName,
        bharatpeVpa: panelSettings.bharatpeVpa,
        bharatpeStatus: panelSettings.bharatpeStatus,
      };
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setPanelSettings(data.settings);
        }
        showSuccess('BharatPe QR customizations saved securely!');
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to save BharatPe changes.');
      }
    } catch (err) {
      showError('Error saving customized settings.');
    } finally {
      setBpLoading(false);
    }
  };

  // Create API Provider
  const handleCreateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProvider.name || !newProvider.apiUrl || !newProvider.apiKey) {
      showError('All fields are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newProvider),
      });
      if (res.ok) {
        showSuccess('SMM Provider registered successfully!');
        setNewProvider({ name: '', apiUrl: '', apiKey: '' });
        fetchAdminData();
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to register provider.');
      }
    } catch (err) {
      showError('Failed to register provider.');
    } finally {
      setLoading(false);
    }
  };

  // Update API Provider
  const handleUpdateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProviderForEdit) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/providers/${selectedProviderForEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: selectedProviderForEdit.name,
          apiUrl: selectedProviderForEdit.apiUrl,
          apiKey: selectedProviderForEdit.apiKey,
        }),
      });
      if (res.ok) {
        showSuccess('Provider settings updated!');
        setSelectedProviderForEdit(null);
        fetchAdminData();
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to update provider.');
      }
    } catch (err) {
      showError('Failed to update provider.');
    } finally {
      setLoading(false);
    }
  };

  // Delete API Provider
  const handleDeleteProvider = async (providerId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/providers/${providerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showSuccess('Provider deleted successfully.');
        setProviderIdToDelete(null);
        fetchAdminData();
      } else {
        showError('Failed to delete provider.');
      }
    } catch (err) {
      showError('Error deleting provider.');
    } finally {
      setLoading(false);
    }
  };

  // Activate dynamic theme
  const handleActivateTheme = async (themeId: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ activeTheme: themeId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPanelSettings((prev: any) => ({ ...prev, activeTheme: themeId }));
          showSuccess(`Theme "${themeId === 'eteral' ? 'eternal' : themeId}" activated successfully!`);
          applyThemeVariables(themeId);
        } else {
          showError(data.error || 'Failed to update theme.');
        }
      } else {
        showError('Failed to save theme setting.');
      }
    } catch (err) {
      showError('Error saving active theme.');
    } finally {
      setLoading(false);
    }
  };

  // Securely Refresh Provider Account Balance from SMM server
  const handleSyncProviderBalance = async (providerId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/providers/${providerId}/balance`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        showSuccess(`Account balance refreshed: ₹${data.balance.toFixed(2)}`);
        fetchAdminData();
      } else {
        const data = await res.json();
        showError(data.error || 'Connection to SMM provider failed.');
      }
    } catch (err) {
      showError('Error syncing provider balance.');
    } finally {
      setLoading(false);
    }
  };

  // Sync SMM Orders
  const handleSyncOrdersStatus = async () => {
    setSyncingOrders(true);
    try {
      const res = await fetch('/api/admin/orders/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        showSuccess(`Successfully synced SMM orders! Statuses updated: ${data.synced}`);
        fetchAdminData();
      } else {
        showError('Sync pipeline returned an error.');
      }
    } catch (err) {
      showError('Failed to trigger background sync.');
    } finally {
      setSyncingOrders(false);
    }
  };

  // Create Coupon
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code || !newCoupon.discountPercent) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: newCoupon.code,
          discountPercent: parseInt(newCoupon.discountPercent),
        }),
      });
      if (res.ok) {
        showSuccess('Coupon code published!');
        setNewCoupon({ code: '', discountPercent: '' });
        fetchAdminData();
      }
    } catch (err) {
      showError('Failed to create coupon.');
    } finally {
      setLoading(false);
    }
  };

  // Create Announcement
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnn.title || !newAnn.content) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newAnn),
      });
      if (res.ok) {
        showSuccess('Announcement broadcasted!');
        setNewAnn({ title: '', content: '', type: 'info' });
      }
    } catch (err) {
      showError('Failed to broadcast announcement.');
    } finally {
      setLoading(false);
    }
  };

  // Update User Balance Manually
  const handleUpdateBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !balanceInput) return;
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          amount: parseFloat(balanceInput),
          action: balanceAction
        }),
      });
      if (res.ok) {
        showSuccess(balanceAction === 'add' ? 'Funds added successfully.' : 'User balance updated.');
        setSelectedUser(null);
        setBalanceInput('');
        fetchAdminData();
      } else {
        const errorData = await res.json();
        showError(errorData.error || 'Failed to update balance.');
      }
    } catch (err) {
      showError('Failed to update balance.');
    }
  };

  // Update User Status
  const handleToggleUserStatus = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showSuccess('User status updated successfully.');
        fetchAdminData();
      }
    } catch (err) {
      showError('Failed to update status.');
    }
  };

  // Update Order Status (Refund occurs in DB if set to cancelled/refunded)
  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        showSuccess(`Order status updated to ${status}.`);
        fetchAdminData();
      }
    } catch (err) {
      showError('Failed to update order status.');
    }
  };

  // Ticket handling
  const handleOpenTicket = async (ticketId: number) => {
    setActiveTicketId(ticketId);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTicketMessages(data.messages);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTicketReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !activeTicketId) return;
    try {
      const res = await fetch(`/api/tickets/${activeTicketId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: replyMessage }),
      });
      if (res.ok) {
        setReplyMessage('');
        handleOpenTicket(activeTicketId);
        showSuccess('Reply submitted.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Recharts color variables
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#6366f1'];

  // Filtering
  const filteredUsers = usersList.filter(u =>
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.name && u.name.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const filteredOrders = ordersList.filter(o => {
    // Status Filter
    if (orderStatusFilter !== 'all') {
      const orderStat = (o.status || '').toLowerCase();
      if (orderStatusFilter === 'pending' && orderStat !== 'pending') return false;
      if (orderStatusFilter === 'processing' && orderStat !== 'processing' && orderStat !== 'inprogress') return false;
      if (orderStatusFilter === 'completed' && orderStat !== 'completed' && orderStat !== 'complete') return false;
      if (orderStatusFilter === 'partial' && orderStat !== 'partial') return false;
      if (orderStatusFilter === 'cancelled' && orderStat !== 'cancelled') return false;
      if (orderStatusFilter === 'refunded' && orderStat !== 'refunded') return false;
    }

    // Search query Filter
    return (
      (o.serviceName && o.serviceName.toLowerCase().includes(orderSearch.toLowerCase())) ||
      o.link.toLowerCase().includes(orderSearch.toLowerCase()) ||
      (o.userEmail && o.userEmail.toLowerCase().includes(orderSearch.toLowerCase()))
    );
  });

  const tabInfo: Record<string, { title: string; subtitle: string }> = {
    stats: { title: 'Analytics & Overview', subtitle: 'Real-time financial velocity, status ratios, and account metrics.' },
    users: { title: 'User Account Ledger', subtitle: 'Manage registered clients, balance credits, roles, and status levels.' },
    orders: { title: 'SMM Order Pipelines', subtitle: 'Track, filter, and manually update social service delivery states.' },
    'child-panels': { title: 'Reseller Child Panels', subtitle: 'Review active white-label domains and monthly renewal requests.' },
    refills: { title: 'Refill Operations', subtitle: 'Manage user refill and auto-replenishment requests for dropped count logs.' },
    providers: { title: 'Connected SMM API Providers', subtitle: 'Register external API endpoints and monitor automated dispatch balances.' },
    services: { title: 'Service Catalog Manager', subtitle: 'Configure social categories, customized pricing matrices, and SMM provider mappings.' },
    'manual-sync': { title: 'Manual Seller Sync Engine', subtitle: 'Directly connect and synchronize provider inventories with custom sync scopes, profit percentages, and real-time mapping actions.' },
    coupons: { title: 'Promotions & Coupons', subtitle: 'Issue deposit discount percentages and monitor promo code activations.' },
    tickets: { title: 'Support & Incident Desk', subtitle: 'Review customer inquiries, reply to support tickets, or close issues.' },
    announcements: { title: 'Broadcast Messages', subtitle: 'Dispatch global site banners, warning announcements, or notification alerts.' },
    blogs: { title: 'Blogs & Articles Writing', subtitle: 'Author and manage high-quality informational articles, SMM tips, and blogs for your registered client base.' },
    logs: { title: 'Platform Security Logs', subtitle: 'View audit logs, admin transactions, and system event timelines.' },
    themes: { title: 'Themes & Visual Branding', subtitle: 'Switch and preview visual color styles for the entire platform interface instantly.' },
    settings: { title: 'SMM Panel Settings', subtitle: 'Configure website branding, logos, SEO descriptors, dynamic YouTube explainers, WhatsApp support links, and global order offset parameters.' },
  };

  return (
    <div className={`min-h-screen bg-[#030712] flex flex-col md:flex-row text-gray-200 transition-colors duration-300 ${adminTheme === 'light' ? 'admin-panel-light' : ''}`}>
      {/* Side Admin Rail */}
      <aside className="w-full md:w-64 bg-[#090d1a] border-r border-white/5 flex flex-col p-6 space-y-8 flex-shrink-0">
        <div className="flex flex-col space-y-2">
          <AnimatedLogo size="md" />
          <span className="text-[10px] font-mono tracking-widest font-bold text-purple-400 bg-purple-500/10 border border-purple-500/25 px-2 py-0.5 rounded-md w-fit">
            ADMIN SUITE
          </span>
        </div>

        <nav className="flex-1 flex flex-col space-y-1 overflow-y-auto max-h-[calc(100vh-220px)] pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {[
            { id: 'stats', label: 'Analytics Dashboard', icon: <TrendingUp className="w-4 h-4 text-emerald-400" /> },
            { id: 'users', label: 'User Ledger', icon: <Users className="w-4 h-4 text-blue-400" /> },
            { id: 'orders', label: 'Order Pipeline', icon: <Coins className="w-4 h-4 text-amber-400" /> },
            { id: 'child-panels', label: 'Reseller Child Panels', icon: <Globe className="w-4 h-4 text-sky-400" /> },
            { id: 'refills', label: 'Refill Requests', icon: <RotateCcw className="w-4 h-4 text-teal-400" /> },
            { id: 'providers', label: 'API Providers', icon: <RefreshCw className="w-4 h-4 text-pink-400" /> },
            { id: 'services', label: 'Catalog Manager', icon: <List className="w-4 h-4 text-indigo-400" /> },
            { id: 'manual-sync', label: 'Manual Seller Sync', icon: <Activity className="w-4 h-4 text-orange-400" /> },
            { id: 'coupons', label: 'Promos & Coupons', icon: <Percent className="w-4 h-4 text-purple-400" /> },
            { id: 'tickets', label: 'Support Desk', icon: <Ticket className="w-4 h-4" /> },
            { id: 'announcements', label: 'System Broadcasts', icon: <Megaphone className="w-4 h-4" /> },
            { id: 'blogs', label: 'Blogs Manager', icon: <BookOpen className="w-4 h-4 text-rose-400" /> },
            { id: 'logs', label: 'Platform Logs', icon: <FileText className="w-4 h-4 text-gray-400" /> },
            { id: 'themes', label: 'Themes & Branding', icon: <Palette className="w-4 h-4 text-rose-400 animate-pulse" /> },
            { id: 'settings', label: 'Panel Settings', icon: <Settings className="w-4 h-4 text-purple-400" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setActiveTicketId(null);
              }}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-purple-600/10 text-purple-400 border-l-2 border-purple-500'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="space-y-3 pt-6 border-t border-white/5">
          <button
            onClick={onGoToUserView}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg flex items-center justify-center space-x-1"
          >
            <span>User Dashboard View</span>
          </button>

          <button
            onClick={async () => {
              try {
                setLoading(true);
                const res = await fetch('/api/user/toggle-role', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                });
                if (res.ok) {
                  showSuccess('Role toggled successfully! Switching to User View...');
                  if (onRefreshProfile) {
                    onRefreshProfile();
                  }
                  setTimeout(() => {
                    onGoToUserView();
                  }, 1000);
                } else {
                  showError('Failed to toggle role.');
                }
              } catch (err) {
                showError('Error toggling role.');
              } finally {
                setLoading(false);
              }
            }}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-xl border border-yellow-500/15 bg-yellow-500/5 hover:bg-yellow-500/10 text-yellow-400 text-xs font-bold transition-all"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Switch Role to User</span>
          </button>
        </div>
      </aside>

      {/* Admin Content Area */}
      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto overflow-y-auto">
        {/* PREMIUM ADMIN HEADER BAR */}
        <div className="mb-8 bg-[#0a0f1d] border border-white/5 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl select-none relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-1 relative z-10">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/15 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-mono tracking-widest font-bold text-gray-400 uppercase">
                Secure Terminal Panel
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              {tabInfo[activeTab]?.title || 'Platform Administration'}
            </h1>
            <p className="text-xs text-gray-400 max-w-2xl">
              {tabInfo[activeTab]?.subtitle || 'Configure system services, sync providers, process active orders, and assist users.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 relative z-10 w-full md:w-auto">
            {/* API Status Cluster */}
            <div className="flex items-center gap-3 bg-[#030712] border border-white/5 px-3 py-2 rounded-xl text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium text-gray-300">API Status: Operational</span>
            </div>

            {/* UTC clock indicator */}
            <div className="flex items-center gap-2 bg-[#030712] border border-white/5 px-3 py-2 rounded-xl text-xs font-mono text-gray-400">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>UTC Year: 2026</span>
            </div>

            {/* Quick Refresh Trigger */}
            <button
              onClick={async () => {
                showSuccess('Refreshing platform databases and syncing states...');
                await fetchAdminData();
              }}
              className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer active:scale-95"
              title="Sync Platform Data Now"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              <span>Sync All</span>
            </button>

            {/* Dark/Light Mode Theme Toggle */}
            <button
              onClick={toggleAdminTheme}
              className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer active:scale-95"
              title={adminTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {adminTheme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-blue-400" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Banner Messages */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center space-x-2 text-sm shadow-md animate-pulse">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center space-x-2 text-sm shadow-md">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 1: ANALYTICS DASHBOARD */}
        {/* ===================================== */}
        {activeTab === 'stats' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Accounts', value: stats.usersCount, icon: <Users className="w-6 h-6 text-purple-400" /> },
                { label: 'Orders Processed', value: stats.ordersCount, icon: <Coins className="w-6 h-6 text-blue-400" /> },
                { label: 'Platform Revenue', value: `₹${stats.totalRevenue.toFixed(2)}`, icon: <TrendingUp className="w-6 h-6 text-emerald-400" /> },
                { label: 'Wallet Deposits', value: `₹${stats.totalDeposited.toFixed(2)}`, icon: <CreditCard className="w-6 h-6 text-indigo-400" /> },
              ].map((m, idx) => (
                <div key={idx} className="glass-card p-6 rounded-2xl border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-gray-400">{m.label}</span>
                    <h3 className="text-2xl font-bold font-mono text-white mt-1">{m.value}</h3>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/5">{m.icon}</div>
                </div>
              ))}
            </div>

            {/* Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-white/5 h-[350px] flex flex-col">
                <h3 className="text-sm font-bold text-white mb-6">Financial Velocity</h3>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Revenue', amount: stats.totalRevenue },
                      { name: 'Deposits', amount: stats.totalDeposited },
                    ]}>
                      <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
                      <YAxis stroke="#9ca3af" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937' }} />
                      <Bar dataKey="amount" fill="#7c3aed" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card p-6 rounded-2xl border border-white/5 h-[350px] flex flex-col">
                <h3 className="text-sm font-bold text-white mb-6">Order Status Breakdown</h3>
                <div className="flex-1 w-full">
                  {stats.statusChart.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.statusChart}
                          dataKey="count"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                        >
                          {stats.statusChart.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937' }} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 text-xs">No active orders.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 2: USER LEDGER */}
        {/* ===================================== */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <h2 className="text-lg font-bold text-white">Registered Users Ledger</h2>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search email or name..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            {/* Manual Balance Adjustment form overlay */}
            {selectedUser && (
              <div className="p-6 rounded-2xl bg-[#0f1527] border border-purple-500/20 max-w-md mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Adjust Balance for {selectedUser.email}</h3>
                  <span className="text-xs text-gray-400">Current: <strong className="text-emerald-400">₹{selectedUser.balance.toFixed(2)}</strong></span>
                </div>

                {/* Toggle between ADD and SET */}
                <div className="flex bg-[#030712] p-1 rounded-xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setBalanceAction('add');
                      setBalanceInput('');
                    }}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                      balanceAction === 'add'
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Add Funds (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBalanceAction('set');
                      setBalanceInput(selectedUser.balance.toString());
                    }}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                      balanceAction === 'set'
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Set Wallet Balance (=)
                  </button>
                </div>

                <form onSubmit={handleUpdateBalance} className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder={balanceAction === 'add' ? 'Enter amount to add (e.g. 500)' : 'Set exact balance (e.g. 1500)'}
                      value={balanceInput}
                      onChange={(e) => setBalanceInput(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-[#030712] border border-white/10 text-white focus:outline-none placeholder-gray-500 text-xs"
                      required
                    />
                    <button type="submit" className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold transition-all">
                      {balanceAction === 'add' ? 'Add Funds' : 'Set Balance'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(null);
                        setBalanceInput('');
                      }}
                      className="px-4 py-2.5 rounded-xl bg-white/5 text-xs text-gray-300 hover:bg-white/10"
                    >
                      Cancel
                    </button>
                  </div>
                  {balanceAction === 'add' && balanceInput && !isNaN(parseFloat(balanceInput)) && (
                    <p className="text-[11px] text-gray-400">
                      New balance will be:{' '}
                      <strong className="text-emerald-400 font-mono">
                        ₹{(selectedUser.balance + parseFloat(balanceInput)).toFixed(2)}
                      </strong>
                    </p>
                  )}
                </form>
              </div>
            )}

            <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">UID (Firebase)</th>
                      <th className="px-6 py-4">Email Address</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4 text-right">Balance</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
                        <td className="px-6 py-4 font-mono text-gray-500">#{u.id}</td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-400 truncate max-w-[120px]">{u.uid}</td>
                        <td className="px-6 py-4 font-semibold text-white">{u.email}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/10 text-blue-400'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-emerald-400">₹{u.balance.toFixed(2)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
                          <button
                            onClick={() => { setSelectedUser(u); setBalanceAction('add'); setBalanceInput(''); }}
                            className="px-2 py-1 rounded bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 text-xs font-bold"
                          >
                            Add/Set Funds
                          </button>
                          <button
                            onClick={() => handleToggleUserStatus(u.id, u.status)}
                            className={`px-2 py-1 rounded text-xs font-bold ${u.status === 'active' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}
                          >
                            {u.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 3: ORDER PIPELINE */}
        {/* ===================================== */}
        {activeTab === 'orders' && (() => {
          const getStatusCount = (statusVal: string) => {
            return ordersList.filter(o => {
              if (statusVal === 'all') return true;
              const orderStat = (o.status || '').toLowerCase();
              if (statusVal === 'pending') return orderStat === 'pending';
              if (statusVal === 'processing') return orderStat === 'processing' || orderStat === 'inprogress';
              if (statusVal === 'completed') return orderStat === 'completed' || orderStat === 'complete';
              if (statusVal === 'partial') return orderStat === 'partial';
              if (statusVal === 'cancelled') return orderStat === 'cancelled';
              if (statusVal === 'refunded') return orderStat === 'refunded';
              return false;
            }).length;
          };

          return (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Full SMM Order Pipeline</h2>
                  <p className="text-xs text-gray-400 mt-1">Manage and sync SMM orders with custom pipeline state filters</p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search user, service or URL..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {[
                  { key: 'all', label: 'All Orders', count: getStatusCount('all'), activeClass: 'bg-white/10 text-white border-white/20', inactiveClass: 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10' },
                  { key: 'pending', label: 'Pending', count: getStatusCount('pending'), activeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30', inactiveClass: 'bg-[#0b101f] text-gray-400 border-white/5 hover:bg-amber-500/5' },
                  { key: 'processing', label: 'In Progress', count: getStatusCount('processing'), activeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30', inactiveClass: 'bg-[#0b101f] text-gray-400 border-white/5 hover:bg-blue-500/5' },
                  { key: 'completed', label: 'Completed', count: getStatusCount('completed'), activeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', inactiveClass: 'bg-[#0b101f] text-gray-400 border-white/5 hover:bg-emerald-500/5' },
                  { key: 'partial', label: 'Partial', count: getStatusCount('partial'), activeClass: 'bg-purple-500/20 text-purple-400 border-purple-500/30', inactiveClass: 'bg-[#0b101f] text-gray-400 border-white/5 hover:bg-purple-500/5' },
                  { key: 'cancelled', label: 'Cancelled', count: getStatusCount('cancelled'), activeClass: 'bg-red-500/20 text-red-400 border-red-500/30', inactiveClass: 'bg-[#0b101f] text-gray-400 border-white/5 hover:bg-red-500/5' },
                  { key: 'refunded', label: 'Refunded', count: getStatusCount('refunded'), activeClass: 'bg-gray-500/20 text-gray-400 border-gray-500/30', inactiveClass: 'bg-[#0b101f] text-gray-500 border-white/5 hover:bg-gray-500/5' }
                ].map(tab => {
                  const isActive = orderStatusFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setOrderStatusFilter(tab.key)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 whitespace-nowrap ${isActive ? tab.activeClass : tab.inactiveClass}`}
                    >
                      <span>{tab.label}</span>
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${isActive ? 'bg-white/15' : 'bg-white/5'}`}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-4">ID</th>
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">Service</th>
                        <th className="px-6 py-4">Seller / API ID</th>
                        <th className="px-6 py-4">Link</th>
                        <th className="px-6 py-4 text-center">Qty</th>
                        <th className="px-6 py-4 text-center">Start Count</th>
                        <th className="px-6 py-4 text-center">Remains</th>
                        <th className="px-6 py-4 text-right">Charge</th>
                        <th className="px-6 py-4 text-center">Pipeline State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map(ord => (
                        <tr key={ord.id} className="border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
                          <td className="px-6 py-4 font-mono text-gray-500">#{ord.id}</td>
                          <td className="px-6 py-4 text-xs font-medium text-gray-300">{ord.userEmail}</td>
                          <td className="px-6 py-4 font-semibold text-white">{ord.serviceName}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col space-y-1 items-start">
                              <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${ord.providerName ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : 'bg-gray-500/10 text-gray-400 border border-white/5'}`}>
                                {ord.providerName || 'Manual'}
                              </span>
                              {ord.providerOrderId && (
                                <span className="font-mono text-[10px] text-gray-400 bg-white/5 border border-white/5 px-1.5 py-0.5 rounded-md">
                                  ID: {ord.providerOrderId}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <a href={ord.link} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline max-w-[150px] truncate block">
                              {ord.link}
                            </a>
                          </td>
                          <td className="px-6 py-4 text-center font-mono">{ord.quantity}</td>
                          <td className="px-6 py-4 text-center font-mono text-gray-300">{ord.startCount}</td>
                          <td className="px-6 py-4 text-center font-mono text-amber-500 font-semibold">{ord.remains}</td>
                          <td className="px-6 py-4 text-right font-mono text-emerald-400 font-bold">₹{ord.charge.toFixed(3)}</td>
                          <td className="px-6 py-4 text-center">
                            <select
                              value={ord.status}
                              onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                              className={`text-xs px-2.5 py-1.5 rounded-xl font-bold focus:outline-none border transition-colors cursor-pointer bg-[#0b101f] ${
                                ord.status === 'completed' || ord.status === 'complete'
                                  ? 'text-emerald-400 border-emerald-500/20 focus:border-emerald-500'
                                  : ord.status === 'pending'
                                  ? 'text-amber-400 border-amber-500/20 focus:border-amber-500'
                                  : ord.status === 'processing' || ord.status === 'inprogress'
                                  ? 'text-blue-400 border-blue-500/20 focus:border-blue-500'
                                  : ord.status === 'partial'
                                  ? 'text-purple-400 border-purple-500/20 focus:border-purple-500'
                                  : ord.status === 'cancelled'
                                  ? 'text-red-400 border-red-500/20 focus:border-red-500'
                                  : 'text-gray-400 border-white/10 focus:border-white/30'
                              }`}
                            >
                              <option value="pending" className="text-amber-400 bg-[#0b101f]">Pending</option>
                              <option value="processing" className="text-blue-400 bg-[#0b101f]">In Progress</option>
                              <option value="completed" className="text-emerald-400 bg-[#0b101f]">Completed</option>
                              <option value="partial" className="text-purple-400 bg-[#0b101f]">Partial</option>
                              <option value="cancelled" className="text-red-400 bg-[#0b101f]">Cancelled (Refund)</option>
                              <option value="refunded" className="text-gray-400 bg-[#0b101f]">Refunded (Wallet)</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ===================================== */}
        {/* TAB: SMM API PROVIDERS */}
        {/* ===================================== */}
        {activeTab === 'providers' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Sync Master Controller Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Manual SMM Order Status Sync */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <RefreshCw className={`w-5 h-5 text-purple-400 ${syncingOrders ? 'animate-spin' : ''}`} />
                    <span>Manual Order Sync Engine</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Directly polls and updates active provider orders with external API statuses (processing, completed, refunded, partial, etc.) from external APIs right now.
                  </p>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-xs text-gray-500">
                    SMM Catalog orders: <span className="text-purple-400 font-bold">{ordersList.length} orders total</span>
                  </div>
                  <button
                    onClick={handleSyncOrdersStatus}
                    disabled={syncingOrders}
                    className={`px-5 py-3 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${
                      syncingOrders
                        ? 'bg-purple-600/20 text-purple-400 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/10'
                    }`}
                  >
                    <RefreshCw className={`w-4 h-4 ${syncingOrders ? 'animate-spin' : ''}`} />
                    <span>{syncingOrders ? 'Syncing...' : 'Sync Order Statuses'}</span>
                  </button>
                </div>
              </div>

              {/* Automated Background SMM Order Status Sync (Cron Job) */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-400 animate-pulse" />
                    <span>Auto-Sync Background Job (Cron)</span>
                  </h2>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                      cronState?.isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {cronState?.isActive ? 'Active' : 'Disabled'}
                    </span>
                    <button
                      onClick={handleToggleCron}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        cronState?.isActive
                          ? 'bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/20'
                          : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/20'
                      }`}
                    >
                      {cronState?.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-[#080d1a] p-3 rounded-xl border border-white/5 space-y-1">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wide">Last Sync Run</span>
                    <span className="text-white font-medium">
                      {cronState?.lastRun ? new Date(cronState.lastRun).toLocaleTimeString() : 'Never'}
                    </span>
                  </div>
                  <div className="bg-[#080d1a] p-3 rounded-xl border border-white/5 space-y-1">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wide">Execution Count</span>
                    <span className="text-white font-medium">{cronState?.runCount || 0} times</span>
                  </div>
                  <div className="bg-[#080d1a] p-3 rounded-xl border border-white/5 space-y-1">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wide">Job Status</span>
                    <span className={`font-bold flex items-center gap-1 ${
                      cronState?.status === 'running' ? 'text-orange-400' :
                      cronState?.status === 'success' ? 'text-emerald-400' :
                      cronState?.status === 'failed' ? 'text-rose-400' : 'text-gray-400'
                    }`}>
                      {cronState?.status ? cronState.status.toUpperCase() : 'IDLE'}
                    </span>
                  </div>
                  <div className="bg-[#080d1a] p-3 rounded-xl border border-white/5 space-y-1">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wide">Last Synced Count</span>
                    <span className="text-white font-medium">{cronState?.lastSyncedCount || 0} orders</span>
                  </div>
                </div>

                {cronState?.error && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[11px] flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">Error: {cronState.error}</span>
                  </div>
                )}

                {/* SMM Interval Setting Form */}
                <form onSubmit={handleUpdateCronSettings} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3 border-t border-white/5">
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-gray-400 text-xs shrink-0 font-bold">Sync Interval (mins):</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      value={cronIntervalMinutes}
                      onChange={(e) => setCronIntervalMinutes(e.target.value)}
                      className="w-20 px-3 py-1.5 rounded-lg bg-[#080d1a] border border-white/10 text-white text-xs focus:outline-none focus:border-orange-500 transition-all text-center"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={updatingCronSettings}
                      className="flex-1 px-3 py-1.5 bg-[#0e1730] hover:bg-orange-600 border border-white/10 hover:border-orange-500 rounded-lg text-white font-bold text-xs transition-all shrink-0"
                    >
                      {updatingCronSettings ? 'Saving...' : 'Set Interval'}
                    </button>
                    <button
                      type="button"
                      onClick={handleTriggerCronSync}
                      disabled={triggeringCron || cronState?.status === 'running'}
                      className="flex-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 rounded-lg text-white font-bold text-xs shadow-lg shadow-orange-500/10 transition-all flex items-center justify-center gap-1 shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${triggeringCron ? 'animate-spin' : ''}`} />
                      <span>Run Now</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Creator Column */}
              <div className="lg:col-span-1 glass-card p-6 rounded-2xl border border-white/5 shadow-2xl h-fit">
                <h3 className="text-md font-bold text-white mb-4 flex items-center space-x-2">
                  <Plus className="w-4 h-4 text-purple-400" />
                  <span>Register SMM Provider</span>
                </h3>
                <form onSubmit={handleCreateProvider} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Provider Name</label>
                    <input
                      type="text"
                      placeholder="e.g. SMMJust"
                      value={newProvider.name}
                      onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">API Endpoint URL</label>
                    <input
                      type="url"
                      placeholder="https://smmprovider.com/api/v2"
                      value={newProvider.apiUrl}
                      onChange={(e) => setNewProvider({ ...newProvider, apiUrl: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Secure API Key</label>
                    <input
                      type="password"
                      placeholder="••••••••••••••••••••"
                      value={newProvider.apiKey}
                      onChange={(e) => setNewProvider({ ...newProvider, apiKey: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>

                  <button type="submit" className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors shadow-md">
                    Connect Provider
                  </button>
                </form>
              </div>

              {/* Provider Registry Column */}
              <div className="lg:col-span-2 glass-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-white/5 font-bold text-white flex justify-between items-center">
                  <span>Connected SMM API Providers</span>
                  <span className="text-xs font-mono text-gray-400">{providersList.length} Active integrations</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-4">ID</th>
                        <th className="px-6 py-4">Provider / API Link</th>
                        <th className="px-6 py-4 text-center">API Key Status</th>
                        <th className="px-6 py-4 text-center">Live Balance</th>
                        <th className="px-6 py-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {providersList.length > 0 ? (
                        providersList.map((prov) => (
                          <tr key={prov.id} className="border-b border-white/5 text-sm hover:bg-white/5 transition-all">
                            <td className="px-6 py-4 font-mono text-gray-500">#{prov.id}</td>
                            <td className="px-6 py-4">
                              <div className="font-bold text-white">{prov.name}</div>
                              <div className="text-xs text-gray-400 mt-0.5 max-w-[220px] truncate font-mono" title={prov.apiUrl}>
                                {prov.apiUrl}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/25">
                                {prov.apiKey ? 'Masked / Encrypted' : 'Missing Key'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {prov.balance !== null && prov.balance !== undefined ? (
                                <span className="font-mono font-bold text-emerald-400">₹{parseFloat(prov.balance).toFixed(2)}</span>
                              ) : (
                                <span className="text-xs text-gray-500">Click Sync</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  onClick={() => handleSyncProviderBalance(prov.id)}
                                  className="px-2 py-1 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded font-bold transition-all"
                                  title="Check SMM account balance securely"
                                >
                                  Sync Balance
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedProviderForEdit({ ...prov, apiKey: '' }); // Reset password field for security
                                  }}
                                  className="px-2.5 py-1 text-xs bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 rounded-lg font-bold transition-all"
                                >
                                  Edit
                                </button>
                                {providerIdToDelete === prov.id ? (
                                  <div className="flex items-center space-x-1.5 bg-red-500/10 p-1 rounded-lg border border-red-500/20 animate-pulse">
                                    <span className="text-[10px] text-red-300 font-bold px-1">Delete?</span>
                                    <button
                                      onClick={() => handleDeleteProvider(prov.id)}
                                      className="px-2 py-0.5 text-[10px] bg-red-600 hover:bg-red-500 text-white rounded font-bold transition-all"
                                    >
                                      Yes
                                    </button>
                                    <button
                                      onClick={() => setProviderIdToDelete(null)}
                                      className="px-2 py-0.5 text-[10px] bg-gray-600 hover:bg-gray-500 text-white rounded font-bold transition-all"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setProviderIdToDelete(prov.id)}
                                    className="px-2.5 py-1 text-xs bg-red-500/15 hover:bg-red-500/25 text-red-400 rounded-lg font-bold transition-all"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-gray-500 text-xs">
                            No SMM providers registered. Add one using the form on the left.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Provider Modal */}
        {selectedProviderForEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#090d1a] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <h3 className="text-md font-bold text-white">Edit SMM Provider #{selectedProviderForEdit.id}</h3>
                <button
                  onClick={() => setSelectedProviderForEdit(null)}
                  className="text-gray-400 hover:text-white font-mono text-lg font-bold transition-colors"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleUpdateProvider} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Provider Name</label>
                  <input
                    type="text"
                    value={selectedProviderForEdit.name}
                    onChange={(e) => setSelectedProviderForEdit({ ...selectedProviderForEdit, name: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0b101f] border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">API Endpoint URL</label>
                  <input
                    type="url"
                    value={selectedProviderForEdit.apiUrl}
                    onChange={(e) => setSelectedProviderForEdit({ ...selectedProviderForEdit, apiUrl: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0b101f] border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                    API Key (Leave blank to keep current masked key)
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••••••••••••••"
                    value={selectedProviderForEdit.apiKey || ''}
                    onChange={(e) => setSelectedProviderForEdit({ ...selectedProviderForEdit, apiKey: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0b101f] border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setSelectedProviderForEdit(null)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Category Modal */}
        {editingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-md p-6 bg-[#0e1325] border border-white/10 rounded-2xl shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-4">Edit Category</h3>
              <form onSubmit={handleUpdateCategory} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Category Name</label>
                  <input
                    type="text"
                    value={editingCategoryName}
                    onChange={(e) => setEditingCategoryName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Category Logo / Icon</label>
                    {editingCategoryIcon && (
                      <button
                        type="button"
                        onClick={() => setEditingCategoryIcon('')}
                        className="text-[10px] text-purple-400 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  
                  {/* Presets Grid */}
                  <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                    {PRESET_ICONS.map((preset) => {
                      const isSelected = editingCategoryIcon === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setEditingCategoryIcon(preset.id)}
                          className={`flex flex-col items-center justify-center p-1.5 rounded-lg border transition-all text-center ${
                            isSelected 
                              ? 'bg-purple-600/20 border-purple-500 text-white' 
                              : 'bg-[#0b101f] border-white/5 text-gray-400 hover:border-white/15 hover:text-white'
                          }`}
                        >
                          <span className="mb-0.5">{getCategoryIcon(preset.id, '', 'w-3.5 h-3.5')}</span>
                          <span className="text-[8px] font-medium truncate w-full">{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <input
                    type="text"
                    placeholder="Or enter custom Emoji (e.g. 🔥) or Image URL"
                    value={editingCategoryIcon}
                    onChange={(e) => setEditingCategoryIcon(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors text-[11px]"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setEditingCategory(null)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 4: CATALOG MANAGER */}
        {/* ===================================== */}
        {activeTab === 'services' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              {/* Category Creator */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 shadow-2xl">
                <h3 className="text-md font-bold text-white mb-4 flex items-center space-x-2">
                  <Plus className="w-4 h-4 text-purple-400" />
                  <span>Create Category</span>
                </h3>
                <form onSubmit={handleCreateCategory} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Category Name</label>
                    <input
                      type="text"
                      placeholder="TikTok High retention"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Category Logo / Icon</label>
                      {newCategoryIcon && (
                        <button
                          type="button"
                          onClick={() => setNewCategoryIcon('')}
                          className="text-[10px] text-purple-400 hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    
                    {/* Presets Grid */}
                    <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                      {PRESET_ICONS.map((preset) => {
                        const isSelected = newCategoryIcon === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setNewCategoryIcon(preset.id)}
                            className={`flex flex-col items-center justify-center p-1.5 rounded-lg border transition-all text-center ${
                              isSelected 
                                ? 'bg-purple-600/20 border-purple-500 text-white' 
                                : 'bg-[#0b101f] border-white/5 text-gray-400 hover:border-white/15 hover:text-white'
                            }`}
                          >
                            <span className="mb-0.5">{getCategoryIcon(preset.id, '', 'w-3.5 h-3.5')}</span>
                            <span className="text-[8px] font-medium truncate w-full">{preset.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <input
                      type="text"
                      placeholder="Or enter custom Emoji (e.g. 🔥) or Image URL"
                      value={newCategoryIcon}
                      onChange={(e) => setNewCategoryIcon(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors text-[11px]"
                    />
                  </div>

                  <button type="submit" className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-xs">
                    Create Category
                  </button>
                </form>
              </div>

              {/* Manage Categories */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-md font-bold text-white flex items-center space-x-2">
                    <Palette className="w-4 h-4 text-purple-400" />
                    <span>Manage Categories</span>
                  </h3>
                  {categories.length > 0 && (
                    <span className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded-full font-mono">
                      {categories.length} total
                    </span>
                  )}
                </div>

                {categories.length > 0 && (
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5 text-xs">
                    <label className="flex items-center space-x-2.5 cursor-pointer select-none text-gray-300 hover:text-white transition-colors">
                      <input
                        type="checkbox"
                        checked={categories.length > 0 && selectedCategoryIds.length === categories.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCategoryIds(categories.map((c) => c.id));
                          } else {
                            setSelectedCategoryIds([]);
                            setShowBulkDeleteConfirm(false);
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-600 bg-black/40 text-purple-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                      <span className="font-semibold text-gray-300">Select All</span>
                    </label>

                    {selectedCategoryIds.length > 0 && (
                      <div className="flex items-center">
                        {showBulkDeleteConfirm ? (
                          <div className="flex items-center space-x-1.5 bg-red-600/10 p-1 rounded-lg border border-red-500/20 animate-pulse">
                            <span className="text-[9px] text-red-300 font-bold px-1">Delete Selected?</span>
                            <button
                              type="button"
                              onClick={handleBulkDeleteCategories}
                              className="px-2 py-0.5 text-[9px] bg-red-600 hover:bg-red-500 text-white rounded font-bold transition-all"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowBulkDeleteConfirm(false)}
                              className="px-2 py-0.5 text-[9px] bg-gray-600 hover:bg-gray-500 text-white rounded font-bold transition-all"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowBulkDeleteConfirm(true)}
                            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600 border border-red-500/20 text-red-400 hover:text-white font-bold text-[10px] transition-all"
                            title="Delete selected categories and all their services"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete Selected ({selectedCategoryIds.length})</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {categories.length === 0 ? (
                  <p className="text-xs text-gray-400">No categories created yet.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {categories.map((cat) => {
                      const serviceCount = services.filter((s) => s.categoryId === cat.id).length;
                      const isSelected = selectedCategoryIds.includes(cat.id);
                      return (
                        <div
                          key={cat.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedCategoryIds((prev) => prev.filter((id) => id !== cat.id));
                            } else {
                              setSelectedCategoryIds((prev) => [...prev, cat.id]);
                            }
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl bg-[#0b101f] border transition-all text-xs cursor-pointer select-none ${isSelected ? 'border-purple-500/40 bg-purple-500/5' : 'border-white/5 hover:border-white/10'}`}
                        >
                          <div className="flex items-center space-x-3 flex-1 min-w-0 mr-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="w-4 h-4 rounded border-gray-600 bg-black/40 text-purple-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                            />
                            <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-lg bg-white/5 border border-white/5 text-gray-400">
                              {getCategoryIcon(cat.icon, cat.name, 'w-3.5 h-3.5')}
                            </div>
                            <div className="flex flex-col truncate">
                              <span className="font-bold text-gray-200 truncate">{cat.name}</span>
                              <span className="text-[10px] text-gray-400 font-mono mt-0.5">{serviceCount} {serviceCount === 1 ? 'service' : 'services'}</span>
                            </div>
                          </div>
                          {categoryIdToDelete === cat.id ? (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center space-x-1.5 bg-red-500/10 p-1.5 rounded-lg border border-red-500/20 animate-pulse flex-shrink-0"
                            >
                              <span className="text-[9px] text-red-300 font-bold px-1">Delete?</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCategory(cat.id);
                                }}
                                className="px-2 py-0.5 text-[9px] bg-red-600 hover:bg-red-500 text-white rounded font-bold transition-all"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCategoryIdToDelete(null);
                                }}
                                className="px-2 py-0.5 text-[9px] bg-gray-600 hover:bg-gray-500 text-white rounded font-bold transition-all"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCategory(cat);
                                  setEditingCategoryName(cat.name);
                                  setEditingCategoryIcon(cat.icon || '');
                                }}
                                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-[10px] font-bold transition-all border border-white/5"
                                title="Edit category"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCategoryIdToDelete(cat.id);
                                }}
                                className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg text-[10px] font-bold transition-all border border-red-500/10"
                                title="Delete category and all its services"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bulk Actions / Danger Zone */}
              <div className="glass-card p-6 rounded-2xl border border-red-500/10 bg-red-950/5 shadow-2xl space-y-4">
                <div className="flex items-start space-x-2">
                  <Trash2 className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider">Bulk Catalog Purge</h3>
                    <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                      Wipe the entire services and categories database clean to build your custom catalog from scratch.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearCatalog}
                  className="w-full py-2.5 rounded-xl bg-red-600/15 hover:bg-red-600 text-red-400 hover:text-white font-bold text-xs border border-red-500/20 hover:border-red-600 transition-all"
                >
                  Delete All Categories & Services
                </button>
              </div>

              {/* Service Creator */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 shadow-2xl">
                <h3 className="text-md font-bold text-white mb-4 flex items-center space-x-2">
                  <Plus className="w-4 h-4 text-purple-400" />
                  <span>Create Service</span>
                </h3>
                <form onSubmit={handleCreateService} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Category</label>
                    <select
                      value={newService.categoryId}
                      onChange={(e) => setNewService({ ...newService, categoryId: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white focus:outline-none"
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Service Name</label>
                    <input
                      type="text"
                      placeholder="Instagram Likes [Instant / Max 100K]"
                      value={newService.name}
                      onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Description</label>
                    <textarea
                      rows={2}
                      placeholder="Start time: 0-1 hour, Non Drop guarantee."
                      value={newService.description}
                      onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Service Logo / Icon (Optional)</label>
                      {newService.icon && (
                        <button
                          type="button"
                          onClick={() => setNewService({ ...newService, icon: '' })}
                          className="text-[10px] text-purple-400 hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    
                    {/* Presets Grid */}
                    <div className="grid grid-cols-6 gap-1.5 mb-2.5">
                      {PRESET_ICONS.map((preset) => {
                        const isSelected = newService.icon === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setNewService({ ...newService, icon: preset.id })}
                            className={`flex flex-col items-center justify-center p-1 rounded-lg border transition-all text-center ${
                              isSelected 
                                ? 'bg-purple-600/20 border-purple-500 text-white' 
                                : 'bg-[#0b101f] border-white/5 text-gray-400 hover:border-white/15 hover:text-white'
                            }`}
                          >
                            <span className="mb-0.5">{getCategoryIcon(preset.id, '', 'w-3 h-3')}</span>
                            <span className="text-[7px] font-medium truncate w-full">{preset.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <input
                      type="text"
                      placeholder="Or enter custom Emoji (e.g. 🔥) or Image URL"
                      value={newService.icon}
                      onChange={(e) => setNewService({ ...newService, icon: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors text-[11px]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Price/1K (INR/Base)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="1.25"
                        value={newService.price}
                        onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Min Qty</label>
                      <input
                        type="number"
                        value={newService.min}
                        onChange={(e) => setNewService({ ...newService, min: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white font-mono text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Max Qty</label>
                      <input
                        type="number"
                        value={newService.max}
                        onChange={(e) => setNewService({ ...newService, max: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white font-mono text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">SMM Provider</label>
                      <select
                        value={newService.providerId}
                        onChange={(e) => setNewService({ ...newService, providerId: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none"
                      >
                        <option value="">Manual Processing</option>
                        {providersList.map((prov) => (
                          <option key={prov.id} value={prov.id}>{prov.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Provider Service ID</label>
                      <input
                        type="text"
                        placeholder="e.g. 1954"
                        value={newService.providerServiceId}
                        onChange={(e) => setNewService({ ...newService, providerServiceId: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white font-mono text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <button type="submit" className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors shadow-md">
                    Publish Service
                  </button>
                </form>
              </div>
            </div>

            {/* Catalog List */}
            <div className="lg:col-span-2 glass-card rounded-2xl border border-white/5 overflow-hidden">
              {/* Header with Sub-Tabs */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center border-b border-white/5 bg-[#0e1424]/40 p-4 gap-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setServiceSubTab('catalog')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                      serviceSubTab === 'catalog'
                        ? 'bg-purple-600/25 text-purple-400 border border-purple-500/30'
                        : 'text-gray-400 hover:text-white border border-transparent'
                    }`}
                  >
                    <List className="w-4 h-4" />
                    <span>Curated SMM Catalog</span>
                  </button>
                  <button
                    onClick={() => setServiceSubTab('importer')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                      serviceSubTab === 'importer'
                        ? 'bg-purple-600/25 text-purple-400 border border-purple-500/30'
                        : 'text-gray-400 hover:text-white border border-transparent'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>SMM API Importer</span>
                  </button>
                </div>
                <div className="text-xs font-mono text-gray-400 flex items-center space-x-1 justify-end">
                  {serviceSubTab === 'catalog' ? (
                    <span>{services.length} Packages registered</span>
                  ) : (
                    <span>Import remote SMM folders instantly</span>
                  )}
                </div>
              </div>

              {serviceSubTab === 'catalog' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-4">ID</th>
                        <th className="px-6 py-4">Service Name</th>
                        <th className="px-6 py-4 text-right">Price / 1K</th>
                        <th className="px-6 py-4 text-center">Limits</th>
                        <th className="px-6 py-4 text-center">SMM API Link</th>
                        <th className="px-6 py-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map(srv => {
                        const linkedProvider = providersList.find(p => p.id === srv.providerId);
                        return (
                          <tr key={srv.id} className="border-b border-white/5 text-sm hover:bg-white/5 transition-all">
                            <td className="px-6 py-4 font-mono text-gray-500">#{srv.id}</td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-white">{srv.name}</div>
                              {srv.description && (
                                <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[200px]" title={srv.description}>
                                  {srv.description}
                                </p>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-emerald-400 font-bold">₹{srv.pricePerThousand.toFixed(2)}</td>
                            <td className="px-6 py-4 text-center font-mono text-xs text-gray-400">{srv.minAmount} &ndash; {srv.maxAmount}</td>
                            <td className="px-6 py-4 text-center">
                              {linkedProvider ? (
                                <div className="flex flex-col items-center">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                    {linkedProvider.name}
                                  </span>
                                  <span className="text-[9px] font-mono text-gray-500 mt-0.5">API-ID: {srv.providerServiceId}</span>
                                </div>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                  Manual Dispatch
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex justify-center space-x-2">
                                <button
                                  onClick={() => setSelectedServiceForEdit(srv)}
                                  className="px-2 py-1 text-xs bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 rounded-lg font-bold transition-all"
                                >
                                  Edit
                                </button>
                                {serviceIdToDelete === srv.id ? (
                                  <div className="flex items-center space-x-1.5 bg-red-500/10 p-1 rounded-lg border border-red-500/20 animate-pulse">
                                    <span className="text-[10px] text-red-300 font-bold px-1">Delete?</span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteService(srv.id)}
                                      className="px-2 py-0.5 text-[10px] bg-red-600 hover:bg-red-500 text-white rounded font-bold transition-all"
                                    >
                                      Yes
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setServiceIdToDelete(null)}
                                      className="px-2 py-0.5 text-[10px] bg-gray-600 hover:bg-gray-500 text-white rounded font-bold transition-all"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setServiceIdToDelete(srv.id)}
                                    className="px-2 py-1 text-xs bg-red-500/15 hover:bg-red-500/25 text-red-400 rounded-lg font-bold transition-all"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* Importer Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-[#0b101f]/80 p-4 rounded-xl border border-white/5">
                    <div className="md:col-span-4">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                        1. Select SMM Provider
                      </label>
                      <select
                        value={selectedImporterProviderId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedImporterProviderId(val);
                          handleFetchProviderServices(val);
                        }}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#080d1a] border border-white/10 text-white text-xs focus:outline-none"
                      >
                        <option value="">-- Choose SMM Provider --</option>
                        {providersList.map((prov) => (
                          <option key={prov.id} value={prov.id}>{prov.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                        2. Price Multiplier
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-2.5 text-xs text-gray-400 font-bold">x</span>
                        <input
                          type="number"
                          step="0.05"
                          min="1.0"
                          placeholder="1.50"
                          value={priceMultiplier}
                          onChange={(e) => setPriceMultiplier(e.target.value)}
                          className="w-full pl-7 pr-4 py-2.5 rounded-xl bg-[#080d1a] border border-white/10 text-white text-xs font-mono focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-5">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                        3. Search / Filter Remote List
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Search TikTok, Instagram, Likes, etc..."
                          value={importerSearchQuery}
                          onChange={(e) => setImporterSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#080d1a] border border-white/10 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Loading State */}
                  {importerLoading && (
                    <div className="py-20 flex flex-col items-center justify-center space-y-4">
                      <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
                      <p className="text-sm font-semibold text-gray-400 animate-pulse">
                        Querying SMM provider's remote service inventory...
                      </p>
                    </div>
                  )}

                  {/* Error State */}
                  {importerError && (
                    <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-3 text-red-400">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <div className="text-xs leading-relaxed">
                        <p className="font-bold">Failed to connect to API endpoint</p>
                        <p className="opacity-90">{importerError}</p>
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {!importerLoading && !importerError && !selectedImporterProviderId && (
                    <div className="py-16 text-center border border-dashed border-white/5 rounded-xl">
                      <Globe className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-400 font-medium">No SMM Provider Selected</p>
                      <p className="text-xs text-gray-500 mt-1">Select an active provider above to pull service listings in real-time.</p>
                    </div>
                  )}

                  {/* Services Loaded Table */}
                  {!importerLoading && !importerError && selectedImporterProviderId && importerServices.length > 0 && (() => {
                    const query = importerSearchQuery.toLowerCase().trim();
                    const filtered = importerServices.filter(item => {
                      const name = (item.name || '').toLowerCase();
                      const cat = (item.category || '').toLowerCase();
                      const srvId = String(item.service);
                      return name.includes(query) || cat.includes(query) || srvId === query;
                    });

                    return (
                      <div className="space-y-4">
                        {/* Summary / Actions row */}
                        <div className="flex flex-col sm:flex-row justify-between items-center bg-[#0e1424]/40 p-4 rounded-xl border border-white/5 gap-4">
                          <div className="text-xs text-gray-400">
                            Showing <span className="font-bold text-white">{filtered.length}</span> of{' '}
                            <span className="font-bold text-white">{importerServices.length}</span> remote SMM services folder items.
                            {selectedImporterServiceIds.size > 0 && (
                              <span className="ml-2 text-purple-400 font-bold">
                                ({selectedImporterServiceIds.size} selected for import)
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                const newSelected = new Set(selectedImporterServiceIds);
                                filtered.forEach(item => newSelected.add(item.service));
                                setSelectedImporterServiceIds(newSelected);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all"
                            >
                              Select Page
                            </button>
                            <button
                              onClick={() => {
                                const newSelected = new Set(selectedImporterServiceIds);
                                filtered.forEach(item => newSelected.delete(item.service));
                                setSelectedImporterServiceIds(newSelected);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all"
                            >
                              Clear Page
                            </button>
                            <button
                              onClick={handleImportSelectedServices}
                              disabled={selectedImporterServiceIds.size === 0}
                              className={`px-4 py-1.5 rounded-lg font-bold text-xs shadow-lg transition-all flex items-center space-x-1.5 ${
                                selectedImporterServiceIds.size > 0
                                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/10'
                                  : 'bg-white/5 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              <Plus className="w-4.5 h-4.5" />
                              <span>Import Selected ({selectedImporterServiceIds.size})</span>
                            </button>
                          </div>
                        </div>

                        {/* Importer List Table */}
                        <div className="max-h-[500px] overflow-y-auto rounded-xl border border-white/5">
                          <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-[#080c16] z-10">
                              <tr className="border-b border-white/10 bg-[#080c16] text-gray-400 text-xs font-bold uppercase tracking-wider">
                                <th className="px-4 py-3 text-center w-12">
                                  <input
                                    type="checkbox"
                                    checked={filtered.length > 0 && filtered.every(item => selectedImporterServiceIds.has(item.service))}
                                    onChange={() => toggleSelectAllImporterServices(filtered)}
                                    className="rounded border-white/20 bg-gray-900 text-purple-600 focus:ring-purple-500"
                                  />
                                </th>
                                <th className="px-4 py-3 w-16 text-center">ID</th>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3">Service Name</th>
                                <th className="px-4 py-3 text-right">Provider Rate</th>
                                <th className="px-4 py-3 text-right text-purple-400">Our Cost</th>
                                <th className="px-4 py-3 text-center">Min/Max</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filtered.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="text-center py-12 text-xs text-gray-500">
                                    No services matching filter found.
                                  </td>
                                </tr>
                              ) : (
                                filtered.map(item => {
                                  const isSelected = selectedImporterServiceIds.has(item.service);
                                  const multiplier = parseFloat(priceMultiplier) || 1.0;
                                  const originalRate = parseFloat(item.rate) || 0;
                                  const ourCost = originalRate * multiplier;

                                  return (
                                    <tr
                                      key={item.service}
                                      onClick={() => {
                                        const newSelected = new Set(selectedImporterServiceIds);
                                        if (newSelected.has(item.service)) {
                                          newSelected.delete(item.service);
                                        } else {
                                          newSelected.add(item.service);
                                        }
                                        setSelectedImporterServiceIds(newSelected);
                                      }}
                                      className={`border-b border-white/5 text-xs hover:bg-white/5 transition-all cursor-pointer ${
                                        isSelected ? 'bg-purple-600/5' : ''
                                      }`}
                                    >
                                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => {
                                            const newSelected = new Set(selectedImporterServiceIds);
                                            if (newSelected.has(item.service)) {
                                              newSelected.delete(item.service);
                                            } else {
                                              newSelected.add(item.service);
                                            }
                                            setSelectedImporterServiceIds(newSelected);
                                          }}
                                          className="rounded border-white/20 bg-gray-900 text-purple-600 focus:ring-purple-500"
                                        />
                                      </td>
                                      <td className="px-4 py-3 text-center font-mono text-gray-500">{item.service}</td>
                                      <td className="px-4 py-3">
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/5 text-gray-300 border border-white/10">
                                          {item.category || 'Default'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 font-semibold text-white max-w-[220px] truncate" title={item.name}>
                                        {item.name}
                                      </td>
                                      <td className="px-4 py-3 text-right font-mono text-gray-400">₹{originalRate.toFixed(4)}</td>
                                      <td className="px-4 py-3 text-right font-mono text-emerald-400 font-bold">₹{ourCost.toFixed(4)}</td>
                                      <td className="px-4 py-3 text-center font-mono text-[10px] text-gray-500">
                                        {item.min} / {item.max}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Service Edit Modal overlay */}
        {selectedServiceForEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-[#090d1a] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <h3 className="text-md font-bold text-white">Edit Service Package #{selectedServiceForEdit.id}</h3>
                <button
                  onClick={() => setSelectedServiceForEdit(null)}
                  className="text-gray-400 hover:text-white font-mono text-lg font-bold transition-colors"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Service Name</label>
                  <input
                    type="text"
                    value={selectedServiceForEdit.name}
                    onChange={(e) => setSelectedServiceForEdit({ ...selectedServiceForEdit, name: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0b101f] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={selectedServiceForEdit.description || ''}
                    onChange={(e) => setSelectedServiceForEdit({ ...selectedServiceForEdit, description: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0b101f] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Price / 1K (INR/Base)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={selectedServiceForEdit.pricePerThousand}
                      onChange={(e) => setSelectedServiceForEdit({ ...selectedServiceForEdit, pricePerThousand: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-[#0b101f] border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Category</label>
                    <select
                      value={selectedServiceForEdit.categoryId}
                      onChange={(e) => setSelectedServiceForEdit({ ...selectedServiceForEdit, categoryId: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-[#0b101f] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Min Qty</label>
                    <input
                      type="number"
                      value={selectedServiceForEdit.minAmount}
                      onChange={(e) => setSelectedServiceForEdit({ ...selectedServiceForEdit, minAmount: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-[#0b101f] border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Max Qty</label>
                    <input
                      type="number"
                      value={selectedServiceForEdit.maxAmount}
                      onChange={(e) => setSelectedServiceForEdit({ ...selectedServiceForEdit, maxAmount: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-[#0b101f] border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Link to SMM Provider</label>
                    <select
                      value={selectedServiceForEdit.providerId || ''}
                      onChange={(e) => setSelectedServiceForEdit({ ...selectedServiceForEdit, providerId: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full px-4 py-2 bg-[#0b101f] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Manual Processing</option>
                      {providersList.map(prov => (
                        <option key={prov.id} value={prov.id}>{prov.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Provider Service ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 1954"
                      value={selectedServiceForEdit.providerServiceId || ''}
                      onChange={(e) => setSelectedServiceForEdit({ ...selectedServiceForEdit, providerServiceId: e.target.value || null })}
                      className="w-full px-4 py-2 bg-[#0b101f] border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Service Logo / Icon (Optional)</label>
                    {selectedServiceForEdit.icon && (
                      <button
                        type="button"
                        onClick={() => setSelectedServiceForEdit({ ...selectedServiceForEdit, icon: '' })}
                        className="text-[10px] text-purple-400 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  
                  {/* Presets Grid */}
                  <div className="grid grid-cols-6 gap-1.5 mb-2.5">
                    {PRESET_ICONS.map((preset) => {
                      const isSelected = selectedServiceForEdit.icon === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setSelectedServiceForEdit({ ...selectedServiceForEdit, icon: preset.id })}
                          className={`flex flex-col items-center justify-center p-1 rounded-lg border transition-all text-center ${
                            isSelected 
                              ? 'bg-purple-600/20 border-purple-500 text-white' 
                              : 'bg-[#0b101f] border-white/5 text-gray-400 hover:border-white/15 hover:text-white'
                          }`}
                        >
                          <span className="mb-0.5">{getCategoryIcon(preset.id, '', 'w-3 h-3')}</span>
                          <span className="text-[7px] font-medium truncate w-full">{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <input
                    type="text"
                    placeholder="Or enter custom Emoji (e.g. 🔥) or Image URL"
                    value={selectedServiceForEdit.icon || ''}
                    onChange={(e) => setSelectedServiceForEdit({ ...selectedServiceForEdit, icon: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors text-[11px]"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setSelectedServiceForEdit(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateService(selectedServiceForEdit.id, {
                    name: selectedServiceForEdit.name,
                    description: selectedServiceForEdit.description,
                    pricePerThousand: selectedServiceForEdit.pricePerThousand,
                    categoryId: selectedServiceForEdit.categoryId,
                    minAmount: selectedServiceForEdit.minAmount,
                    maxAmount: selectedServiceForEdit.maxAmount,
                    providerId: selectedServiceForEdit.providerId,
                    providerServiceId: selectedServiceForEdit.providerServiceId,
                    icon: selectedServiceForEdit.icon || null,
                  })}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 5: PROMOS & COUPONS */}
        {/* ===================================== */}
        {activeTab === 'coupons' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 glass-card p-6 rounded-2xl border border-white/5 shadow-2xl h-fit">
              <h3 className="text-md font-bold text-white mb-4">Create Promocode</h3>
              <form onSubmit={handleCreateCoupon} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Code</label>
                  <input
                    type="text"
                    placeholder="BOOST20"
                    value={newCoupon.code}
                    onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Discount Percentage</label>
                  <input
                    type="number"
                    placeholder="20"
                    value={newCoupon.discountPercent}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discountPercent: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none"
                  />
                </div>
                <button type="submit" className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-xs">
                  Publish Coupon
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 glass-card rounded-2xl border border-white/5 overflow-hidden">
              <div className="p-4 border-b border-white/5 font-bold text-white">Active Promo Coupon Registry</div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Coupon Code</th>
                      <th className="px-6 py-4 text-center">Discount</th>
                      <th className="px-6 py-4 text-center">Usages</th>
                      <th className="px-6 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map(cp => (
                      <tr key={cp.id} className="border-b border-white/5 text-sm">
                        <td className="px-6 py-4 font-bold font-mono text-purple-400">{cp.code}</td>
                        <td className="px-6 py-4 text-center font-mono text-emerald-400 font-bold">{cp.discountPercent}%</td>
                        <td className="px-6 py-4 text-center font-mono">{cp.usageCount}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400">
                            {cp.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 6: SUPPORT DESK */}
        {/* ===================================== */}
        {activeTab === 'tickets' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 glass-card p-6 rounded-2xl border border-white/5 shadow-2xl">
              <h3 className="text-md font-bold text-white mb-4">Support Tickets Registry</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {tickets.length > 0 ? (
                  tickets.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleOpenTicket(t.id)}
                      className={`w-full p-4 rounded-xl text-left border transition-all text-xs flex justify-between items-center ${
                        activeTicketId === t.id
                          ? 'bg-purple-600/10 border-purple-500'
                          : 'bg-white/5 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-white truncate max-w-[150px]">{t.subject}</div>
                        <div className="text-[10px] text-gray-500 mt-1 font-mono">#{t.id} &middot; {t.userEmail}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        t.status === 'open' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {t.status}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500 text-xs">No active tickets.</div>
                )}
              </div>
            </div>

            {/* Conversation Thread */}
            <div className="lg:col-span-2">
              {activeTicketId ? (
                <div className="glass-card rounded-2xl border border-white/5 flex flex-col h-[500px] shadow-2xl overflow-hidden">
                  <div className="p-4 border-b border-white/5 bg-white/5 font-bold text-white flex justify-between items-center">
                    <span>Support Ticket Thread #{activeTicketId}</span>
                    <button
                      onClick={() => handleUpdateOrderStatus(activeTicketId, 'closed')}
                      className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded text-[10px] font-bold transition-all"
                    >
                      Close Ticket
                    </button>
                  </div>
                  <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                    {ticketMessages.map(msg => {
                      const isAdminMsg = msg.senderRole === 'admin';
                      return (
                        <div key={msg.id} className={`flex flex-col ${isAdminMsg ? 'items-end' : 'items-start'}`}>
                          <div className={`p-4 rounded-2xl max-w-sm text-sm leading-relaxed ${
                            isAdminMsg
                              ? 'bg-purple-600 text-white'
                              : 'bg-blue-600/10 border border-blue-500/20 text-blue-300'
                          }`}>
                            <p>{msg.message}</p>
                          </div>
                          <span className="text-[10px] text-gray-500 mt-1 font-mono pl-1 pr-1">
                            {msg.senderName || 'Sender'} &middot; {new Date(msg.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <form onSubmit={handleTicketReply} className="p-4 border-t border-white/5 flex gap-2">
                    <input
                      type="text"
                      placeholder="Type official admin reply..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                    />
                    <button type="submit" className="p-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-colors">
                      Reply
                    </button>
                  </form>
                </div>
              ) : (
                <div className="glass-card rounded-2xl border border-white/5 h-[500px] flex flex-col items-center justify-center text-center text-gray-500">
                  <Ticket className="w-12 h-12 text-gray-600 mb-3" />
                  <p className="text-sm">Select an active ticket from the left column to view/respond to client threads.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 7: SYSTEM BROADCASTS */}
        {/* ===================================== */}
        {activeTab === 'announcements' && (
          <div className="max-w-xl mx-auto glass-card p-8 rounded-2xl border border-white/5 shadow-2xl h-fit">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center space-x-2">
              <Megaphone className="w-5 h-5 text-purple-400" />
              <span>Broadcast System Announcement</span>
            </h2>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Announcement Title</label>
                <input
                  type="text"
                  placeholder="🔥 Promocode Active!"
                  value={newAnn.title}
                  onChange={(e) => setNewAnn({ ...newAnn, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Detailed Content</label>
                <textarea
                  rows={4}
                  placeholder="Enter details text..."
                  value={newAnn.content}
                  onChange={(e) => setNewAnn({ ...newAnn, content: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Display Style / Urgency</label>
                <select
                  value={newAnn.type}
                  onChange={(e) => setNewAnn({ ...newAnn, type: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white focus:outline-none"
                >
                  <option value="info">Info (Blue banner)</option>
                  <option value="success">Success (Emerald banner)</option>
                  <option value="warning">Warning (Amber banner)</option>
                  <option value="danger">Danger (Red banner)</option>
                </select>
              </div>

              <button type="submit" className="w-full py-4 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-sm shadow-lg shadow-purple-500/10">
                Broadcast Announcement
              </button>
            </form>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB: BLOGS MANAGER */}
        {/* ===================================== */}
        {activeTab === 'blogs' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Articles & Blog Posts</h2>
                <p className="text-xs text-gray-400 mt-1">Publish marketing articles, SEO copy, tutorials, and panel updates for your audience.</p>
              </div>
              <button
                onClick={() => {
                  setSelectedBlogForEdit(null);
                  setBlogForm({ title: '', slug: '', content: '', status: 'published', coverImage: '' });
                  setBlogEditorOpen(true);
                }}
                className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all shadow-lg shadow-purple-600/15 flex items-center space-x-2 w-fit"
              >
                <Plus className="w-4 h-4" />
                <span>Create Blog Post</span>
              </button>
            </div>

            {/* Error/Success Feedbacks */}
            {successMsg && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Blogs List Table */}
            <div className="glass-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5 text-gray-400 font-bold uppercase tracking-wide">
                      <th className="px-6 py-4">Cover</th>
                      <th className="px-6 py-4">Post Info</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Created At</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {fetchingBlogs ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-gray-500">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-400" />
                          <p className="mt-2 text-xs">Loading blog directory...</p>
                        </td>
                      </tr>
                    ) : blogsList.length > 0 ? (
                      blogsList.map((blog) => (
                        <tr key={blog.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            {blog.coverImage ? (
                              <img
                                src={blog.coverImage}
                                alt={blog.title}
                                referrerPolicy="no-referrer"
                                className="w-12 h-8 rounded-lg object-cover border border-white/10"
                              />
                            ) : (
                              <div className="w-12 h-8 rounded-lg bg-[#0b101f] border border-white/5 flex items-center justify-center text-[8px] font-mono text-gray-500">
                                NO COV
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-white text-sm hover:text-purple-400 transition-colors">
                              {blog.title}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-1 font-mono">
                              slug: {blog.slug} &middot; Author: {blog.authorName || 'Admin'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                blog.status === 'published'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/10'
                              }`}
                            >
                              {blog.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-gray-400">
                            {new Date(blog.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-3">
                              <button
                                onClick={() => {
                                  setSelectedBlogForEdit(blog);
                                  setBlogForm({
                                    title: blog.title,
                                    slug: blog.slug,
                                    content: blog.content,
                                    status: blog.status,
                                    coverImage: blog.coverImage || '',
                                  });
                                  setBlogEditorOpen(true);
                                }}
                                className="text-blue-400 hover:text-blue-300 font-semibold text-xs"
                              >
                                Edit
                              </button>
                              
                              {blogIdToDelete === blog.id ? (
                                <div className="flex items-center space-x-2 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg">
                                  <span className="text-[10px] text-red-400 font-bold uppercase">Confirm?</span>
                                  <button
                                    onClick={() => handleDeleteBlog(blog.id)}
                                    className="text-red-500 hover:text-red-400 font-bold text-[10px] underline"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setBlogIdToDelete(null)}
                                    className="text-gray-400 hover:text-white text-[10px] underline"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setBlogIdToDelete(blog.id)}
                                  className="text-red-400 hover:text-red-300 font-semibold text-xs flex items-center space-x-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-gray-500 text-xs">
                          No blog posts created yet. Get started by clicking "Create Blog Post".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Blog Post Editor Drawer/Modal */}
            {blogEditorOpen && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                <div className="bg-[#090d1a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                  {/* Header */}
                  <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">
                      {selectedBlogForEdit ? 'Edit Blog Post' : 'Create New Blog Post'}
                    </h3>
                    <button
                      onClick={() => setBlogEditorOpen(false)}
                      className="text-gray-400 hover:text-white font-semibold text-xs"
                    >
                      Close
                    </button>
                  </div>

                  {/* Form Content */}
                  <form onSubmit={handleSaveBlog} className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Title */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">
                          Post Title
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 5 SMM Growth Hacks for Instagram"
                          value={blogForm.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            const suggestedSlug = val
                              .toLowerCase()
                              .replace(/[^a-z0-9-_]/g, '-')
                              .replace(/-+/g, '-');
                            
                            setBlogForm({
                              ...blogForm,
                              title: val,
                              // Auto-suggest slug only when writing a new post
                              slug: selectedBlogForEdit ? blogForm.slug : suggestedSlug,
                            });
                          }}
                          className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                        />
                      </div>

                      {/* Slug */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">
                          URL Slug (SEO Friendly)
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="instagram-smm-growth-hacks"
                          value={blogForm.slug}
                          onChange={(e) => setBlogForm({ ...blogForm, slug: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Cover Image */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">
                          Cover Image URL (optional)
                        </label>
                        <input
                          type="url"
                          placeholder="https://images.unsplash.com/photo-..."
                          value={blogForm.coverImage}
                          onChange={(e) => setBlogForm({ ...blogForm, coverImage: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                        />
                      </div>

                      {/* Status */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">
                          Publication Status
                        </label>
                        <select
                          value={blogForm.status}
                          onChange={(e) => setBlogForm({ ...blogForm, status: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white focus:outline-none focus:border-purple-500 transition-colors font-semibold"
                        >
                          <option value="published">Published (Visible to all clients)</option>
                          <option value="draft">Draft (Admin eyes only)</option>
                        </select>
                      </div>
                    </div>

                    {/* Blog Content */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">
                        Article Content (Markdown or plain text)
                      </label>
                      <textarea
                        required
                        rows={10}
                        placeholder="Write your article here..."
                        value={blogForm.content}
                        onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors resize-none font-sans text-sm leading-relaxed"
                      />
                    </div>

                    {/* Submit Actions */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-white/5 bg-white/[0.01] -mx-6 -mb-6 p-6">
                      <button
                        type="button"
                        onClick={() => setBlogEditorOpen(false)}
                        className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-xs transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingBlog}
                        className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-lg flex items-center space-x-2"
                      >
                        {savingBlog && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        <span>{savingBlog ? 'Saving...' : 'Save Blog Post'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 8: PLATFORM LOGS */}
        {/* ===================================== */}
        {activeTab === 'logs' && (
          <div className="glass-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h2 className="text-lg font-bold text-white">Platform Activity Audits</h2>
              <button onClick={fetchAdminData} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Audit Details</th>
                    <th className="px-6 py-4">IP Address</th>
                    <th className="px-6 py-4">Audit Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length > 0 ? (
                    logs.map(log => (
                      <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
                        <td className="px-6 py-4 font-mono text-gray-500">#{log.id}</td>
                        <td className="px-6 py-4 font-semibold text-white">{log.userEmail || 'System / Visitor'}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/15 text-purple-300">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-300 max-w-sm truncate">{log.details}</td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-400">{log.ipAddress}</td>
                        <td className="px-6 py-4 text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-500">No activity logs recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 9: RESELLER CHILD PANELS */}
        {/* ===================================== */}
        {activeTab === 'child-panels' && (
          <div className="glass-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl space-y-6">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Globe className="w-5 h-5 text-sky-400" />
                  <span>Reseller Child Panels Management</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Approve, configure, and manage white-label child panels ordered by resellers.
                </p>
              </div>
              <button onClick={fetchAdminData} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Reseller User</th>
                    <th className="px-6 py-4">Domain</th>
                    <th className="px-6 py-4">Currency</th>
                    <th className="px-6 py-4">Admin Account</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                  {childPanels.length > 0 ? (
                    childPanels.map((panel) => (
                      <tr key={panel.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="px-6 py-4 font-mono text-gray-500">#{panel.id}</td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white">{panel.userName}</div>
                          <div className="text-xs text-gray-400 font-mono">{panel.userEmail}</div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-sky-400 flex items-center space-x-1 mt-1.5">
                          <Globe className="w-3.5 h-3.5" />
                          <span>{panel.domain}</span>
                        </td>
                        <td className="px-6 py-4 font-mono">{panel.currency}</td>
                        <td className="px-6 py-4 font-mono text-xs">
                          <div>User: {panel.adminUsername}</div>
                          <div className="text-gray-500">Pass: {panel.adminPassword}</div>
                        </td>
                        <td className="px-6 py-4 font-mono font-semibold">₹{Number(panel.price).toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              panel.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : panel.status === 'pending'
                                ? 'bg-blue-500/10 text-blue-400'
                                : 'bg-red-500/10 text-red-400'
                            }`}
                          >
                            {panel.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {panel.status !== 'active' && (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/admin/child-panels/${panel.id}/status`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      Authorization: `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({ status: 'active' }),
                                  });
                                  if (res.ok) {
                                    showSuccess('Child panel activated successfully!');
                                    fetchAdminData();
                                  } else {
                                    showError('Failed to activate child panel.');
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-colors"
                            >
                              Activate
                            </button>
                          )}
                          {panel.status !== 'expired' && (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/admin/child-panels/${panel.id}/status`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      Authorization: `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({ status: 'expired' }),
                                  });
                                  if (res.ok) {
                                    showSuccess('Child panel marked as expired.');
                                    fetchAdminData();
                                  } else {
                                    showError('Failed to update status.');
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] transition-colors"
                            >
                              Expire
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-gray-500">No reseller child panels found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 10: REFILL REQUESTS */}
        {/* ===================================== */}
        {activeTab === 'refills' && (
          <div className="glass-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl space-y-6">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <RotateCcw className="w-5 h-5 text-teal-400" />
                  <span>Refill Requests Queue</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Manage dropped followers/likes replenish requests and update their dispatch statuses.
                </p>
              </div>
              <button onClick={fetchAdminData} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Refill ID</th>
                    <th className="px-6 py-4">Order ID</th>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Service</th>
                    <th className="px-6 py-4">Link</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                  {refills.length > 0 ? (
                    refills.map((req) => (
                      <tr key={req.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="px-6 py-4 font-mono text-gray-500">#{req.id}</td>
                        <td className="px-6 py-4 font-mono text-purple-400">#{req.orderId}</td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white">{req.userName}</div>
                          <div className="text-xs text-gray-400 font-mono">{req.userEmail}</div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-white max-w-[200px] truncate">
                          {req.serviceName}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs truncate max-w-[150px]">
                          <a href={req.link} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                            {req.link}
                          </a>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              req.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : req.status === 'processing'
                                ? 'bg-amber-500/10 text-amber-400'
                                : req.status === 'rejected'
                                ? 'bg-red-500/10 text-red-400'
                                : 'bg-blue-500/10 text-blue-400'
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {req.status !== 'processing' && req.status !== 'completed' && (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/admin/refill-requests/${req.id}/status`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      Authorization: `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({ status: 'processing' }),
                                  });
                                  if (res.ok) {
                                    showSuccess('Refill request marked as processing.');
                                    fetchAdminData();
                                  } else {
                                    showError('Failed to update refill status.');
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] transition-colors"
                            >
                              Process
                            </button>
                          )}
                          {req.status !== 'completed' && (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/admin/refill-requests/${req.id}/status`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      Authorization: `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({ status: 'completed' }),
                                  });
                                  if (res.ok) {
                                    showSuccess('Refill request completed successfully!');
                                    fetchAdminData();
                                  } else {
                                    showError('Failed to complete refill request.');
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-colors"
                            >
                              Complete
                            </button>
                          )}
                          {req.status !== 'rejected' && req.status !== 'completed' && (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/admin/refill-requests/${req.id}/status`, {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      Authorization: `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({ status: 'rejected' }),
                                  });
                                  if (res.ok) {
                                    showSuccess('Refill request rejected.');
                                    fetchAdminData();
                                  } else {
                                    showError('Failed to reject refill request.');
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] transition-colors"
                            >
                              Reject
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-500">No refill requests found in queue.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB: MANUAL SELLER SYNC ENGINE */}
        {/* ===================================== */}
        {activeTab === 'manual-sync' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-12">
            {/* Sync Control & Configuration */}
            <div className="lg:col-span-4 space-y-6">
              <div className="glass-card p-6 rounded-2xl border border-white/5 shadow-2xl space-y-6">
                <h3 className="text-md font-bold text-white flex items-center space-x-2">
                  <Sliders className="w-5 h-5 text-orange-400" />
                  <span>Sync Configurations</span>
                </h3>

                {/* Seller Select */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                    1. Select SMM Seller
                  </label>
                  <select
                    value={selectedSyncProviderId}
                    onChange={(e) => {
                      setSelectedSyncProviderId(e.target.value);
                      setSyncPreviewServices([]);
                      setSyncResult(null);
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-[#080d1a] border border-white/10 text-white text-xs focus:outline-none focus:border-orange-500 transition-all"
                  >
                    <option value="">-- Choose SMM Provider --</option>
                    {providersList.map((prov) => (
                      <option key={prov.id} value={prov.id}>
                        {prov.name} (Balance: ₹{parseFloat(prov.balance || '0').toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sync Scope */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
                    2. Sync Scope
                  </label>
                  <div className="space-y-2.5">
                    {[
                      { id: 'all', title: 'Sync All Services', desc: 'Add brand new items & update price/limits of matched ones' },
                      { id: 'new_only', title: 'New Services Only', desc: 'Only import services not already in our catalog' },
                      { id: 'price_only', title: 'Price & Limits Only', desc: 'Only update customer prices & amount boundaries' },
                      { id: 'selected', title: 'Only Selected Services', desc: 'Manually check specific services from list below to import' },
                    ].map((scope) => (
                      <label
                        key={scope.id}
                        onClick={() => setSyncScope(scope.id as any)}
                        className={`flex items-start space-x-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          syncScope === scope.id
                            ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                            : 'bg-[#080d1a]/50 border-white/5 text-gray-400 hover:bg-white/5'
                        }`}
                      >
                        <input
                          type="radio"
                          name="syncScope"
                          checked={syncScope === scope.id}
                          onChange={() => {}}
                          className="mt-0.5 text-orange-600 focus:ring-orange-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-white">{scope.title}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{scope.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Dynamic Service IDs Input field for high usability */}
                  {syncScope === 'selected' && (
                    <div className="mt-3 p-3.5 bg-[#080c16]/90 border border-orange-500/15 rounded-xl space-y-2">
                      <label className="block text-[10px] font-bold text-orange-400 uppercase tracking-wider">
                        Selected SMM Service IDs
                      </label>
                      <textarea
                        rows={3}
                        value={manualSyncIdsStr}
                        onChange={(e) => handleManualSyncIdsChange(e.target.value)}
                        placeholder="Type or paste SMM Service IDs (e.g. 101, 102, 350)"
                        className="w-full p-2.5 rounded-lg bg-[#040710] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-orange-500/50 resize-none"
                      />
                      <div className="flex justify-between items-center text-[9px] text-gray-500 leading-normal">
                        <span>Tip: Separate with commas or spaces.</span>
                        <span className="font-bold text-orange-400">{selectedSyncServiceIds.size} selected</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Profit Margin */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                    3. Profit Percentage Markup
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="30"
                      value={syncProfitPercentage}
                      onChange={(e) => setSyncProfitPercentage(e.target.value)}
                      className="w-full pl-4 pr-12 py-2.5 rounded-xl bg-[#080d1a] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-orange-500 transition-all"
                    />
                    <span className="absolute right-4 top-3 text-xs font-bold text-gray-500">%</span>
                  </div>

                  {/* Profit Presets */}
                  <div className="flex gap-2 mt-2">
                    {['15', '30', '50', '100'].map((percent) => (
                      <button
                        key={percent}
                        type="button"
                        onClick={() => setSyncProfitPercentage(percent)}
                        className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                          syncProfitPercentage === percent
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'
                        }`}
                      >
                        +{percent}%
                      </button>
                    ))}
                  </div>

                  {/* Live Cost Preview Block */}
                  <div className="mt-3 p-3 bg-[#080c16] rounded-xl border border-white/5 space-y-1.5 text-[10px]">
                    <div className="text-gray-400 font-bold uppercase tracking-wider">Example markup math:</div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Provider base cost:</span>
                      <span className="font-mono text-white">₹10.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Margin markup:</span>
                      <span className="font-mono text-orange-400">+{syncProfitPercentage || '0'}%</span>
                    </div>
                    <div className="flex justify-between border-t border-white/5 pt-1 font-bold">
                      <span className="text-gray-400">Our Catalog Price:</span>
                      <span className="font-mono text-emerald-400">
                        ₹{(10 * (1 + (parseFloat(syncProfitPercentage) || 0) / 100)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleFetchSyncPreview}
                    disabled={previewLoading || syncing || !selectedSyncProviderId}
                    className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white border border-white/10 transition-all flex items-center justify-center space-x-2 disabled:opacity-40"
                  >
                    <RefreshCw className={`w-4 h-4 ${previewLoading ? 'animate-spin' : ''}`} />
                    <span>Preview Remote Listings</span>
                  </button>

                  <button
                    onClick={handleExecuteSync}
                    disabled={syncing || previewLoading || !selectedSyncProviderId}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-xs font-bold text-white tracking-wider uppercase transition-all shadow-lg shadow-orange-500/10 flex items-center justify-center space-x-2 disabled:opacity-40"
                  >
                    <Activity className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    <span>Run Sync Operations</span>
                  </button>
                </div>
              </div>

              {/* Sync Results Feedback Card */}
              {syncResult && (
                <div className="glass-card p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 shadow-2xl space-y-4">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Sync Task Completed</span>
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-[#0b101f]/80 p-3 rounded-xl border border-white/5">
                      <div className="text-xl font-bold font-mono text-emerald-400">{syncResult.addedCount}</div>
                      <div className="text-[10px] text-gray-400 mt-1">Imported</div>
                    </div>
                    <div className="bg-[#0b101f]/80 p-3 rounded-xl border border-white/5">
                      <div className="text-xl font-bold font-mono text-blue-400">{syncResult.updatedCount}</div>
                      <div className="text-[10px] text-gray-400 mt-1">Updated</div>
                    </div>
                    <div className="bg-[#0b101f]/80 p-3 rounded-xl border border-white/5">
                      <div className="text-xl font-bold font-mono text-gray-400">{syncResult.skippedCount}</div>
                      <div className="text-[10px] text-gray-400 mt-1">Skipped</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-center text-gray-500">
                    A total of <span className="font-bold text-white">{syncResult.totalProcessed}</span> services evaluated successfully.
                  </div>
                </div>
              )}
            </div>

            {/* Remote Inventory Workspace Preview */}
            <div className="lg:col-span-8 glass-card rounded-2xl border border-white/5 overflow-hidden">
              <div className="p-4 border-b border-white/5 bg-[#0e1424]/40 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-orange-400" />
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Remote SMM Inventory Preview</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Real-time mapping & cost simulations for selected seller</p>
                  </div>
                </div>

                {/* Filter */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search remote listings..."
                    value={syncSearchQuery}
                    onChange={(e) => setSyncSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-[#080d1a] border border-white/10 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {previewLoading && (
                <div className="py-24 flex flex-col items-center justify-center space-y-4">
                  <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
                  <p className="text-sm font-semibold text-gray-400 animate-pulse">
                    Querying seller inventory and retrieving pricing matrices...
                  </p>
                </div>
              )}

              {previewError && (
                <div className="p-6 m-6 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-3 text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold">Failed to load remote listings</p>
                    <p className="opacity-90">{previewError}</p>
                  </div>
                </div>
              )}

              {!previewLoading && !previewError && syncPreviewServices.length === 0 && (
                <div className="py-24 text-center border border-dashed border-white/5 m-6 rounded-2xl bg-[#080c16]/50">
                  <Globe className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-sm text-gray-400 font-semibold">No SMM Seller Preview Loaded</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
                    Choose an SMM Seller on the left control panel and click "Preview Remote Listings" to run live mapping before sync.
                  </p>
                </div>
              )}

              {!previewLoading && !previewError && syncPreviewServices.length > 0 && (() => {
                const query = syncSearchQuery.toLowerCase().trim();
                const filtered = syncPreviewServices.filter((item) => {
                  const name = (item.name || '').toLowerCase();
                  const cat = (item.category || '').toLowerCase();
                  const srvId = String(item.service);
                  return name.includes(query) || cat.includes(query) || srvId === query;
                });

                return (
                  <div className="p-4 space-y-4">
                    {/* Header summary info & toggle all for selected scope */}
                    <div className="flex flex-col sm:flex-row justify-between items-center bg-[#080d1a] p-3 rounded-xl border border-white/5 gap-3 text-xs">
                      <div className="text-gray-400">
                        Matching: <span className="font-bold text-white">{filtered.length}</span> of{' '}
                        <span className="font-bold text-white">{syncPreviewServices.length}</span> services.
                        {selectedSyncServiceIds.size > 0 && (
                          <span className="ml-2 text-orange-400 font-bold bg-orange-500/10 px-2 py-0.5 rounded-lg border border-orange-500/20 animate-pulse">
                            ({selectedSyncServiceIds.size} checked for sync)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            const newSelected = new Set<string>(selectedSyncServiceIds);
                            filtered.forEach(item => newSelected.add(String(item.service)));
                            updateSelectedSyncServiceIds(newSelected);
                            if (syncScope !== 'selected') {
                              setSyncScope('selected');
                            }
                          }}
                          className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] font-bold text-white transition-all border border-white/10"
                        >
                          Check All Matching
                        </button>
                        <button
                          onClick={() => {
                            const newSelected = new Set<string>(selectedSyncServiceIds);
                            filtered.forEach(item => newSelected.delete(String(item.service)));
                            updateSelectedSyncServiceIds(newSelected);
                          }}
                          className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] font-bold text-white transition-all border border-white/10"
                        >
                          Uncheck All
                        </button>
                      </div>
                    </div>

                    {/* Preview Table */}
                    <div className="max-h-[500px] overflow-y-auto rounded-xl border border-white/5">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-[#080c16] z-10">
                          <tr className="border-b border-white/10 bg-[#080c16] text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                            <th className="px-4 py-3 text-center w-12">Select</th>
                            <th className="px-4 py-3 w-16 text-center">ID</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Service Name</th>
                            <th className="px-4 py-3 text-right">Seller Cost</th>
                            <th className="px-4 py-3 text-right text-orange-400">Our Cost</th>
                            <th className="px-4 py-3 text-center">Min / Max</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center py-12 text-xs text-gray-500">
                                No remote services match your search query.
                              </td>
                            </tr>
                          ) : (
                            filtered.map((item) => {
                              const srvIdStr = String(item.service);
                              const isSelected = selectedSyncServiceIds.has(srvIdStr);
                              const originalRate = parseFloat(item.rate) || 0;
                              const markupPercent = parseFloat(syncProfitPercentage) || 0;
                              const ourCost = originalRate * (1 + markupPercent / 100);

                              return (
                                <tr
                                  key={srvIdStr}
                                  onClick={() => {
                                    const newSelected = new Set<string>(selectedSyncServiceIds);
                                    if (newSelected.has(srvIdStr)) {
                                      newSelected.delete(srvIdStr);
                                    } else {
                                      newSelected.add(srvIdStr);
                                    }
                                    updateSelectedSyncServiceIds(newSelected);
                                    if (syncScope !== 'selected') {
                                      setSyncScope('selected');
                                    }
                                  }}
                                  className={`border-b border-white/5 text-xs hover:bg-[#121b33] transition-all cursor-pointer ${
                                    isSelected ? 'bg-orange-500/5 text-orange-400 font-medium' : ''
                                  }`}
                                >
                                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {
                                        const newSelected = new Set<string>(selectedSyncServiceIds);
                                        if (newSelected.has(srvIdStr)) {
                                          newSelected.delete(srvIdStr);
                                        } else {
                                          newSelected.add(srvIdStr);
                                        }
                                        updateSelectedSyncServiceIds(newSelected);
                                        if (syncScope !== 'selected') {
                                          setSyncScope('selected');
                                        }
                                      }}
                                      className="rounded border-white/20 bg-gray-900 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-center font-mono text-gray-500">#{srvIdStr}</td>
                                  <td className="px-4 py-3">
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/5 text-gray-300 border border-white/10 truncate max-w-[120px] block" title={item.category}>
                                      {item.category || 'Uncategorized'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 font-semibold text-white max-w-[200px] truncate" title={item.name}>
                                    {item.name}
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono text-gray-400">₹{originalRate.toFixed(4)}</td>
                                  <td className="px-4 py-3 text-right font-mono text-emerald-400 font-bold">₹{ourCost.toFixed(4)}</td>
                                  <td className="px-4 py-3 text-center font-mono text-[10px] text-gray-500">
                                    {item.min} &ndash; {item.max}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB: THEMES & VISUAL BRANDING */}
        {/* ===================================== */}
        {activeTab === 'themes' && (
          <div className="space-y-8 pb-12">
            {/* Intro Header */}
            <div className="glass-card p-6 rounded-2xl border border-white/5 bg-gradient-to-r from-rose-950/20 to-purple-950/20">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-400">
                  <Palette className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Visual Themes & Branding</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Select a dynamic appearance preset for your SMM panel. Selecting a theme immediately propagates custom CSS variables to all users on the platform.
                  </p>
                </div>
              </div>
            </div>

            {/* Theme Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  id: 'default',
                  name: 'Cosmic Slate',
                  description: 'The standard premium high-tech look. Deep grays paired with rich blues and cosmic purple highlights.',
                  bgClass: 'bg-[#030712]',
                  cardClass: 'bg-[#111827]/70',
                  primary: '#2563eb',
                  accent: '#7c3aed',
                  borderColor: 'rgba(255, 255, 255, 0.05)',
                  tags: ['Modern', 'Balanced', 'Professional'],
                },
                {
                  id: 'light',
                  name: 'Royal Crystal (White Theme)',
                  description: 'A crisp, premium alabaster white theme. Features high-contrast slate-indigo highlights, clean shadows, and an ultra-professional light mode design.',
                  bgClass: 'bg-[#f8fafc]',
                  cardClass: 'bg-white',
                  primary: '#4f46e5',
                  accent: '#7c3aed',
                  borderColor: 'rgba(15, 23, 42, 0.08)',
                  tags: ['Clean', 'White Theme', 'Daylight Mode'],
                },
                {
                  id: 'eternal',
                  name: 'Eternal Indigo',
                  description: 'A deep space lavender theme. Features elegant dark purple canvas layers with magenta and fuchsia triggers.',
                  bgClass: 'bg-[#090314]',
                  cardClass: 'bg-[#180c2d]/70',
                  primary: '#a855f7',
                  accent: '#ec4899',
                  borderColor: 'rgba(168, 85, 247, 0.15)',
                  tags: ['Atmospheric', 'Immersive', 'Royal Purple'],
                },
                {
                  id: 'grace',
                  name: 'Grace Rose',
                  description: 'A sophisticated dark wine/burgundy velvet theme. Perfect for high-end, premium brand agencies.',
                  bgClass: 'bg-[#110208]',
                  cardClass: 'bg-[#260812]/75',
                  primary: '#f43f5e',
                  accent: '#fda4af',
                  borderColor: 'rgba(244, 63, 94, 0.15)',
                  tags: ['Elegant', 'Prestige', 'Wine Red'],
                },
                {
                  id: 'candid',
                  name: 'Candid Emerald',
                  description: 'A high-contrast neon cyber slate theme. Vivid mint greens combined with amber gold status indicators.',
                  bgClass: 'bg-[#020a06]',
                  cardClass: 'bg-[#0a1a12]/75',
                  primary: '#10b981',
                  accent: '#f59e0b',
                  borderColor: 'rgba(16, 185, 129, 0.15)',
                  tags: ['Cyberpunk', 'Eco-Tech', 'High-Contrast'],
                },
              ].map((theme) => {
                const isActive = (panelSettings.activeTheme || 'default') === theme.id || (theme.id === 'eternal' && panelSettings.activeTheme === 'eteral');
                return (
                  <div
                    key={theme.id}
                    onClick={() => handleActivateTheme(theme.id)}
                    className={`relative rounded-2xl overflow-hidden border cursor-pointer transition-all duration-300 group hover:-translate-y-1 ${
                      isActive
                        ? 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.15)] bg-rose-500/5'
                        : 'border-white/5 hover:border-white/20 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {/* Active badge */}
                    {isActive && (
                      <div className="absolute top-4 right-4 bg-rose-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center space-x-1 shadow-lg z-20">
                        <CheckCircle className="w-3 h-3" />
                        <span>Active Theme</span>
                      </div>
                    )}

                    {/* Preview mock area */}
                    <div className="p-5 border-b border-white/5 relative overflow-hidden select-none" style={{ backgroundColor: theme.bgClass }}>
                      <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl opacity-20 pointer-events-none" style={{ backgroundColor: theme.primary }} />
                      <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full blur-2xl opacity-20 pointer-events-none" style={{ backgroundColor: theme.accent }} />

                      {/* Mockup Dashboard Header */}
                      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                        <div className="flex items-center space-x-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.primary }} />
                          <span className="text-[10px] font-bold tracking-wide text-white font-display">Premium SMM</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-5 h-2 rounded bg-white/10" />
                          <div className="w-3 h-2 rounded bg-white/10" />
                        </div>
                      </div>

                      {/* Mockup Cards */}
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div className="p-2.5 rounded-lg border text-[9px]" style={{ backgroundColor: theme.cardClass, borderColor: theme.borderColor }}>
                          <span className="text-gray-400 block mb-0.5">Your Credits</span>
                          <span className="font-bold text-white block">₹12,450.00</span>
                        </div>
                        <div className="p-2.5 rounded-lg border text-[9px]" style={{ backgroundColor: theme.cardClass, borderColor: theme.borderColor }}>
                          <span className="text-gray-400 block mb-0.5">Status Check</span>
                          <span className="font-bold block" style={{ color: theme.primary }}>VIP Tier</span>
                        </div>
                      </div>

                      {/* Mockup Order Bar */}
                      <div className="p-2 rounded-lg border text-[8px] flex items-center justify-between" style={{ backgroundColor: theme.cardClass, borderColor: theme.borderColor }}>
                        <div className="flex items-center space-x-1.5">
                          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: theme.primary }} />
                          <span className="text-white">Active Order #24198</span>
                        </div>
                        <span className="px-1 py-0.5 rounded text-[7px]" style={{ backgroundColor: theme.accent + '20', color: theme.accent }}>Processing</span>
                      </div>
                    </div>

                    {/* Details and Description */}
                    <div className="p-5 space-y-4">
                      <div>
                        <h4 className="font-bold text-white text-md flex items-center gap-1.5">
                          {theme.name}
                          <span className="text-[10px] text-gray-500 font-normal">({theme.id})</span>
                        </h4>
                        <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{theme.description}</p>
                      </div>

                      {/* Color Specs */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-400 mr-2 uppercase tracking-wider font-mono">Palette:</span>
                        <div className="flex items-center space-x-1.5 bg-black/20 px-2 py-1 rounded-md border border-white/5">
                          <div className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: theme.primary }} title="Primary Color" />
                          <span className="text-[9px] font-mono text-gray-400">primary</span>
                        </div>
                        <div className="flex items-center space-x-1.5 bg-black/20 px-2 py-1 rounded-md border border-white/5">
                          <div className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: theme.accent }} title="Accent Color" />
                          <span className="text-[9px] font-mono text-gray-400">accent</span>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {theme.tags.map((tag, idx) => (
                          <span key={idx} className="text-[9px] font-bold bg-white/5 text-gray-400 px-2 py-0.5 rounded border border-white/5">
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Activation Button overlay */}
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[11px] text-gray-400 font-medium">
                          {isActive ? 'Currently applied globally' : 'Click to activate theme'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActivateTheme(theme.id);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isActive
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-white/5 hover:bg-white/10 text-white border border-white/10 group-hover:bg-rose-600 group-hover:text-white group-hover:border-rose-500'
                          }`}
                        >
                          {isActive ? 'Active' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Admin Panel Workspace Theme Preference (White/Dark Theme) */}
            <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6">
              <div className="flex items-center space-x-3 border-b border-white/5 pb-3">
                <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                  <Palette className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Admin Suite Visual Style</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Toggle the visual interface layout specifically for this admin workspace.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => {
                    setAdminTheme('dark');
                    localStorage.setItem('admin_theme', 'dark');
                    showSuccess('Admin interface switched to Dark Obsidian mode.');
                  }}
                  className={`p-5 rounded-xl border cursor-pointer transition-all ${
                    adminTheme === 'dark'
                      ? 'border-purple-500 bg-purple-500/5 shadow-md scale-[1.01]'
                      : 'border-white/5 hover:border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm text-white flex items-center gap-2">
                      <Moon className="w-4 h-4 text-purple-400" />
                      Dark Obsidian (Default)
                    </span>
                    {adminTheme === 'dark' && (
                      <span className="text-[10px] bg-purple-500 text-white px-2.5 py-0.5 rounded-full font-bold">Active</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">Standard deep-space dark style. Optimized for late-night system operations, tracking server logs, and reducing eye strain.</p>
                </div>

                <div
                  onClick={() => {
                    setAdminTheme('light');
                    localStorage.setItem('admin_theme', 'light');
                    showSuccess('Admin interface switched to Alabaster Daylight mode.');
                  }}
                  className={`p-5 rounded-xl border cursor-pointer transition-all ${
                    adminTheme === 'light'
                      ? 'border-purple-500 bg-purple-500/5 shadow-md scale-[1.01]'
                      : 'border-white/5 hover:border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm text-white flex items-center gap-2">
                      <Sun className="w-4 h-4 text-amber-500" />
                      Alabaster Daylight (White Theme)
                    </span>
                    {adminTheme === 'light' && (
                      <span className="text-[10px] bg-purple-500 text-white px-2.5 py-0.5 rounded-full font-bold">Active</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">Crisp, highly polished white theme with generous negative space, sleek borders, and exceptional daylight legibility.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB: SMM PANEL SETTINGS */}
        {/* ===================================== */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="space-y-8 pb-12">
            {/* Header / Save Action Banner */}
            <div className="glass-card p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-purple-950/20 to-blue-950/20">
              <div>
                <h3 className="text-md font-bold text-white">Save Changes</h3>
                <p className="text-xs text-gray-400 mt-1">Submit parameters to synchronize branding and script modifications globally.</p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold font-mono text-white tracking-wider uppercase transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center space-x-2"
              >
                {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>Persist Customizations</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Box 1: Core Identity & Support */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6">
                <div className="flex items-center space-x-3 border-b border-white/5 pb-3">
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Brand Identity & Communication</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">Basic identifiers and instant-chat contact settings.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Website Name</label>
                    <input
                      type="text"
                      placeholder="yuthsmm"
                      value={panelSettings.websiteName || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, websiteName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Default Language</label>
                    <select
                      value={panelSettings.defaultLanguage || 'en'}
                      onChange={e => setPanelSettings({ ...panelSettings, defaultLanguage: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
                    >
                      <option value="en">English (Default)</option>
                      <option value="es">Español (Spanish)</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                      <option value="ar">العربية (Arabic)</option>
                      <option value="pt">Português (Portuguese)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">WhatsApp Contact Number</label>
                    <input
                      type="text"
                      placeholder="919999999999"
                      value={panelSettings.whatsappNumber || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, whatsappNumber: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono"
                    />
                    <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
                      Enter the target mobile number including country code (without spaces or +). Users can initiate instant chats using the bottom-right floating support widget.
                    </p>
                  </div>
                </div>
              </div>

              {/* Box 2: Visual Media Assets */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6">
                <div className="flex items-center space-x-3 border-b border-white/5 pb-3">
                  <div className="p-2 bg-pink-500/10 text-pink-400 rounded-lg">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Visual Media Assets</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">Customize logotypes, dynamic web icons, and explainers.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Website Logo URL</label>
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        placeholder="https://example.com/logo.png"
                        value={panelSettings.websiteLogo || ''}
                        onChange={e => setPanelSettings({ ...panelSettings, websiteLogo: e.target.value })}
                        className="flex-1 px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono"
                      />
                      {panelSettings.websiteLogo && (
                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center p-1 overflow-hidden">
                          <img src={panelSettings.websiteLogo} alt="Logo preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Favicon Icon URL</label>
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        placeholder="https://example.com/favicon.ico"
                        value={panelSettings.favicon || ''}
                        onChange={e => setPanelSettings({ ...panelSettings, favicon: e.target.value })}
                        className="flex-1 px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono"
                      />
                      {panelSettings.favicon && (
                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center p-2">
                          <img src={panelSettings.favicon} alt="Favicon preview" className="w-6 h-6 object-contain" referrerPolicy="no-referrer" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Home Page YouTube Video ID</label>
                    <input
                      type="text"
                      placeholder="dQw4w9WgXcQ"
                      value={panelSettings.homepageYoutubeId || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, homepageYoutubeId: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono"
                    />
                    <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
                      Enter the 11-character video key (e.g. <strong>dQw4w9WgXcQ</strong>) to embed an interactive platform explainer tutorial directly inside the public guest portal.
                    </p>
                  </div>
                </div>
              </div>

              {/* Box 3: Site Optimization & SEO */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6 lg:col-span-2">
                <div className="flex items-center space-x-3 border-b border-white/5 pb-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Search Engine Optimization (SEO)</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">Control indexing keywords, crawler tags, and search result snippets.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">SEO Keywords (Comma Separated)</label>
                    <textarea
                      rows={3}
                      placeholder="smm panel, social followers, automatic likes, cheapest smm panel"
                      value={panelSettings.seoKeywords || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, seoKeywords: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono resize-none leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">SEO Description Meta Tag</label>
                    <textarea
                      rows={3}
                      placeholder="Access high-speed automated social growth services with instant dispatch protocols."
                      value={panelSettings.seoDescription || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, seoDescription: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors resize-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* Box: Universal Payment Gateways and Methods Control */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6 lg:col-span-2 animate-in fade-in duration-300">
                <div className="flex items-center space-x-3 border-b border-white/5 pb-3">
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Payment Gateways & Methods Master Control</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">Toggle status and manage API credential fields securely for global and domestic settlement networks.</p>
                  </div>
                </div>

                {/* 1. Global USD Settings */}
                <div className="space-y-4">
                  <h5 className="text-xs font-bold text-blue-400 uppercase tracking-widest border-b border-white/5 pb-1">USD (Global) Payment Gateways</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Stripe (USD) */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Stripe [USD]</span>
                        <select
                          value={panelSettings.stripeStatus || 'enabled'}
                          onChange={e => setPanelSettings({ ...panelSettings, stripeStatus: e.target.value })}
                          className="px-2 py-1 rounded bg-[#0b101f] text-xs font-semibold text-white border border-white/10"
                        >
                          <option value="enabled" className="text-emerald-400 bg-[#0b101f]">Enabled</option>
                          <option value="disabled" className="text-red-400 bg-[#0b101f]">Disabled</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[10px] text-gray-400 font-semibold mb-1">Stripe Publishable Key</label>
                          <input
                            type="text"
                            placeholder="pk_live_..."
                            value={panelSettings.stripePublishableKey || ''}
                            onChange={e => setPanelSettings({ ...panelSettings, stripePublishableKey: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-lg bg-[#0b101f] border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 font-semibold mb-1">Stripe Secret Key</label>
                          <input
                            type="password"
                            placeholder="sk_live_..."
                            value={panelSettings.stripeSecretKey || ''}
                            onChange={e => setPanelSettings({ ...panelSettings, stripeSecretKey: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-lg bg-[#0b101f] border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* PayPal (USD) */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">PayPal [USD]</span>
                        <select
                          value={panelSettings.paypalStatus || 'enabled'}
                          onChange={e => setPanelSettings({ ...panelSettings, paypalStatus: e.target.value })}
                          className="px-2 py-1 rounded bg-[#0b101f] text-xs font-semibold text-white border border-white/10"
                        >
                          <option value="enabled" className="text-emerald-400 bg-[#0b101f]">Enabled</option>
                          <option value="disabled" className="text-red-400 bg-[#0b101f]">Disabled</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[10px] text-gray-400 font-semibold mb-1">PayPal Client ID</label>
                          <input
                            type="text"
                            placeholder="Client ID"
                            value={panelSettings.paypalClientId || ''}
                            onChange={e => setPanelSettings({ ...panelSettings, paypalClientId: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-lg bg-[#0b101f] border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 font-semibold mb-1">PayPal Secret Key</label>
                          <input
                            type="password"
                            placeholder="Secret Key"
                            value={panelSettings.paypalSecretKey || ''}
                            onChange={e => setPanelSettings({ ...panelSettings, paypalSecretKey: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-lg bg-[#0b101f] border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Manual Bank [USD] */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Manual Bank [USD]</span>
                        <select
                          value={panelSettings.usdManualStatus || 'enabled'}
                          onChange={e => setPanelSettings({ ...panelSettings, usdManualStatus: e.target.value })}
                          className="px-2 py-1 rounded bg-[#0b101f] text-xs font-semibold text-white border border-white/10"
                        >
                          <option value="enabled" className="text-emerald-400 bg-[#0b101f]">Enabled</option>
                          <option value="disabled" className="text-red-400 bg-[#0b101f]">Disabled</option>
                        </select>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        Allows users to request wire payments / deposits in USD. Instructions can be custom tailored in the "Add Funds Instructions" section below.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Domestic INR Settings */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-widest border-b border-white/5 pb-1">INR (Indian Rupee) Payment Gateways</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* UPI Direct QR & VPA */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">UPI Direct [INR]</span>
                        <select
                          value={panelSettings.upiStatus || 'enabled'}
                          onChange={e => setPanelSettings({ ...panelSettings, upiStatus: e.target.value })}
                          className="px-2 py-1 rounded bg-[#0b101f] text-xs font-semibold text-white border border-white/10"
                        >
                          <option value="enabled" className="text-emerald-400 bg-[#0b101f]">Enabled</option>
                          <option value="disabled" className="text-red-400 bg-[#0b101f]">Disabled</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[10px] text-gray-400 font-semibold mb-1">Direct UPI ID (VPA)</label>
                          <input
                            type="text"
                            placeholder="e.g. pay@ybl"
                            value={panelSettings.upiDirectVpa || ''}
                            onChange={e => setPanelSettings({ ...panelSettings, upiDirectVpa: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-lg bg-[#0b101f] border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 font-semibold mb-1">Direct Merchant Name</label>
                          <input
                            type="text"
                            placeholder="e.g. SMM Owner"
                            value={panelSettings.upiDirectMerchantName || ''}
                            onChange={e => setPanelSettings({ ...panelSettings, upiDirectMerchantName: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-lg bg-[#0b101f] border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 font-semibold mb-1">Direct QR Image URL</label>
                          <input
                            type="text"
                            placeholder="https://..."
                            value={panelSettings.upiDirectQrUrl || ''}
                            onChange={e => setPanelSettings({ ...panelSettings, upiDirectQrUrl: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-lg bg-[#0b101f] border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* PhonePe API (INR) */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">PhonePe PG [INR]</span>
                        <select
                          value={panelSettings.phonepeStatus || 'enabled'}
                          onChange={e => setPanelSettings({ ...panelSettings, phonepeStatus: e.target.value })}
                          className="px-2 py-1 rounded bg-[#0b101f] text-xs font-semibold text-white border border-white/10"
                        >
                          <option value="enabled" className="text-emerald-400 bg-[#0b101f]">Enabled</option>
                          <option value="disabled" className="text-red-400 bg-[#0b101f]">Disabled</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[10px] text-gray-400 font-semibold mb-1">PhonePe Merchant ID</label>
                          <input
                            type="text"
                            placeholder="M22..."
                            value={panelSettings.phonepeMerchantId || ''}
                            onChange={e => setPanelSettings({ ...panelSettings, phonepeMerchantId: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-lg bg-[#0b101f] border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 font-semibold mb-1">PhonePe Salt Key</label>
                          <input
                            type="password"
                            placeholder="Salt Key"
                            value={panelSettings.phonepeSaltKey || ''}
                            onChange={e => setPanelSettings({ ...panelSettings, phonepeSaltKey: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-lg bg-[#0b101f] border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 font-semibold mb-1">PhonePe Salt Key Index</label>
                          <input
                            type="text"
                            placeholder="1"
                            value={panelSettings.phonepeSaltIndex || '1'}
                            onChange={e => setPanelSettings({ ...panelSettings, phonepeSaltIndex: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-lg bg-[#0b101f] border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Razorpay PG (INR) */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Razorpay PG [INR]</span>
                        <select
                          value={panelSettings.razorpayStatus || 'enabled'}
                          onChange={e => setPanelSettings({ ...panelSettings, razorpayStatus: e.target.value })}
                          className="px-2 py-1 rounded bg-[#0b101f] text-xs font-semibold text-white border border-white/10"
                        >
                          <option value="enabled" className="text-emerald-400 bg-[#0b101f]">Enabled</option>
                          <option value="disabled" className="text-red-400 bg-[#0b101f]">Disabled</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[10px] text-gray-400 font-semibold mb-1">Razorpay Key ID</label>
                          <input
                            type="text"
                            placeholder="rzp_live_..."
                            value={panelSettings.razorpayKeyId || ''}
                            onChange={e => setPanelSettings({ ...panelSettings, razorpayKeyId: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-lg bg-[#0b101f] border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 font-semibold mb-1">Razorpay Key Secret</label>
                          <input
                            type="password"
                            placeholder="Secret"
                            value={panelSettings.razorpayKeySecret || ''}
                            onChange={e => setPanelSettings({ ...panelSettings, razorpayKeySecret: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-lg bg-[#0b101f] border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    {/* Stripe [INR] */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Stripe [INR Card/UPI]</span>
                        <select
                          value={panelSettings.inrStripeStatus || 'enabled'}
                          onChange={e => setPanelSettings({ ...panelSettings, inrStripeStatus: e.target.value })}
                          className="px-2 py-1 rounded bg-[#0b101f] text-xs font-semibold text-white border border-white/10"
                        >
                          <option value="enabled" className="text-emerald-400 bg-[#0b101f]">Enabled</option>
                          <option value="disabled" className="text-red-400 bg-[#0b101f]">Disabled</option>
                        </select>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        Enables Stripe payments natively styled in INR (Indian Rupee). Shares the global Stripe Credentials defined in the USD section above.
                      </p>
                    </div>

                    {/* Manual Bank [INR] */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Manual Bank [INR]</span>
                        <select
                          value={panelSettings.inrManualStatus || 'enabled'}
                          onChange={e => setPanelSettings({ ...panelSettings, inrManualStatus: e.target.value })}
                          className="px-2 py-1 rounded bg-[#0b101f] text-xs font-semibold text-white border border-white/10"
                        >
                          <option value="enabled" className="text-emerald-400 bg-[#0b101f]">Enabled</option>
                          <option value="disabled" className="text-red-400 bg-[#0b101f]">Disabled</option>
                        </select>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        Allows users to submit INR manual deposits (Direct Bank transfer or GPay/UPI manual transfer) and enter details for manual reconciliation.
                      </p>
                    </div>

                    {/* PhonePe/BharatPe Status Hint */}
                    <div className="p-4 rounded-xl bg-emerald-500/[0.02] border border-emerald-500/10 space-y-2 text-xs flex flex-col justify-center">
                      <span className="font-bold text-white flex items-center space-x-1.5">
                        <Smartphone className="w-4 h-4 text-emerald-400" />
                        <span>Instant Auto QR Sync</span>
                      </span>
                      <p className="text-[10px] text-gray-400 leading-relaxed">
                        BharatPe dynamic QR linking is enabled in the secondary section below. When linked, BharatPe serves as an additional zero-fee automated payment channel.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Box: BharatPe Gateway Account OTP Linking */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6 lg:col-span-2 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-pink-500/10 text-pink-400 rounded-lg">
                      <Smartphone className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">BharatPe UPI Dynamic QR Account Linking</h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">Link your BharatPe merchant account via registered mobile number and OTP verification, or configure manually.</p>
                    </div>
                  </div>
                </div>

                {panelSettings.bharatpeStatus === 'linked' ? (
                  // Linked View (Fully Editable & Direct Modification Allowed!)
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gradient-to-r from-emerald-950/10 to-blue-950/10 p-5 rounded-2xl border border-emerald-500/10 relative overflow-hidden">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="flex h-2.5 w-2.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </span>
                          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono">Gateway Active & Linked</span>
                        </div>

                        <div className="flex items-center space-x-2 bg-[#0b101f]/80 px-2.5 py-1 rounded-lg border border-white/5">
                          <span className="text-[10px] uppercase font-bold text-gray-400">Gateway:</span>
                          <select
                            value={panelSettings.bharatpeStatus || 'linked'}
                            onChange={e => setPanelSettings({ ...panelSettings, bharatpeStatus: e.target.value })}
                            className="px-1.5 py-0.5 rounded bg-transparent text-xs font-bold text-white focus:outline-none focus:border-pink-500 cursor-pointer"
                          >
                            <option value="linked" className="bg-[#0b101f] text-emerald-400">Enabled (Active)</option>
                            <option value="unlinked" className="bg-[#0b101f] text-red-400">Disabled (Inactive)</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-3.5 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Merchant Display Name</label>
                          <input
                            type="text"
                            value={panelSettings.bharatpeMerchantName || ''}
                            onChange={e => setPanelSettings({ ...panelSettings, bharatpeMerchantName: e.target.value })}
                            placeholder="BharatPe Merchant"
                            className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Registered Mobile (+91)</label>
                          <input
                            type="text"
                            maxLength={10}
                            value={panelSettings.bharatpePhone || ''}
                            onChange={e => setPanelSettings({ ...panelSettings, bharatpePhone: e.target.value.replace(/\D/g, '') })}
                            placeholder="8795005604"
                            className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 transition-colors font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Linked UPI ID (VPA) for Dynamic Payments</label>
                          <input
                            type="text"
                            value={panelSettings.bharatpeVpa || ''}
                            onChange={e => setPanelSettings({ ...panelSettings, bharatpeVpa: e.target.value })}
                            placeholder="BHARATPE2HOD0Q1Y4T29351@unitype"
                            className="w-full px-4 py-2.5 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 transition-colors font-mono text-purple-400 font-bold"
                          />
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/5 space-y-2.5">
                        <p className="text-[10px] text-gray-500 leading-relaxed">
                          Need to make changes? Modify any details above and click <strong>"Save QR Customizations"</strong> to persist updates instantly, or disconnect to start over.
                        </p>
                        
                        <div className="flex items-center space-x-3">
                          <button
                            type="button"
                            onClick={handleSaveBharatpeSettings}
                            disabled={bpLoading}
                            className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-bold text-white transition-all disabled:opacity-40 flex items-center space-x-2 animate-in fade-in duration-300"
                          >
                            {bpLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                            <span>Save QR Customizations</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleUnlinkBharatpe}
                            disabled={bpLoading}
                            className="px-3.5 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-xl text-xs font-bold border border-red-500/20 transition-all flex items-center space-x-1"
                          >
                            <span>Disconnect Account</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* QR Standee Visualization */}
                    <div className="flex flex-col items-center justify-center p-4 bg-white/[0.02] border border-white/5 rounded-2xl relative">
                      {/* High fidelity BharatPe Standee Preview */}
                      <div className="w-56 rounded-[2rem] p-3.5 border border-[#02a08b]/30 shadow-2xl relative overflow-hidden flex flex-col items-center select-none" style={{ background: 'linear-gradient(171deg, #f26c5f 63%, #017f6e 63%)' }}>
                        {/* Top area of standee: BharatPe Branding */}
                        <div className="w-full text-center mb-3 pt-1">
                          <div className="text-white text-[8px] tracking-[0.15em] uppercase font-bold text-center leading-none opacity-90 drop-shadow-sm mb-1">
                            Hai Yakeen
                          </div>
                          <div className="flex items-center justify-center space-x-1">
                            {/* Beautiful high-fidelity BharatPe circle logo */}
                            <span className="w-4 h-4 rounded-full bg-[#35cac0] flex items-center justify-center shadow-sm relative">
                              <span className="w-2 h-2 rounded-full border-[1.5px] border-white border-t-transparent border-l-transparent transform -rotate-45 -translate-y-[0.5px]"></span>
                            </span>
                            <span className="text-white text-sm font-extrabold tracking-tight drop-shadow-sm leading-none flex items-center">
                              <span>Bharat</span>
                              <span className="font-light opacity-95">Pe</span>
                            </span>
                          </div>
                        </div>

                        {/* Central White Payment Info Card */}
                        <div className="w-full bg-white rounded-[1.25rem] p-3 flex flex-col items-center shadow-lg border border-white/10 z-10">
                          {/* Merchant Name */}
                          <div className="text-center font-extrabold text-sm text-gray-950 tracking-wider uppercase mb-2 mt-0.5 leading-none">
                            {panelSettings.bharatpeMerchantName || 'PRIYA'}
                          </div>

                          {/* QR Code Container with subtle grey border */}
                          <div className="w-32 h-32 border border-gray-100 rounded-xl p-1.5 flex items-center justify-center bg-white relative shadow-sm overflow-hidden">
                            {/* Dynamic QR image preview */}
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                                `upi://pay?pa=${panelSettings.bharatpeVpa || 'BHARATPE2HOD0Q1Y4T29351@unitype'}&pn=${encodeURIComponent(
                                  panelSettings.bharatpeMerchantName || 'PRIYA'
                                )}&am=100.00&cu=INR&tn=SMMPreview&mc=0000&mode=02&purpose=00`
                              )}`}
                              alt="BharatPe QR Code Preview"
                              className="w-full h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                            {/* High fidelity BharatPe Logo Overlay in the center of the QR code */}
                            <div className="absolute inset-0 m-auto w-8 h-8 bg-white rounded-full flex items-center justify-center p-[1.5px] shadow-md border border-gray-100">
                              <div className="w-full h-full rounded-full bg-[#35cac0] flex items-center justify-center relative overflow-hidden">
                                <div className="flex flex-col space-y-[1px] w-4 transform rotate-[15deg] items-center">
                                  <div className="w-3.5 h-[1.5px] bg-[#eb5e52] rounded-full"></div>
                                  <div className="w-3.5 h-[1.5px] bg-[#003831] rounded-full"></div>
                                  <div className="w-3.5 h-[1.5px] bg-white rounded-full"></div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* UPI ID / VPA Pill exactly like the image */}
                          <div className="w-full py-2 px-2 rounded-lg bg-[#F8F9FA] border border-gray-200/60 flex items-center justify-center space-x-1.5 mt-2.5 shadow-inner">
                            {/* Dynamic UPI Tricolor Triangle Badge */}
                            <span className="flex-shrink-0 w-3 h-3 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden">
                              <span className="w-0 h-0 border-t-[4px] border-t-amber-500 border-l-[4px] border-l-emerald-500 border-r-[4px] border-r-transparent border-b-[4px] border-b-transparent transform rotate-[45deg] -translate-x-[0.5px]"></span>
                            </span>
                            <span className="text-[8px] font-extrabold text-[#0D233A] font-mono tracking-wide break-all text-center select-all leading-none">
                              {panelSettings.bharatpeVpa || 'BHARATPE2HOD0Q1Y4T29351@unitype'}
                            </span>
                          </div>
                        </div>

                        {/* BHIM UPI Bottom Footer section */}
                        <div className="w-full pt-3 flex flex-col items-center">
                          <div className="flex items-center space-x-1.5 justify-center mb-0.5">
                            <span className="text-white text-base font-black tracking-widest italic font-sans drop-shadow-sm">BHIM</span>
                            <span className="text-white/60 text-sm font-light leading-none">❯</span>
                            <span className="text-white text-base font-black tracking-widest italic font-sans drop-shadow-sm">UPI</span>
                          </div>
                          <div className="text-[5.5px] text-white/70 tracking-[0.18em] font-extrabold uppercase leading-none text-center mb-3">
                            BHARAT INTERFACE FOR MONEY <span className="mx-0.5 text-white/30">•</span> UNIFIED PAYMENTS INTERFACE
                          </div>
                          
                          <div className="text-[8px] text-white/95 font-medium mb-1">
                            Pay with any UPI app
                          </div>

                          {/* Circular Payment App Logos */}
                          <div className="flex items-center justify-center space-x-2 pb-1">
                            <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm border border-white/10 font-bold text-[6px] text-[#002E6E] leading-none">paytm</div>
                            <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm border border-white/10 font-bold text-[6px] text-[#1E88E5] leading-none">G Pay</div>
                            <div className="w-5 h-5 rounded-full bg-[#5f259f] flex items-center justify-center shadow-sm border border-white/10 font-bold text-[10px] text-white leading-none">पे</div>
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-3 text-center leading-relaxed">
                        Live dynamic QR payload is generated per transaction on Checkout.
                      </p>
                    </div>
                  </div>
                ) : (
                  // Multi-Step Setup Wizard
                  <div className="space-y-5 bg-white/[0.01] p-6 rounded-2xl border border-white/5 relative overflow-hidden min-h-[220px]">
                    {bpLoading && (
                      <div className="absolute inset-0 bg-[#070b14]/95 z-20 flex flex-col items-center justify-center space-y-3 animate-in fade-in duration-200">
                        <RefreshCw className="w-8 h-8 text-pink-500 animate-spin" />
                        <div className="text-xs font-bold text-white tracking-wide">Processing Secure Link request...</div>
                        <div className="text-[10px] text-gray-400">Communicating with BharatPe Settlement APIs</div>
                      </div>
                    )}

                    {setupStep === 'intro' && (
                      <div className="space-y-5 animate-in fade-in duration-300">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-pink-500/[0.03] p-5 rounded-xl border border-pink-500/10">
                          <div className="space-y-1.5 max-w-lg">
                            <span className="px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 text-[10px] font-bold uppercase tracking-wider">Dynamic QR Settlements</span>
                            <h5 className="text-sm font-bold text-white">Automate SMM Client Payments with BharatPe</h5>
                            <p className="text-xs text-gray-400 leading-relaxed">
                              Enable direct UPI transfers from any client device into your bank account. The system automatically reconciles 12-digit transaction UTR codes in real time to auto-credit fund balances.
                            </p>
                          </div>
                          <div className="flex-shrink-0 flex items-center justify-center">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-blue-500/20 flex items-center justify-center border border-white/10 shadow-lg">
                              <QrCode className="w-8 h-8 text-pink-400" />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-3 bg-white/[0.01] rounded-xl border border-white/5 space-y-1">
                            <div className="text-xs font-bold text-white">0% Fees</div>
                            <div className="text-[10px] text-gray-400">Direct peer-to-peer bank settlement via standard UPI channels.</div>
                          </div>
                          <div className="p-3 bg-white/[0.01] rounded-xl border border-white/5 space-y-1">
                            <div className="text-xs font-bold text-white">Auto Reconciliation</div>
                            <div className="text-[10px] text-gray-400">Users enter UTR codes to verify payment receipts instantly.</div>
                          </div>
                          <div className="p-3 bg-white/[0.01] rounded-xl border border-white/5 space-y-1">
                            <div className="text-xs font-bold text-white">Interactive Checkout</div>
                            <div className="text-[10px] text-gray-400">Elegant dynamic QR codes are rendered based on user-entered amounts.</div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 items-center pt-2">
                          <button
                            type="button"
                            onClick={() => setSetupStep('mobile')}
                            className="px-6 py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-bold text-white transition-all flex items-center space-x-2 shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                          >
                            <Smartphone className="w-4 h-4" />
                            <span>Connect BharatPe QR</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setPanelSettings({
                                ...panelSettings,
                                bharatpeStatus: 'linked',
                                bharatpeMerchantName: 'PRIYA',
                                bharatpeVpa: 'BHARATPE2HOD0Q1Y4T29351@unitype',
                                bharatpePhone: '8795005604'
                              });
                              showSuccess('Pre-linked setup successfully!');
                            }}
                            className="px-5 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold transition-all border border-white/5"
                          >
                            Direct/Manual Config
                          </button>
                        </div>
                      </div>
                    )}

                    {setupStep === 'mobile' && (
                      <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="p-3 bg-blue-500/5 border border-blue-500/10 text-xs text-blue-300 rounded-xl flex items-start space-x-2.5 leading-relaxed">
                          <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                          <span>Link your BharatPe merchant account securely. Please enter the registered merchant mobile number to receive a verification OTP.</span>
                        </div>

                        <div className="max-w-md">
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Registered Mobile (10-Digit)</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-3 text-xs font-bold font-mono text-gray-500">+91</span>
                            <input
                              type="text"
                              maxLength={10}
                              placeholder="8795005604"
                              value={bharatpePhone}
                              onChange={e => setBharatpePhone(e.target.value.replace(/\D/g, ''))}
                              className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 transition-colors font-mono"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 items-center pt-2">
                          <button
                            type="button"
                            onClick={handleRequestBharatpeOtp}
                            disabled={bpLoading || bharatpePhone.length < 10}
                            className="px-5 py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-bold text-white transition-all disabled:opacity-40 flex items-center space-x-2 shadow-lg"
                          >
                            {bpLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                            <span>Send Verification OTP</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSetupStep('intro')}
                            className="px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold transition-all border border-white/5"
                          >
                            Back
                          </button>
                        </div>
                      </div>
                    )}

                    {setupStep === 'otp' && (
                      <div className="space-y-5 max-w-xl animate-in fade-in duration-300">
                        <div className="p-3 bg-amber-500/5 border border-amber-500/15 text-xs text-amber-300 rounded-xl space-y-1.5 leading-relaxed animate-pulse">
                          <div className="font-bold text-amber-200 flex items-center space-x-1.5">
                            <Smartphone className="w-4 h-4 text-amber-400" />
                            <span>Verification Code Sent to +91 {bharatpePhone}</span>
                          </div>
                          <div>We have sent a simulated verification OTP code. Use code <strong className="font-mono text-white underline bg-white/10 px-1.5 py-0.5 rounded text-xs">123456</strong> to verify and complete.</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Enter 6-Digit Verification OTP</label>
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="123456"
                              value={bharatpeOTP}
                              onChange={e => setBharatpeOTP(e.target.value.replace(/\D/g, ''))}
                              className="w-full max-w-[200px] text-center tracking-[0.5em] px-4 py-3 rounded-xl bg-[#0b101f] border border-white/15 text-white text-lg font-bold focus:outline-none focus:border-pink-500 transition-colors font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Merchant Display Name (Optional)</label>
                            <input
                              type="text"
                              placeholder="My Premium SMM QR"
                              value={bharatpeMerchantName}
                              onChange={e => setBharatpeMerchantName(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 transition-colors"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Custom VPA / UPI ID (Optional)</label>
                            <input
                              type="text"
                              placeholder="BHARATPE2HOD0Q1Y4T29351@unitype"
                              value={bharatpeVpa}
                              onChange={e => setBharatpeVpa(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 transition-colors font-mono"
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 pt-2">
                          <button
                            type="button"
                            onClick={handleVerifyBharatpeOtp}
                            disabled={bpLoading || bharatpeOTP.length < 6}
                            className="px-5 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-xs font-bold text-white transition-all disabled:opacity-40 flex items-center space-x-2"
                          >
                            {bpLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                            <span>Verify & Link QR Code</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => { setOtpRequested(false); setBharatpeOTP(''); setSetupStep('mobile'); }}
                            className="px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold transition-all border border-white/5"
                          >
                            Back
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Box 4: Advanced Operational Tuning */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6 lg:col-span-2">
                <div className="flex items-center space-x-3 border-b border-white/5 pb-3">
                  <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Advanced Operations Tuning</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">Regulate payment flow displays and offset database identity pipelines.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Order ID Skip Offset</label>
                    <input
                      type="number"
                      placeholder="10000"
                      value={panelSettings.orderIdSkip || '0'}
                      onChange={e => setPanelSettings({ ...panelSettings, orderIdSkip: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono"
                    />
                    <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                      Offsets user-facing order IDs globally. e.g. setting to 10000 makes Order #5 display as #10005, making the system look more established.
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Add Funds Instructions Content</label>
                    <textarea
                      rows={4}
                      placeholder="To pay manually:&#10;1. Scan the UPI QR Code above&#10;2. Send the desired INR amount&#10;3. Submit a manual support ticket with the transaction reference ID."
                      value={panelSettings.addFundPageContent || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, addFundPageContent: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors resize-none leading-relaxed"
                    />
                    <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
                      Configure custom guidelines, bank details, QR details, or manual transfer rules. Displays in a prominent alert box inside the user's "Deposit Wallet" page.
                    </p>
                  </div>
                </div>
              </div>

              {/* Box 5: Code Injection Matrices */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6 lg:col-span-2">
                <div className="flex items-center space-x-3 border-b border-white/5 pb-3">
                  <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Dynamic Header & Footer Code Injections</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">Inject dynamic script protocols, analytics trackers, CSS overrides, or widgets safely.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Additional Header Code (Injected into &lt;head&gt; Globally)</label>
                    <textarea
                      rows={4}
                      placeholder="<!-- Google Tag Manager / Analytics / Custom Global CSS -->&#10;<script>console.log('Global script loaded');</script>"
                      value={panelSettings.additionalHeaderCode || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, additionalHeaderCode: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Additional Footer Code (Injected into &lt;body&gt; Globally)</label>
                    <textarea
                      rows={4}
                      placeholder="<!-- Custom Chat Widget or analytics timers -->"
                      value={panelSettings.additionalFooterCode || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, additionalFooterCode: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Additional Header Code - After Login pages (Only on Authenticated Views)</label>
                    <textarea
                      rows={4}
                      placeholder="<!-- Injected exclusively for registered panels -->"
                      value={panelSettings.additionalHeaderCodeAfterLogin || ''}
                      onChange={e => setPanelSettings({ ...panelSettings, additionalHeaderCodeAfterLogin: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 transition-colors font-mono leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* Box 6: Supabase Real-time Sync & Schema Setup Guide */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6 lg:col-span-2 bg-gradient-to-br from-indigo-950/20 to-purple-950/10">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                      <RefreshCw className="w-5 h-5 animate-spin duration-3000" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Supabase Real-time User Syncer</h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">Synchronize user registrations, roles, wallet balances, and status changes in real-time to your custom Supabase tables.</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold text-[10px] uppercase tracking-wider">
                    Integration Ready
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl bg-[#070b14] border border-white/5 space-y-2">
                    <span className="font-bold text-purple-400 uppercase tracking-wider text-[10px]">Current Credentials</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-400 font-mono text-[10px] mt-1">
                      <div>
                        <span className="text-gray-500">PROJECT ID:</span> <span className="text-white">kjxytepdstmxgbznzwhi</span>
                      </div>
                      <div className="truncate">
                        <span className="text-gray-500">ANON KEY:</span> <span className="text-white">sb_pub...ln4</span>
                      </div>
                    </div>
                  </div>

                  {supabaseStatus && (
                    <div className="p-4 rounded-xl bg-[#070b14] border border-white/5 space-y-2">
                      <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10px]">Real-time Sync Status</span>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px] font-mono">
                        <div>
                          <span className="text-gray-500 block text-[9px]">ATTEMPTS</span>
                          <span className="text-white font-bold">{supabaseStatus.totalSyncAttempts}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block text-[9px]">SUCCESSFUL SYNCS</span>
                          <span className="text-emerald-400 font-bold">{supabaseStatus.totalSyncSuccess}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500 block text-[9px]">LAST SYNC RUN</span>
                          <span className="text-white truncate block">
                            {supabaseStatus.lastSyncTime ? new Date(supabaseStatus.lastSyncTime).toLocaleTimeString() : 'Never'}
                          </span>
                        </div>
                      </div>

                      {supabaseStatus.lastSyncError ? (
                        <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] leading-relaxed">
                          <div className="font-bold mb-0.5">⚠️ Sync Connection Error Detected:</div>
                          <p className="font-mono text-[10px] bg-black/40 p-2 rounded border border-white/5 text-rose-300 break-all select-all leading-relaxed">
                            {supabaseStatus.lastSyncError}
                          </p>
                          <p className="mt-2 text-gray-300 text-[10px]">
                            This occurs because the <code className="text-purple-300 bg-white/5 px-1 py-0.5 rounded">users</code> table has not yet been initialized on your Supabase project. To resolve this instantly, copy and run the SQL script below.
                          </p>
                        </div>
                      ) : (
                        supabaseStatus.totalSyncSuccess > 0 && (
                          <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] flex items-center space-x-2">
                            <span>✅ Real-time synchronization is active and working perfectly!</span>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <h5 className="font-bold text-white flex items-center space-x-1">
                      <span className="text-purple-400 font-mono">1.</span>
                      <span>Required Setup Instructions:</span>
                    </h5>
                    <p className="text-gray-400 leading-relaxed text-[11px]">
                      Your Supabase database requires either the <code className="text-purple-300 font-mono px-1 py-0.5 bg-white/5 rounded">users</code> or <code className="text-purple-300 font-mono px-1 py-0.5 bg-white/5 rounded">profiles</code> table to exist with the correct column configuration so that the SMM Panel can sync credentials securely.
                    </p>
                    <p className="text-amber-400 leading-relaxed text-[11px] font-semibold bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl">
                      ⚠️ Note: If you see the message &quot;Could not find table public.users&quot; in the system logs, copy the SQL code below, navigate to your <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline text-amber-300 hover:text-amber-200">Supabase Dashboard</a>, click on the <strong>SQL Editor</strong> tab, paste it, and click <strong>Run</strong>.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-white flex items-center space-x-1">
                        <span className="text-purple-400 font-mono">2.</span>
                        <span>SQL Schema Script:</span>
                      </h5>
                      <button
                        type="button"
                        onClick={() => {
                          const sqlCode = `-- 1. Create public.users table\ncreate table if not exists public.users (\n  uid text primary key,\n  email text unique not null,\n  name text,\n  role text not null default 'user',\n  balance numeric(15,2) not null default 0.00,\n  status text not null default 'active',\n  updated_at timestamp with time zone default now() not null\n);\n\n-- Enable Row Level Security (RLS) and permit anonymous upserts for the sync connector\nalter table public.users enable row level security;\n\ncreate policy "Allow anonymous operations on users" on public.users for all to anon using (true) with check (true);\n\n-- 2. Create fallback profiles table\ncreate table if not exists public.profiles (\n  uid text primary key,\n  email text unique not null,\n  name text,\n  role text not null default 'user',\n  balance numeric(15,2) not null default 0.00,\n  status text not null default 'active',\n  updated_at timestamp with time zone default now() not null\n);\n\nalter table public.profiles enable row level security;\n\ncreate policy "Allow anonymous operations on profiles" on public.profiles for all to anon using (true) with check (true);`;
                          navigator.clipboard.writeText(sqlCode);
                          showSuccess('SQL setup script copied to clipboard!');
                        }}
                        className="px-3 py-1 bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600 text-[10px] font-bold text-white rounded-lg transition-all"
                      >
                        Copy SQL to Clipboard
                      </button>
                    </div>

                    <pre className="p-4 rounded-xl bg-gray-950 border border-white/5 text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-60 leading-relaxed scrollbar-thin">
{`-- 1. Create public.users table
create table if not exists public.users (
  uid text primary key,
  email text unique not null,
  name text,
  role text not null default 'user',
  balance numeric(15,2) not null default 0.00,
  status text not null default 'active',
  updated_at timestamp with time zone default now() not null
);

-- Enable Row Level Security (RLS) and permit anonymous upserts for the sync connector
alter table public.users enable row level security;

create policy "Allow anonymous operations on users" on public.users for all to anon using (true) with check (true);

-- 2. Create fallback profiles table (optional)
create table if not exists public.profiles (
  uid text primary key,
  email text unique not null,
  name text,
  role text not null default 'user',
  balance numeric(15,2) not null default 0.00,
  status text not null default 'active',
  updated_at timestamp with time zone default now() not null
);

alter table public.profiles enable row level security;

create policy "Allow anonymous operations on profiles" on public.profiles for all to anon using (true) with check (true);`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Sticky Save Action Bar */}
            <div className="glass-card p-6 rounded-2xl border border-white/5 flex justify-end items-center bg-gray-950/20 backdrop-blur-md">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold font-mono text-white tracking-wider uppercase transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center space-x-2"
              >
                {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>Persist Customizations</span>
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};
