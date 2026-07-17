import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  PlusCircle,
  List,
  History,
  Wallet,
  Coins,
  Ticket,
  Heart,
  Share2,
  FileCode,
  LogOut,
  Settings,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Send,
  RefreshCw,
  Bell,
  Search,
  Star,
  Copy,
  Check,
  Globe,
  Package,
  RotateCcw,
  HelpCircle,
  Phone,
  Users,
  MessageSquare,
  Menu,
  ChevronDown,
  User as UserIcon,
  FileText,
  TrendingUp,
  Sparkles,
  BookOpen,
  QrCode,
  Smartphone,
  Facebook,
  Instagram,
  Youtube,
  Twitter,
  Music,
} from 'lucide-react';
import { User, Category, Service, Order, Ticket as TicketType, Payment, Announcement } from '../types.ts';
import { AnimatedLogo } from './AnimatedLogo.tsx';
import { getCategoryIcon } from '../lib/icons.tsx';

interface UserDashboardProps {
  user: User;
  token: string;
  onLogout: () => void;
  onRefreshProfile: () => void;
  isAdmin: boolean;
  onToggleAdminView: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  token,
  onLogout,
  onRefreshProfile,
  isAdmin,
  onToggleAdminView,
}) => {
  const [activeTab, setActiveTab] = useState('new-order');
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);

  // Blogs Reading States
  const [blogs, setBlogs] = useState<any[]>([]);
  const [fetchingBlogs, setFetchingBlogs] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState<any | null>(null);

  // Currency State (defaults to INR with persistence)
  const [currency, setCurrency] = useState<'USD' | 'INR' | 'EUR'>(() => {
    const saved = localStorage.getItem('smm_currency');
    return (saved as 'USD' | 'INR' | 'EUR') || 'INR';
  });

  const currencySymbols = {
    USD: '$',
    INR: '₹',
    EUR: '€',
  };

  const currencyRates = {
    USD: 0.012, // 1 INR is approx 0.012 USD
    INR: 1.0,   // Base is INR (1.0) so values like 5.03 display as ₹5.03
    EUR: 0.011, // 1 INR is approx 0.011 EUR
  };

  const changeCurrency = (curr: 'USD' | 'INR' | 'EUR') => {
    setCurrency(curr);
    localStorage.setItem('smm_currency', curr);
  };

  const formatAmount = (usdAmount: number) => {
    const converted = (Number(usdAmount) || 0) * currencyRates[currency];
    return `${currencySymbols[currency]}${converted.toFixed(2)}`;
  };

  const formatAmountFourDecimals = (usdAmount: number) => {
    const converted = (Number(usdAmount) || 0) * currencyRates[currency];
    return `${currencySymbols[currency]}${converted.toFixed(4)}`;
  };

  // Header Dropdown and Modals
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTrackerModal, setShowTrackerModal] = useState(false);

  // Child Panels and Refill History state
  const [childPanelsList, setChildPanelsList] = useState<any[]>([]);
  const [childPanelForm, setChildPanelForm] = useState({ domain: '', currency: 'USD', adminUsername: '', adminPassword: '' });
  const [orderingChildPanel, setOrderingChildPanel] = useState(false);
  const [refillRequestsList, setRefillRequestsList] = useState<any[]>([]);
  const [publicSettings, setPublicSettings] = useState<any>({});

  useEffect(() => {
    fetch('/api/public-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data) setPublicSettings(data);
      })
      .catch((err) => console.error("Error loading public settings:", err));
  }, []);

  // Form states
  const [depositCurrency, setDepositCurrency] = useState<'USD' | 'INR'>('USD');
  const [newOrder, setNewOrder] = useState({ categoryId: '', serviceId: '', link: '', quantity: '', coupon: '' });
  const [orderServiceSearch, setOrderServiceSearch] = useState('');
  const [massInput, setMassInput] = useState('');
  const [addFunds, setAddFunds] = useState({ amount: '', method: 'Stripe' });

  useEffect(() => {
    if (depositCurrency === 'USD') {
      const allowed: string[] = [];
      if (publicSettings.stripeStatus !== 'disabled') allowed.push('Stripe');
      if (publicSettings.paypalStatus !== 'disabled') allowed.push('PayPal');
      if (publicSettings.usdManualStatus !== 'disabled') allowed.push('Manual');
      if (allowed.length > 0 && !allowed.includes(addFunds.method)) {
        setAddFunds(prev => ({ ...prev, method: allowed[0] }));
      }
    } else {
      const allowed: string[] = [];
      if (publicSettings.phonepeStatus !== 'disabled') allowed.push('PhonePe');
      if (publicSettings.razorpayStatus !== 'disabled') allowed.push('Razorpay');
      if (publicSettings.bharatpeStatus === 'linked') allowed.push('BharatPe');
      if (publicSettings.upiStatus !== 'disabled') allowed.push('UPI');
      if (publicSettings.inrStripeStatus !== 'disabled') allowed.push('Stripe');
      if (publicSettings.inrManualStatus !== 'disabled') allowed.push('Manual');
      if (allowed.length > 0 && !allowed.includes(addFunds.method)) {
        setAddFunds(prev => ({ ...prev, method: allowed[0] }));
      }
    }
  }, [depositCurrency, publicSettings]);
  const [bharatpeUtr, setBharatpeUtr] = useState('');
  const [bharatpeAmount, setBharatpeAmount] = useState('');
  const [bharatpeActiveQr, setBharatpeActiveQr] = useState(false);
  const [qrPrefillAmount, setQrPrefillAmount] = useState(false);
  const [bpDepositLoading, setBpDepositLoading] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [ticketForm, setTicketForm] = useState({ subject: '', message: '' });
  const [activeTicketId, setActiveTicketId] = useState<number | null>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [replyMessage, setReplyMessage] = useState('');

  // Custom SMM Provider Setup
  const [customProviderUrl, setCustomProviderUrl] = useState(user.customProviderUrl || '');
  const [customProviderKey, setCustomProviderKey] = useState(user.customProviderKey || '');
  const [updatingProvider, setUpdatingProvider] = useState(false);

  useEffect(() => {
    setCustomProviderUrl(user.customProviderUrl || '');
    setCustomProviderKey(user.customProviderKey || '');
  }, [user]);

  const handleSaveCustomProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProvider(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/user/custom-provider', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customProviderUrl,
          customProviderKey,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('Custom SMM provider configuration updated successfully!');
        onRefreshProfile();
      } else {
        setErrorMsg(data.error || 'Failed to update custom provider settings.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error. Failed to save settings.');
    } finally {
      setUpdatingProvider(false);
    }
  };

  const [generatingApiKey, setGeneratingApiKey] = useState(false);
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  const [copiedApiUrl, setCopiedApiUrl] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleGenerateApiKey = async () => {
    setGeneratingApiKey(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/user/generate-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('Reseller API Key generated successfully!');
        onRefreshProfile();
      } else {
        setErrorMsg(data.error || 'Failed to generate API Key.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error. Failed to generate API Key.');
    } finally {
      setGeneratingApiKey(false);
    }
  };

  // Search & Filter
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedServiceCategory, setSelectedServiceCategory] = useState('All');

  // UI Feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [affiliateCode, setAffiliateCode] = useState({ referralCode: '', earnings: 0, visits: 0 });

  // Initial loading
  useEffect(() => {
    fetchDashboardData();
  }, [token, activeTab]);

  const fetchDashboardData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      if (activeTab === 'new-order') {
        const [catRes, srvRes, annRes, favRes] = await Promise.all([
          fetch('/api/user/categories', { headers }),
          fetch('/api/user/services', { headers }),
          fetch('/api/user/announcements', { headers }),
          fetch('/api/user/favorites', { headers }),
        ]);

        if (catRes.ok) setCategories(await catRes.json());
        if (srvRes.ok) setServices(await srvRes.json());
        if (annRes.ok) setAnnouncements(await annRes.json());
        if (favRes.ok) setFavorites(await favRes.json());
      } else if (activeTab === 'orders') {
        const res = await fetch('/api/user/orders', { headers });
        if (res.ok) setOrders(await res.json());
      } else if (activeTab === 'add-funds') {
        const res = await fetch('/api/user/payments', { headers });
        if (res.ok) setPayments(await res.json());
      } else if (activeTab === 'tickets') {
        const res = await fetch('/api/user/tickets', { headers });
        if (res.ok) setTickets(await res.json());
      } else if (activeTab === 'services') {
        const [catRes, srvRes, favRes] = await Promise.all([
          fetch('/api/user/categories', { headers }),
          fetch('/api/user/services', { headers }),
          fetch('/api/user/favorites', { headers }),
        ]);
        if (catRes.ok) setCategories(await catRes.json());
        if (srvRes.ok) setServices(await srvRes.json());
        if (favRes.ok) setFavorites(await favRes.json());
      } else if (activeTab === 'affiliate') {
        const res = await fetch('/api/user/affiliate', { headers });
        if (res.ok) setAffiliateCode(await res.json());
      } else if (activeTab === 'child-panels') {
        const res = await fetch('/api/user/child-panels', { headers });
        if (res.ok) setChildPanelsList(await res.json());
      } else if (activeTab === 'refill-history') {
        const res = await fetch('/api/user/refill-requests', { headers });
        if (res.ok) setRefillRequestsList(await res.json());
      } else if (activeTab === 'blogs') {
        await fetchUserBlogs();
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  const fetchUserBlogs = async () => {
    setFetchingBlogs(true);
    try {
      const res = await fetch('/api/blogs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setBlogs(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch blogs:', err);
    } finally {
      setFetchingBlogs(false);
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

  // Toggle favorite status
  const toggleFavorite = async (serviceId: number) => {
    try {
      const res = await fetch('/api/user/favorites/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ serviceId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.favorited) {
          setFavorites([...favorites, serviceId]);
        } else {
          setFavorites(favorites.filter(id => id !== serviceId));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Place Order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.serviceId || !newOrder.link || !newOrder.quantity) {
      showError('Please fill all fields.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/orders/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          serviceId: parseInt(newOrder.serviceId),
          link: newOrder.link,
          quantity: parseInt(newOrder.quantity),
          couponCode: newOrder.coupon,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showSuccess(data.message || 'Order placed successfully!');
        setNewOrder({ categoryId: '', serviceId: '', link: '', quantity: '', coupon: '' });
        onRefreshProfile();
      } else {
        showError(data.error || 'Failed to place order.');
      }
    } catch (err) {
      showError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Mass Order
  const handleMassOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!massInput.trim()) {
      showError('Input cannot be empty.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/orders/mass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ massInput }),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess('Mass orders processed successfully!');
        setMassInput('');
        onRefreshProfile();
      } else {
        showError(data.error || 'Failed to process mass orders.');
      }
    } catch (err) {
      showError('Failed to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  // Add Funds
  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(addFunds.amount);
    if (isNaN(amountVal) || amountVal <= 0) {
      showError('Please enter a valid deposit amount.');
      return;
    }
    const finalAmountDb = depositCurrency === 'INR' ? amountVal : (amountVal * 83.0);
    const finalMethodLabel = `${addFunds.method} (${depositCurrency})`;

    setLoading(true);
    try {
      const res = await fetch('/api/user/add-funds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: finalAmountDb,
          method: finalMethodLabel,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(data.message || 'Deposit completed!');
        setAddFunds({ amount: '', method: 'Stripe' });
        onRefreshProfile();
        fetchDashboardData();
      } else {
        showError(data.error || 'Payment transaction failed.');
      }
    } catch (err) {
      showError('Deposit simulation failed.');
    } finally {
      setLoading(false);
    }
  };

  // BharatPe UPI QR Deposit
  const handleBharatpeDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(bharatpeAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      showError('Please enter a valid deposit amount.');
      return;
    }
    const finalAmountDb = depositCurrency === 'INR' ? amountVal : (amountVal * 83.0);

    if (!bharatpeUtr || !/^\d{12}$/.test(bharatpeUtr)) {
      showError('Please enter a valid 12-digit UPI Transaction Ref (UTR).');
      return;
    }
    setBpDepositLoading(true);
    try {
      const res = await fetch('/api/user/add-funds-bharatpe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: finalAmountDb,
          utr: bharatpeUtr,
          paymentMethod: addFunds.method === 'UPI' ? 'UPI Direct QR' : 'BharatPe Dynamic QR'
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(data.message || 'Deposit successful!');
        setAddFunds({ amount: '', method: 'Stripe' });
        setBharatpeUtr('');
        setBharatpeAmount('');
        setBharatpeActiveQr(false);
        onRefreshProfile();
        fetchDashboardData();
      } else {
        showError(data.error || 'Failed to verify transaction.');
      }
    } catch (err) {
      showError('Failed to verify payment.');
    } finally {
      setBpDepositLoading(false);
    }
  };

  // Create Ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.subject || !ticketForm.message) {
      showError('Subject and Message are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/tickets/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(ticketForm),
      });
      if (res.ok) {
        showSuccess('Support ticket created successfully!');
        setTicketForm({ subject: '', message: '' });
        fetchDashboardData();
      } else {
        showError('Failed to create ticket.');
      }
    } catch (err) {
      showError('Error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  // Open Ticket Details
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

  // Submit Ticket Reply
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Request Refill
  const handleRequestRefill = async (orderId: number) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/refill`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showSuccess('Refill request submitted successfully!');
        fetchDashboardData();
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to submit refill request.');
      }
    } catch (err) {
      showError('Failed to contact server.');
    }
  };

  // Copy Referral Link
  const copyReferralLink = () => {
    const link = `${window.location.origin}/?ref=${affiliateCode.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Current selected service calculations
  const selectedService = services.find(s => s.id === Number(newOrder.serviceId));
  const estimatedPrice = selectedService
    ? ((Number(newOrder.quantity) || 0) / 1000) * selectedService.pricePerThousand
    : 0;

  // Filtered lists for views
  const filteredServicesList = services.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(serviceSearch.toLowerCase());
    const matchesCategory = selectedServiceCategory === 'All' || s.categoryId === Number(selectedServiceCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#030712] text-gray-200 flex flex-col relative overflow-x-hidden">
      {/* GLOBAL HEADER BAR matching brand style */}
      <header className="w-full h-16 bg-[#0a0f1d] border-b border-white/5 flex items-center justify-between px-4 md:px-8 sticky top-0 z-50 shadow-lg select-none">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center space-x-3.5 relative">
          {/* Balance Pill Button - displays converted currency */}
          <button 
            onClick={() => setActiveTab('add-funds')}
            className="px-3.5 py-1.5 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-white font-mono font-bold text-xs shadow-md transition-all flex items-center space-x-1 hover:scale-[1.02]"
          >
            <span>{formatAmount(user.balance)}</span>
          </button>

          {/* User Profile / Avatar Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center space-x-1.5 p-1 rounded-full bg-white/5 hover:bg-white/10 transition-all border border-white/10"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs select-none uppercase shadow-inner border border-white/10">
                {user.name ? user.name.slice(0, 2) : 'US'}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {/* Dropdown Menu (perfect replica of the user SMM image) */}
            {profileDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setProfileDropdownOpen(false)} 
                />
                <div className="absolute right-0 mt-2.5 w-60 rounded-xl bg-[#0f172a] border border-blue-500/20 shadow-2xl z-50 overflow-hidden py-1 divide-y divide-white/5 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2.5 text-xs text-gray-400">
                    Signed in as <span className="text-white font-bold block truncate mt-0.5">{user.email}</span>
                  </div>
                  
                  {/* Section 1: Standard Navigation */}
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setShowAccountModal(true);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-300 hover:bg-blue-600/20 hover:text-white transition-all flex items-center space-x-3"
                    >
                      <UserIcon className="w-4 h-4 text-sky-400" />
                      <span>Account</span>
                    </button>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setActiveTab('add-funds');
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-300 hover:bg-blue-600/20 hover:text-white transition-all flex items-center space-x-3"
                    >
                      <Wallet className="w-4 h-4 text-emerald-400" />
                      <span>Fund Add History</span>
                    </button>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-600/10 transition-all flex items-center space-x-3"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>

                  {/* Section 2: Policies, Currency & Tracking */}
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setShowTermsModal(true);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-300 hover:bg-blue-600/20 hover:text-white transition-all flex items-center space-x-3"
                    >
                      <FileText className="w-4 h-4 text-amber-400" />
                      <span>Terms and Conditions</span>
                    </button>
                    
                    {/* Change Currency nested inline selector */}
                    <div className="px-4 py-2 text-xs font-semibold text-gray-400 flex flex-col space-y-1.5">
                      <span className="flex items-center space-x-3 text-gray-300">
                        <Coins className="w-4 h-4 text-purple-400" />
                        <span>Change Currency</span>
                      </span>
                      <div className="grid grid-cols-3 gap-1 pl-7">
                        {(['USD', 'INR', 'EUR'] as const).map((curr) => (
                          <button
                            key={curr}
                            onClick={() => {
                              changeCurrency(curr);
                              setProfileDropdownOpen(false);
                            }}
                            className={`py-0.5 rounded text-[9px] font-bold border transition-all ${
                              currency === curr
                                ? 'bg-blue-600/25 border-blue-500 text-blue-400'
                                : 'bg-white/5 border-transparent text-gray-400 hover:text-white'
                            }`}
                          >
                            {curr}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setShowTrackerModal(true);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-300 hover:bg-blue-600/20 hover:text-white transition-all flex items-center space-x-3"
                    >
                      <TrendingUp className="w-4 h-4 text-pink-400" />
                      <span>Fund Tracker</span>
                    </button>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setShowPrivacyModal(true);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-300 hover:bg-blue-600/20 hover:text-white transition-all flex items-center space-x-3"
                    >
                      <ShieldCheck className="w-4 h-4 text-teal-400" />
                      <span>Privacy Policy</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">
        {/* Mobile menu backdrop */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Side Navigation panel - responsive drawer */}
        <aside className={`
          fixed md:relative inset-y-0 left-0 z-40 w-64 bg-[#0a0f1d] border-r border-white/5 flex flex-col p-6 space-y-8 flex-shrink-0 transform transition-transform duration-300 md:transform-none
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="hidden md:block">
            <AnimatedLogo size="md" />
          </div>

          {/* User Balance card in Sidebar */}
          <div className="glass-card p-4 rounded-xl border border-white/5 bg-white/[0.01]">
            <div className="text-xs text-gray-400 font-medium">Your Balance</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {formatAmount(user.balance)}
            </div>
            <button
              onClick={() => {
                setActiveTab('add-funds');
                setMobileMenuOpen(false);
              }}
              className="w-full mt-3 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-bold transition-all flex items-center justify-center space-x-1"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Add Funds</span>
            </button>
          </div>

          <nav className="flex-1 flex flex-col space-y-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {[
              { id: 'new-order', label: 'New Order', icon: <PlusCircle className="w-4 h-4 text-emerald-400" /> },
              { id: 'child-panels', label: 'Child Panels', icon: <Globe className="w-4 h-4 text-sky-400" /> },
              { id: 'orders', label: 'Orders', icon: <Package className="w-4 h-4 text-red-400" /> },
              { id: 'refill-history', label: 'Refill History', icon: <RotateCcw className="w-4 h-4 text-amber-400" /> },
              { id: 'services', label: 'Services', icon: <List className="w-4 h-4 text-blue-400" /> },
              { id: 'add-funds', label: 'Deposit', icon: <Wallet className="w-4 h-4 text-teal-400" /> },
              { id: 'tickets', label: 'Tickets', icon: <Ticket className="w-4 h-4" /> },
              { id: 'blogs', label: 'Blogs & News', icon: <BookOpen className="w-4 h-4 text-pink-400" /> },
              { id: 'faq', label: 'FAQ', icon: <HelpCircle className="w-4 h-4 text-green-400" /> },
              { id: 'api-docs', label: 'API', icon: <FileCode className="w-4 h-4 text-purple-400" /> },
              { id: 'affiliate', label: 'Refer & Earn', icon: <Users className="w-4 h-4 text-indigo-400" /> },
              { id: 'contact-us', label: 'Contact us', icon: <Phone className="w-4 h-4 text-pink-400" /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setActiveTicketId(null);
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600/10 text-blue-400 border-l-2 border-blue-500'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Footer/Meta inside sidebar */}
          <div className="space-y-3 pt-6 border-t border-white/5">
            {isAdmin && (
              <button
                onClick={onToggleAdminView}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg flex items-center justify-center space-x-1"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Admin Panel View</span>
              </button>
            )}

            {isAdmin && (
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
                      showSuccess('Role toggled successfully! Refreshing...');
                      setTimeout(() => {
                        onRefreshProfile();
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
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Switch Role ({user.role === 'admin' ? 'to User' : 'to Admin'})</span>
              </button>
            )}

            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border border-red-500/10 bg-red-500/5 hover:bg-red-500/10 text-red-400 hover:text-red-300 text-xs font-bold transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </aside>

        {/* Main panel container */}
        <main className="flex-1 p-4 md:p-10 max-w-6xl mx-auto overflow-y-auto">
          {/* Banner Messages */}
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center space-x-2 text-sm shadow-md animate-pulse">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center space-x-2 text-sm shadow-md">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 1: NEW ORDER */}
        {/* ===================================== */}
        {activeTab === 'new-order' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-card p-6 md:p-8 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full filter blur-xl" />
                <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                  <PlusCircle className="w-5 h-5 text-blue-500" />
                  <span>Place a New Order</span>
                </h2>

                <form onSubmit={handlePlaceOrder} className="space-y-5">
                  <div className="relative">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center justify-between">
                      <span>Search & Quick Select Service</span>
                      <span className="text-[10px] text-blue-400 font-medium normal-case">Instantly find any service...</span>
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Type service name, ID, or keyword (e.g. YouTube, Instagram)..."
                        value={orderServiceSearch}
                        onChange={(e) => setOrderServiceSearch(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-xs"
                      />
                      {orderServiceSearch && (
                        <button
                          type="button"
                          onClick={() => setOrderServiceSearch('')}
                          className="absolute right-3.5 top-3.5 text-gray-500 hover:text-white text-xs font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {orderServiceSearch && (
                      <div className="absolute z-30 w-full mt-2 rounded-xl bg-[#0e1528] border border-white/10 shadow-2xl max-h-64 overflow-y-auto divide-y divide-white/5 scrollbar-thin scrollbar-thumb-blue-500/20 scrollbar-track-transparent">
                        {services
                          .filter(s => 
                            s.name.toLowerCase().includes(orderServiceSearch.toLowerCase()) || 
                            s.id.toString().includes(orderServiceSearch) ||
                            (s.description && s.description.toLowerCase().includes(orderServiceSearch.toLowerCase()))
                          )
                          .slice(0, 30)
                          .map(s => {
                            const cat = categories.find(c => c.id === s.categoryId);
                            return (
                              <button
                                type="button"
                                key={s.id}
                                onClick={() => {
                                  setNewOrder({
                                    ...newOrder,
                                    categoryId: String(s.categoryId),
                                    serviceId: String(s.id),
                                  });
                                  setOrderServiceSearch('');
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex flex-col space-y-1"
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <span className="font-semibold text-xs text-white line-clamp-1 flex-1">
                                    #{s.id} - {s.name}
                                  </span>
                                  <span className="font-mono text-emerald-400 font-bold text-xs shrink-0 pl-2">
                                    ₹{s.pricePerThousand.toFixed(2)}/1K
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-gray-400">
                                  <span className="truncate max-w-[200px] text-blue-400">{cat?.name || 'Category'}</span>
                                  <span>Min: {s.minAmount} / Max: {s.maxAmount}</span>
                                </div>
                              </button>
                            );
                          })}
                        {services.filter(s => 
                          s.name.toLowerCase().includes(orderServiceSearch.toLowerCase()) || 
                          s.id.toString().includes(orderServiceSearch)
                        ).length === 0 && (
                          <div className="p-4 text-center text-xs text-gray-500">
                            No matching services found.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex justify-between items-center">
                      <span>Category</span>
                      <span className="text-[10px] text-blue-400 font-medium normal-case">Quick select below</span>
                    </label>

                    {/* Horizontal SMM Category Selection list */}
                    {categories.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-2 mb-3.5 no-scrollbar max-w-full">
                        {categories.map((cat) => {
                          const isSelected = String(cat.id) === newOrder.categoryId;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setNewOrder({ ...newOrder, categoryId: String(cat.id), serviceId: '' })}
                              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0 ${
                                isSelected
                                  ? 'bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-500/5'
                                  : 'bg-white/5 border-transparent hover:bg-white/10 text-gray-400 hover:text-white'
                              }`}
                            >
                              <span className="flex-shrink-0 flex items-center justify-center">
                                {getCategoryIcon(cat.icon, cat.name, 'w-4 h-4')}
                              </span>
                              <span>{cat.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="relative">
                      {newOrder.categoryId && (
                        <div className="absolute left-3.5 top-3.5 pointer-events-none text-gray-400 flex items-center justify-center">
                          {(() => {
                            const selectedCat = categories.find(c => String(c.id) === newOrder.categoryId);
                            return selectedCat ? getCategoryIcon(selectedCat.icon, selectedCat.name, 'w-4 h-4') : null;
                          })()}
                        </div>
                      )}
                      <select
                        value={newOrder.categoryId}
                        onChange={(e) => setNewOrder({ ...newOrder, categoryId: e.target.value, serviceId: '' })}
                        className={`w-full ${newOrder.categoryId ? 'pl-10' : 'pl-4'} pr-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm`}
                      >
                        <option value="">Select Category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Service</label>
                    <select
                      value={newOrder.serviceId}
                      onChange={(e) => setNewOrder({ ...newOrder, serviceId: e.target.value })}
                      disabled={!newOrder.categoryId}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-55"
                    >
                      <option value="">Select Service</option>
                      {services
                        .filter((s) => s.categoryId === Number(newOrder.categoryId))
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            #{s.id} - {s.name} - {formatAmount(s.pricePerThousand)} / 1K
                          </option>
                        ))}
                    </select>
                  </div>

                  {selectedService && (
                    <div className="p-4 rounded-xl bg-blue-600/5 border border-blue-500/10 text-xs text-gray-400 leading-relaxed">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-lg bg-white/5 border border-white/5">
                          {getCategoryIcon(selectedService.icon || (categories.find(c => c.id === selectedService.categoryId)?.icon), selectedService.name, 'w-3.5 h-3.5')}
                        </span>
                        <div className="font-semibold text-white">Service Details:</div>
                      </div>
                      <div className="pl-8">{selectedService.description || 'No description available for this service.'}</div>
                      <div className="flex gap-4 mt-2.5 pl-8 font-mono text-blue-400 text-[10px]">
                        <div>Min: {selectedService.minAmount}</div>
                        <div>Max: {selectedService.maxAmount}</div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Target Link / URL</label>
                    <input
                      type="url"
                      placeholder="https://instagram.com/p/..."
                      value={newOrder.link}
                      onChange={(e) => setNewOrder({ ...newOrder, link: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Quantity</label>
                    <input
                      type="number"
                      placeholder="1000"
                      value={newOrder.quantity}
                      onChange={(e) => setNewOrder({ ...newOrder, quantity: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Coupon / Promocode (Optional)</label>
                    <input
                      type="text"
                      placeholder="WELCOME10"
                      value={newOrder.coupon}
                      onChange={(e) => setNewOrder({ ...newOrder, coupon: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  {selectedService && (
                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex justify-between items-center text-sm">
                       <span className="text-gray-400 font-semibold">Estimated Charge</span>
                       <span className="text-xl font-bold font-mono text-emerald-400">
                        {formatAmountFourDecimals(estimatedPrice)}
                       </span>
                     </div>
                   )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-bold transition-all shadow-lg shadow-blue-500/10 flex items-center justify-center space-x-2"
                  >
                    {loading && <RefreshCw className="w-5 h-5 animate-spin" />}
                    <span>Submit Order</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Side announcements rail */}
            <div className="space-y-6">
              <div className="glass-card p-6 rounded-2xl border border-white/5">
                <h3 className="text-md font-bold text-white mb-4 flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-purple-400" />
                  <span>Announcements</span>
                </h3>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                  {announcements.length > 0 ? (
                    announcements.map((ann) => (
                      <div key={ann.id} className="p-4 rounded-xl bg-white/5 border border-white/5 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-white">{ann.title}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ann.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                            ann.type === 'warning' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'
                          }`}>
                            {ann.type}
                          </span>
                        </div>
                        <p className="text-gray-400 leading-relaxed mt-2">{ann.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-500 text-xs">No active announcements.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 2: MASS ORDER */}
        {/* ===================================== */}
        {activeTab === 'mass-order' && (
          <div className="glass-card p-8 rounded-2xl border border-white/5 max-w-3xl mx-auto shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Mass Order Processing</h2>
            <p className="text-xs text-gray-400 leading-relaxed mb-6">
              Place hundreds of distinct orders instantly. Format: <strong className="text-white font-mono">service_id|quantity|link_url</strong>.
              Enter one order per line.
            </p>

            <form onSubmit={handleMassOrder} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Bulk Input Lines</label>
                <textarea
                  rows={8}
                  placeholder="1|1000|https://instagram.com/p/123&#10;3|5000|https://tiktok.com/@user/video/345"
                  value={massInput}
                  onChange={(e) => setMassInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white font-mono text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold transition-all shadow-lg flex items-center justify-center space-x-2"
              >
                {loading && <RefreshCw className="w-5 h-5 animate-spin" />}
                <span>Process Mass Orders</span>
              </button>
            </form>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 3: ORDER HISTORY */}
        {/* ===================================== */}
        {activeTab === 'orders' && (
          <div className="glass-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Your Orders</h2>
              <button onClick={fetchDashboardData} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Service</th>
                    <th className="px-6 py-4">Target Link</th>
                    <th className="px-6 py-4 text-center">Qty</th>
                    <th className="px-6 py-4 text-right">Charge</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length > 0 ? (
                    orders.map(ord => (
                      <tr key={ord.id} className="border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
                        <td className="px-6 py-4 font-mono text-gray-500">#{ord.id}</td>
                        <td className="px-6 py-4 font-semibold text-white">{ord.serviceName}</td>
                        <td className="px-6 py-4">
                          <a href={ord.link} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline max-w-[200px] truncate block">
                            {ord.link}
                          </a>
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-gray-300">{ord.quantity}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-emerald-400">{formatAmount(ord.charge)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                            ord.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                            ord.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                            ord.status === 'processing' ? 'bg-blue-500/10 text-blue-400' :
                            'bg-red-500/10 text-red-400'
                          }`}>
                            {ord.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {ord.status === 'completed' && ord.refillStatus === 'none' && (
                            <button
                              onClick={() => handleRequestRefill(ord.id)}
                              className="px-3 py-1.5 rounded-lg border border-blue-500/30 hover:border-blue-500 text-blue-400 bg-blue-500/5 hover:bg-blue-500/10 text-xs font-bold transition-all"
                            >
                              Refill
                            </button>
                          )}
                          {ord.refillStatus === 'requested' && (
                            <span className="text-xs font-bold text-amber-400 animate-pulse">Refilling...</span>
                          )}
                          {ord.refillStatus === 'completed' && (
                            <span className="text-xs font-bold text-emerald-400">Refilled</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-500 text-sm">
                        You have not placed any orders yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 4: ADD FUNDS */}
        {/* ===================================== */}
        {activeTab === 'add-funds' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 glass-card p-6 md:p-8 rounded-2xl border border-white/5 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                <span>Add Funds / Deposit Wallet</span>
              </h2>

              {/* Currency Selector */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Deposit Currency</label>
                <div className="grid grid-cols-2 gap-3 bg-[#0b101f] p-1.5 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setDepositCurrency('USD');
                      setBharatpeActiveQr(false);
                    }}
                    className={`py-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                      depositCurrency === 'USD'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>USD ($) - Global Wallet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDepositCurrency('INR');
                      setBharatpeActiveQr(false);
                    }}
                    className={`py-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                      depositCurrency === 'INR'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>INR (₹) - Indian Rupee</span>
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Payment Method</label>
                  <select
                    value={addFunds.method}
                    onChange={(e) => {
                      setAddFunds({ ...addFunds, method: e.target.value });
                      setBharatpeActiveQr(false); // Reset active dynamic QR on method change
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    {depositCurrency === 'USD' ? (
                      <>
                        {publicSettings.stripeStatus !== 'disabled' && (
                          <option value="Stripe">Stripe (Credit / Debit Card) [USD]</option>
                        )}
                        {publicSettings.paypalStatus !== 'disabled' && (
                          <option value="PayPal">PayPal Checkout [USD]</option>
                        )}
                        {publicSettings.usdManualStatus !== 'disabled' && (
                          <option value="Manual">Manual Bank Transfer / Wire [USD]</option>
                        )}
                      </>
                    ) : (
                      <>
                        {publicSettings.phonepeStatus !== 'disabled' && (
                          <option value="PhonePe">PhonePe / GPay Instant [INR]</option>
                        )}
                        {publicSettings.razorpayStatus !== 'disabled' && (
                          <option value="Razorpay">Razorpay (NetBanking / UPI / Cards) [INR]</option>
                        )}
                        {publicSettings.bharatpeStatus === 'linked' && (
                          <option value="BharatPe">BharatPe Dynamic UPI QR (Instant Auto-Credit) [INR]</option>
                        )}
                        {publicSettings.upiStatus !== 'disabled' && (
                          <option value="UPI">UPI Direct QR Code [INR]</option>
                        )}
                        {publicSettings.inrStripeStatus !== 'disabled' && (
                          <option value="Stripe">Stripe (Credit / Debit Card) [INR]</option>
                        )}
                        {publicSettings.inrManualStatus !== 'disabled' && (
                          <option value="Manual">Manual Bank Transfer [INR]</option>
                        )}
                      </>
                    )}
                  </select>
                </div>

                {addFunds.method === 'BharatPe' || addFunds.method === 'UPI' ? (
                  // BharatPe / UPI Direct QR Checkout Wizard
                  <div className="space-y-6 pt-2">
                    {!bharatpeActiveQr ? (
                      // Step 1: Input Amount for BharatPe/UPI
                      <form onSubmit={(e) => { e.preventDefault(); setBharatpeAmount(addFunds.amount); setBharatpeActiveQr(true); }} className="space-y-5">
                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                            Deposit Amount ({depositCurrency === 'INR' ? 'INR - ₹' : 'USD - $'})
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-[15px] text-gray-400 font-mono font-bold">
                              {depositCurrency === 'INR' ? '₹' : '$'}
                            </span>
                            <input
                              type="number"
                              placeholder={depositCurrency === 'INR' ? '1000' : '25'}
                              required
                              value={addFunds.amount}
                              onChange={(e) => setAddFunds({ ...addFunds, amount: e.target.value })}
                              className="w-full pl-8 pr-4 py-3.5 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors font-mono font-bold"
                            />
                          </div>
                          
                          {parseFloat(addFunds.amount) > 0 && (
                            <div className="mt-4 p-4 rounded-xl bg-[#0b101f]/80 border border-white/5 space-y-3">
                              <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                                <span className="text-gray-400">Payment Method:</span>
                                <span className="font-bold text-white bg-white/5 px-2.5 py-1 rounded-md text-[10px] uppercase">
                                  {addFunds.method}
                                </span>
                              </div>

                              {depositCurrency === 'INR' ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-400">Payment Amount (INR):</span>
                                    <span className="font-mono font-bold text-white">
                                      ₹{parseFloat(addFunds.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} INR
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                                    <span className="text-emerald-400 font-medium">Wallet Credit (INR):</span>
                                    <span className="font-mono font-bold text-emerald-400">
                                      +₹{parseFloat(addFunds.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} INR
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-400">Payment Amount (USD):</span>
                                    <span className="font-mono font-bold text-white">
                                      ${parseFloat(addFunds.amount).toFixed(2)} USD
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                                    <span>Exchange Rate:</span>
                                    <span className="font-mono">$1 USD = ₹83.00 INR</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                                    <span className="text-emerald-400 font-medium">Wallet Credit (INR):</span>
                                    <span className="font-mono font-bold text-emerald-400">
                                      +₹{(parseFloat(addFunds.amount) * 83.0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} INR
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <button
                          type="submit"
                          className="w-full py-4 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold transition-all shadow-lg flex items-center justify-center space-x-2"
                        >
                          <QrCode className="w-5 h-5" />
                          <span>
                            {parseFloat(addFunds.amount) > 0
                              ? depositCurrency === 'INR'
                                ? `Pay ₹${parseFloat(addFunds.amount).toLocaleString()} INR & Generate QR`
                                : `Pay $${parseFloat(addFunds.amount)} USD & Generate QR`
                              : addFunds.method === 'UPI' ? 'Generate UPI Direct QR' : 'Generate Dynamic BharatPe UPI QR'}
                          </span>
                        </button>
                      </form>
                    ) : (
                      // Step 2: Dynamic QR Standee and UTR Entry
                      <div className="space-y-6">
                        <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl text-xs text-purple-200 leading-relaxed">
                          <span className="font-bold text-white block mb-1 flex items-center space-x-1">
                            <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
                            <span>{addFunds.method === 'UPI' ? 'Direct UPI QR Payment' : 'Active Dynamic QR Session'}</span>
                          </span>
                          {depositCurrency === 'INR' ? (
                            <span>Your transaction of <strong>₹{parseFloat(addFunds.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} INR</strong> will be credited directly as <strong>₹{parseFloat(addFunds.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} INR</strong> to your wallet balance.</span>
                          ) : (
                            <span>Your transaction of <strong>${parseFloat(addFunds.amount).toFixed(2)} USD</strong> will be converted at a fixed rate of $1 USD = ₹83.00 INR and credited as <strong>₹{(parseFloat(addFunds.amount) * 83.0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} INR</strong> to your wallet balance.</span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                          {/* Dynamic QR Standee View */}
                          <div className="flex flex-col items-center justify-center p-6 bg-[#090d1a] border border-white/5 rounded-2xl">
                            {addFunds.method === 'BharatPe' ? (
                              /* Elegant BharatPe Standee Recreation matching User's exact Uploaded image */
                              <div className="w-[280px] rounded-[2.5rem] p-4.5 border border-[#02a08b]/30 shadow-2xl relative overflow-hidden flex flex-col items-center select-none" style={{ background: 'linear-gradient(171deg, #f26c5f 63%, #017f6e 63%)' }}>
                                {/* Top area of standee: BharatPe Branding */}
                                <div className="w-full text-center mb-4 pt-2">
                                  <div className="text-white text-[10px] tracking-[0.15em] uppercase font-bold text-center leading-none opacity-90 drop-shadow-sm mb-1">
                                    Hai Yakeen
                                  </div>
                                  <div className="flex items-center justify-center space-x-1.5">
                                    {/* Beautiful high-fidelity BharatPe circle logo */}
                                    <span className="w-5 h-5 rounded-full bg-[#35cac0] flex items-center justify-center shadow-sm relative">
                                      <span className="w-2.5 h-2.5 rounded-full border-2 border-white border-t-transparent border-l-transparent transform -rotate-45 -translate-y-[0.5px]"></span>
                                    </span>
                                    <span className="text-white text-lg font-extrabold tracking-tight drop-shadow-sm leading-none flex items-center">
                                      <span>Bharat</span>
                                      <span className="font-light opacity-95">Pe</span>
                                    </span>
                                  </div>
                                </div>

                                {/* Central White Payment Info Card */}
                                <div className="w-full bg-white rounded-[1.75rem] p-4 flex flex-col items-center shadow-lg border border-white/10 z-10">
                                  {/* Merchant Name */}
                                  <div className="text-center font-extrabold text-lg text-gray-950 tracking-wider uppercase mb-3 mt-1 leading-none">
                                    {publicSettings.bharatpeMerchantName || 'PRIYA'}
                                  </div>

                                  {/* QR Code Container with subtle grey border */}
                                  <div className="w-44 h-44 border border-gray-100 rounded-2xl p-2.5 flex items-center justify-center bg-white relative shadow-sm overflow-hidden">
                                    {/* Dynamic QR image */}
                                    <img
                                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                                        qrPrefillAmount
                                          ? `upi://pay?pa=${publicSettings.bharatpeVpa || 'BHARATPE2HOD0Q1Y4T29351@unitype'}&pn=${encodeURIComponent(
                                              publicSettings.bharatpeMerchantName || 'PRIYA'
                                            )}&am=${(depositCurrency === 'INR' ? parseFloat(addFunds.amount) : parseFloat(addFunds.amount) * 83).toFixed(
                                              2
                                            )}&cu=INR&tn=SMMFunds&mc=0000&mode=02&purpose=00`
                                          : `upi://pay?pa=${publicSettings.bharatpeVpa || 'BHARATPE2HOD0Q1Y4T29351@unitype'}&pn=${encodeURIComponent(
                                              publicSettings.bharatpeMerchantName || 'PRIYA'
                                            )}&cu=INR&tn=SMMFunds`
                                      )}`}
                                      alt="BharatPe QR Code"
                                      className="w-full h-full object-contain"
                                      referrerPolicy="no-referrer"
                                    />
                                    {/* High fidelity BharatPe Logo Overlay in the center of the QR code */}
                                    <div className="absolute inset-0 m-auto w-10 h-10 bg-white rounded-full flex items-center justify-center p-[2px] shadow-md border border-gray-100">
                                      <div className="w-full h-full rounded-full bg-[#35cac0] flex items-center justify-center relative overflow-hidden">
                                        <div className="flex flex-col space-y-[2px] w-5 transform rotate-[15deg] items-center">
                                          <div className="w-4 h-[2px] bg-[#eb5e52] rounded-full"></div>
                                          <div className="w-4 h-[2px] bg-[#003831] rounded-full"></div>
                                          <div className="w-4 h-[2px] bg-white rounded-full"></div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* UPI ID / VPA Pill exactly like the image */}
                                  <div className="w-full py-2.5 px-3 rounded-xl bg-[#F8F9FA] border border-gray-200/60 flex items-center justify-center space-x-2 mt-4 shadow-inner">
                                    {/* Dynamic UPI Tricolor Triangle Badge */}
                                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden">
                                      <span className="w-0 h-0 border-t-[5px] border-t-amber-500 border-l-[5px] border-l-emerald-500 border-r-[5px] border-r-transparent border-b-[5px] border-b-transparent transform rotate-[45deg] -translate-x-[1px]"></span>
                                    </span>
                                    <span className="text-[10px] font-extrabold text-[#0D233A] font-mono tracking-wide break-all text-center select-all leading-none">
                                      {publicSettings.bharatpeVpa || 'BHARATPE2HOD0Q1Y4T29351@unitype'}
                                    </span>
                                  </div>
                                </div>

                                {/* BHIM UPI Bottom Footer section */}
                                <div className="w-full pt-4 flex flex-col items-center">
                                  <div className="flex items-center space-x-2 justify-center mb-1">
                                    <span className="text-white text-xl font-black tracking-widest italic font-sans drop-shadow-sm">BHIM</span>
                                    <span className="text-white/60 text-lg font-light leading-none">❯</span>
                                    <span className="text-white text-xl font-black tracking-widest italic font-sans drop-shadow-sm">UPI</span>
                                  </div>
                                  <div className="text-[6.5px] text-white/70 tracking-[0.18em] font-extrabold uppercase leading-none text-center mb-4">
                                    BHARAT INTERFACE FOR MONEY <span className="mx-0.5 text-white/30">•</span> UNIFIED PAYMENTS INTERFACE
                                  </div>
                                  
                                  <div className="text-[10px] text-white/95 font-medium mb-1.5">
                                    Pay with any UPI app
                                  </div>

                                  {/* Circular Payment App Logos */}
                                  <div className="flex items-center justify-center space-x-2.5 pb-2">
                                    <div className="w-6.5 h-6.5 rounded-full bg-white flex items-center justify-center shadow-sm border border-white/10 font-bold text-[7px] text-[#002E6E] leading-none">paytm</div>
                                    <div className="w-6.5 h-6.5 rounded-full bg-white flex items-center justify-center shadow-sm border border-white/10 font-bold text-[8px] text-[#1E88E5] leading-none">G Pay</div>
                                    <div className="w-6.5 h-6.5 rounded-full bg-[#5f259f] flex items-center justify-center shadow-sm border border-white/10 font-bold text-xs text-white leading-none">पे</div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* Fallback: Direct UPI QR Code Standee */
                              <div className="w-44 h-56 bg-white rounded-xl shadow-2xl p-4 flex flex-col justify-between border-t-[10px] border-pink-600 relative overflow-hidden">
                                <div className="text-center font-extrabold text-[11px] text-pink-900 tracking-wider">
                                  UPI Direct QR
                                </div>
                                
                                <div className="w-28 h-28 border border-gray-200 rounded-lg p-2 flex items-center justify-center mx-auto bg-white overflow-hidden">
                                  {publicSettings.upiDirectQrUrl ? (
                                    <img src={publicSettings.upiDirectQrUrl} alt="UPI QR" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                  ) : (
                                    <QrCode className="w-full h-full text-gray-900" />
                                  )}
                                </div>

                                <div className="text-center space-y-0.5">
                                  <div className="text-[9px] font-extrabold text-gray-800 truncate px-1">
                                    {publicSettings.upiDirectMerchantName || 'UPI Merchant'}
                                  </div>
                                  <div className="text-[9px] font-bold text-pink-700 tracking-tight">
                                    Pay ₹{depositCurrency === 'INR' ? parseFloat(addFunds.amount) : parseFloat(addFunds.amount) * 83}
                                  </div>
                                </div>

                                <div className="text-[6px] font-extrabold text-blue-900 text-center uppercase tracking-wide">
                                  GPAY, PHONEPE, PAYTM, BHIM
                                </div>
                              </div>
                            )}

                            {addFunds.method === 'BharatPe' && (
                              <div className="w-[280px] mt-4 p-3.5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex flex-col">
                                    <span className="text-[11px] font-bold text-white flex items-center space-x-1">
                                      <span>Pre-fill Amount</span>
                                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${qrPrefillAmount ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                                    </span>
                                    <span className="text-[9px] text-gray-400 leading-tight">
                                      {qrPrefillAmount ? 'Scans with amount' : 'Safe manual input'}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setQrPrefillAmount(!qrPrefillAmount)}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                      qrPrefillAmount ? 'bg-emerald-500' : 'bg-gray-700'
                                    }`}
                                  >
                                    <span
                                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                        qrPrefillAmount ? 'translate-x-4' : 'translate-x-0'
                                      }`}
                                    />
                                  </button>
                                </div>
                                
                                <div className="text-[10px] leading-relaxed text-gray-400 border-t border-white/5 pt-2">
                                  {!qrPrefillAmount ? (
                                    <span className="text-amber-400/95 font-medium flex items-start space-x-1.5">
                                      <span className="text-xs">⚠️</span>
                                      <span><strong>Recommended:</strong> Scan QR, then manually enter <strong>₹{(depositCurrency === 'INR' ? parseFloat(addFunds.amount) : parseFloat(addFunds.amount) * 83).toFixed(2)}</strong>. This bypasses scanner block/inactive errors.</span>
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">Attempts to set amount in app automatically. If scan fails, turn this option off.</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Interactive copy details & checkout steps */}
                          <div className="space-y-4">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Payment Details</h4>
                            
                            <div className="space-y-2.5">
                              <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5 flex justify-between items-center">
                                <div>
                                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">UPI ID / VPA</span>
                                  <span className="text-xs font-mono font-bold text-white">
                                    {addFunds.method === 'UPI' ? publicSettings.upiDirectVpa : publicSettings.bharatpeVpa}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const vpa = addFunds.method === 'UPI' ? publicSettings.upiDirectVpa : publicSettings.bharatpeVpa;
                                    navigator.clipboard.writeText(vpa || '');
                                    setCopiedPayload(true);
                                    setTimeout(() => setCopiedPayload(false), 2000);
                                  }}
                                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg text-[10px] font-bold transition-all"
                                >
                                  {copiedPayload ? 'Copied!' : 'Copy UPI'}
                                </button>
                              </div>

                              <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5 flex justify-between items-center">
                                <div>
                                  <span className="block text-[10px] text-gray-400 font-semibold uppercase">Exact Amount (INR)</span>
                                  <span className="text-xs font-mono font-bold text-emerald-400">
                                    ₹{depositCurrency === 'INR' ? parseFloat(addFunds.amount) : parseFloat(addFunds.amount) * 83}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const rawAmt = depositCurrency === 'INR' ? parseFloat(addFunds.amount) : parseFloat(addFunds.amount) * 83;
                                    navigator.clipboard.writeText(rawAmt.toString());
                                    showSuccess('Amount copied to clipboard!');
                                  }}
                                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg text-[10px] font-bold transition-all"
                                >
                                  Copy Amount
                                </button>
                              </div>
                            </div>

                            <div className="text-[11px] text-gray-400 space-y-1 bg-white/[0.01] p-3 rounded-xl border border-white/5">
                              <div className="font-semibold text-gray-300">Quick Steps:</div>
                              <div>1. Scan the QR code or pay using the UPI ID.</div>
                              <div>2. Pay the exact INR amount specified.</div>
                              <div>3. Copy the 12-digit UTR / Reference ID from the payment success receipt.</div>
                            </div>
                          </div>
                        </div>

                        {/* UTR Verification Block */}
                        <form onSubmit={handleBharatpeDeposit} className="pt-4 border-t border-white/5 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                            <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                                Confirm Paid Amount ({depositCurrency === 'INR' ? 'INR - ₹' : 'USD - $'})
                              </label>
                              <input
                                type="number"
                                step="any"
                                required
                                placeholder={depositCurrency === 'INR' ? 'e.g. 1000' : 'e.g. 25'}
                                value={bharatpeAmount}
                                onChange={(e) => setBharatpeAmount(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 transition-colors font-mono font-bold"
                              />
                              {parseFloat(bharatpeAmount) > 0 && (
                                <p className="text-[10px] text-emerald-400 mt-1 font-semibold">
                                  {depositCurrency === 'INR' ? (
                                    <span>Equivalent to ₹{parseFloat(bharatpeAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} INR Credit</span>
                                  ) : (
                                    <span>Equivalent to ₹{(parseFloat(bharatpeAmount) * 83.0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} INR Credit</span>
                                  )}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                                Enter 12-Digit Transaction UTR
                              </label>
                              <input
                                type="text"
                                maxLength={12}
                                required
                                placeholder="e.g. 210847950056"
                                value={bharatpeUtr}
                                onChange={(e) => setBharatpeUtr(e.target.value.replace(/\D/g, ''))}
                                className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 transition-colors font-mono font-bold"
                              />
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <button
                              type="submit"
                              disabled={bpDepositLoading || bharatpeUtr.length < 12 || !bharatpeAmount}
                              className="px-6 py-3.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-40 flex items-center space-x-2 shadow-lg"
                            >
                              {bpDepositLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                              <span>Confirm Payment & Credit Wallet</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => { setBharatpeActiveQr(false); setBharatpeUtr(''); }}
                              className="px-4 py-3.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold transition-all border border-white/5"
                            >
                              Cancel / Back
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                ) : (
                  // Standard Payment Methods Checkout Form
                  <form onSubmit={handleAddFunds} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                        Deposit Amount ({depositCurrency === 'INR' ? 'INR - ₹' : 'USD - $'})
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-[15px] text-gray-400 font-mono font-bold">
                          {depositCurrency === 'INR' ? '₹' : '$'}
                        </span>
                        <input
                          type="number"
                          placeholder={depositCurrency === 'INR' ? '1000' : '25'}
                          value={addFunds.amount}
                          onChange={(e) => setAddFunds({ ...addFunds, amount: e.target.value })}
                          className="w-full pl-8 pr-4 py-3.5 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors font-mono font-bold"
                        />
                      </div>

                      {parseFloat(addFunds.amount) > 0 && (
                        <div className="mt-4 p-4 rounded-xl bg-[#0b101f]/80 border border-white/5 space-y-3">
                          <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                            <span className="text-gray-400">Payment Method:</span>
                            <span className="font-bold text-white bg-white/5 px-2.5 py-1 rounded-md text-[10px] uppercase">
                              {addFunds.method}
                            </span>
                          </div>

                          {depositCurrency === 'INR' ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-400">Payment Amount (INR):</span>
                                <span className="font-mono font-bold text-white">
                                  ₹{parseFloat(addFunds.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} INR
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                                <span className="text-emerald-400 font-medium">Wallet Credit (INR):</span>
                                <span className="font-mono font-bold text-emerald-400">
                                  +₹{parseFloat(addFunds.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} INR
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-400">Payment Amount (USD):</span>
                                <span className="font-mono font-bold text-white">
                                  ${parseFloat(addFunds.amount).toFixed(2)} USD
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-gray-500">
                                <span>Exchange Rate:</span>
                                <span className="font-mono">$1 USD = ₹83.00 INR</span>
                              </div>
                              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                                <span className="text-emerald-400 font-medium">Wallet Credit (INR):</span>
                                <span className="font-mono font-bold text-emerald-400">
                                  +₹{(parseFloat(addFunds.amount) * 83.0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} INR
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !addFunds.amount || parseFloat(addFunds.amount) <= 0}
                      className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-lg flex items-center justify-center space-x-2 disabled:opacity-40"
                    >
                      {loading && <RefreshCw className="w-5 h-5 animate-spin" />}
                      <span>
                        {parseFloat(addFunds.amount) > 0
                          ? depositCurrency === 'INR'
                            ? `Pay ₹${parseFloat(addFunds.amount).toLocaleString()} INR & Initialize`
                            : `Pay $${parseFloat(addFunds.amount)} USD & Initialize`
                          : 'Initialize Secure Checkout'}
                      </span>
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6">
              {publicSettings.addFundPageContent && (
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-blue-200 leading-relaxed space-y-2 whitespace-pre-line">
                  <div className="font-bold text-white flex items-center space-x-2 border-b border-white/5 pb-2">
                    <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
                    <span>Payment Information & Rules</span>
                  </div>
                  <div>{publicSettings.addFundPageContent}</div>
                </div>
              )}

              <h3 className="text-md font-bold text-white">Deposit History</h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {payments.length > 0 ? (
                  payments.map(pay => (
                    <div key={pay.id} className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs flex justify-between items-center">
                      <div>
                        <div className="font-bold text-white">{formatAmount(pay.amount)}</div>
                        <div className="text-[10px] text-gray-400 mt-1">{pay.paymentMethod} &middot; {new Date(pay.createdAt).toLocaleDateString()}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold uppercase text-[9px]">
                        {pay.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500 text-xs">No payment history.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 5: SERVICES CATALOG */}
        {/* ===================================== */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <h2 className="text-xl font-bold text-white">Full Services Catalog</h2>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search catalog..."
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 text-xs rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <select
                  value={selectedServiceCategory}
                  onChange={(e) => setSelectedServiceCategory(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl bg-[#0b101f] border border-white/10 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="All">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Horizontal Category Selection bar for Services Catalog */}
            {categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar max-w-full">
                <button
                  type="button"
                  onClick={() => setSelectedServiceCategory('All')}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0 ${
                    selectedServiceCategory === 'All'
                      ? 'bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-500/5'
                      : 'bg-white/5 border-transparent hover:bg-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  <span className="flex-shrink-0 flex items-center justify-center">
                    {getCategoryIcon(null, 'All', 'w-4 h-4')}
                  </span>
                  <span>All Categories</span>
                </button>
                {categories.map((cat) => {
                  const isSelected = String(cat.id) === selectedServiceCategory;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedServiceCategory(String(cat.id))}
                      className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0 ${
                        isSelected
                          ? 'bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-500/5'
                          : 'bg-white/5 border-transparent hover:bg-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      <span className="flex-shrink-0 flex items-center justify-center">
                        {getCategoryIcon(cat.icon, cat.name, 'w-4 h-4')}
                      </span>
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4 text-center">Fav</th>
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">Service</th>
                      <th className="px-6 py-4 text-right">Price per 1,000</th>
                      <th className="px-6 py-4 text-center">Min Order</th>
                      <th className="px-6 py-4 text-center">Max Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredServicesList.length > 0 ? (
                      filteredServicesList.map(srv => {
                        const isFav = favorites.includes(srv.id);
                        const matchedCat = categories.find(c => c.id === srv.categoryId);
                        return (
                          <tr key={srv.id} className="border-b border-white/5 hover:bg-white/5 transition-colors text-sm">
                            <td className="px-6 py-4 text-center">
                              <button onClick={() => toggleFavorite(srv.id)} className="text-amber-400 hover:scale-110 transition-transform">
                                <Star className={`w-4 h-4 ${isFav ? 'fill-current' : 'text-gray-500'}`} />
                              </button>
                            </td>
                            <td className="px-6 py-4 font-mono text-gray-500">#{srv.id}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2.5">
                                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-lg bg-white/5 border border-white/5">
                                  {getCategoryIcon(srv.icon || (matchedCat ? matchedCat.icon : null), srv.name, 'w-3.5 h-3.5')}
                                </span>
                                <div>
                                  <div className="font-semibold text-white">{srv.name}</div>
                                  {matchedCat && (
                                    <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 mt-0.5 rounded bg-white/5 border border-white/5 text-[9px] text-gray-400 font-medium whitespace-nowrap">
                                      <span>{matchedCat.name}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                              {srv.description && (
                                <div className="text-xs text-gray-400 mt-1.5 pl-8.5">{srv.description}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right font-mono font-bold text-emerald-400">
                              {formatAmount(srv.pricePerThousand)}
                            </td>
                            <td className="px-6 py-4 text-center font-mono text-gray-400">{srv.minAmount}</td>
                            <td className="px-6 py-4 text-center font-mono text-gray-400">{srv.maxAmount}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-gray-500 text-sm">
                          No services found matching inputs.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 6: SUPPORT TICKETS */}
        {/* ===================================== */}
        {activeTab === 'tickets' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="glass-card p-6 rounded-2xl border border-white/5 shadow-2xl">
                <h3 className="text-md font-bold text-white mb-4">Create Support Ticket</h3>
                <form onSubmit={handleCreateTicket} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Subject</label>
                    <input
                      type="text"
                      placeholder="Order Drop / Payment Issue"
                      value={ticketForm.subject}
                      onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Detailed Message</label>
                    <textarea
                      rows={4}
                      placeholder="Please details what's wrong..."
                      value={ticketForm.message}
                      onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-md"
                  >
                    Open Ticket
                  </button>
                </form>
              </div>

              <div className="glass-card p-6 rounded-2xl border border-white/5">
                <h3 className="text-md font-bold text-white mb-4">Your Tickets</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {tickets.length > 0 ? (
                    tickets.map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleOpenTicket(t.id)}
                        className={`w-full p-4 rounded-xl text-left border transition-all text-xs flex justify-between items-center ${
                          activeTicketId === t.id
                            ? 'bg-blue-600/10 border-blue-500'
                            : 'bg-white/5 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-white max-w-[150px] truncate">{t.subject}</div>
                          <div className="text-[10px] text-gray-500 mt-1 font-mono">#{t.id} &middot; {new Date(t.createdAt).toLocaleDateString()}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          t.status === 'open' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {t.status}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-500 text-xs">No tickets submitted.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Conversation view */}
            <div className="lg:col-span-2">
              {activeTicketId ? (
                <div className="glass-card rounded-2xl border border-white/5 flex flex-col h-[500px] shadow-2xl overflow-hidden">
                  <div className="p-4 border-b border-white/5 bg-white/5 font-bold text-white">
                    Ticket Conversation #{activeTicketId}
                  </div>
                  <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                    {ticketMessages.map(msg => {
                      const isAdminMsg = msg.senderRole === 'admin';
                      return (
                        <div key={msg.id} className={`flex flex-col ${isAdminMsg ? 'items-start' : 'items-end'}`}>
                          <div className={`p-4 rounded-2xl max-w-sm text-sm leading-relaxed ${
                            isAdminMsg
                              ? 'bg-purple-600/10 border border-purple-500/20 text-purple-300'
                              : 'bg-blue-600 text-white'
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
                      placeholder="Type reply message..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <button type="submit" className="p-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              ) : (
                <div className="glass-card rounded-2xl border border-white/5 h-[500px] flex flex-col items-center justify-center text-center text-gray-500">
                  <Ticket className="w-12 h-12 text-gray-600 mb-3" />
                  <p className="text-sm">Select or open a ticket from the left column to view message thread.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 7: AFFILIATE PROGRAM */}
        {/* ===================================== */}
        {activeTab === 'affiliate' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="glass-card p-8 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full filter blur-2xl" />
              <h2 className="text-xl font-bold text-white mb-2 flex items-center space-x-2">
                <Share2 className="w-5 h-5 text-purple-400" />
                <span>Affiliate Commission Program</span>
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed mb-6">
                Earn money by inviting users! You get <span className="text-white font-bold font-mono">10% commission</span> on all deposit payments made by users referred through your link.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Visits</div>
                  <div className="text-2xl font-bold font-mono text-white mt-1">{affiliateCode.visits}</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Earnings</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{formatAmount(affiliateCode.earnings)}</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Referral Code & Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/?ref=${affiliateCode.referralCode}`}
                    className="flex-1 px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-gray-400 font-mono text-xs focus:outline-none"
                  />
                  <button
                    onClick={copyReferralLink}
                    className="px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors flex items-center space-x-1"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 8: DEVELOPER API */}
        {/* ===================================== */}
        {activeTab === 'api-docs' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* API Credentials Card */}
            <div className="glass-card p-6 md:p-8 rounded-2xl border border-white/5 shadow-2xl space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-2 flex items-center space-x-2">
                  <FileCode className="w-5 h-5 text-blue-400" />
                  <span>SMM Reseller API Connection</span>
                </h2>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Allow other SMM panels or custom scripts to connect to this panel. Generate a permanent API key and provide your API URL to automate orders and balance tracking.
                </p>
              </div>

              {errorMsg && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* API Link */}
                <div className="p-4 rounded-xl bg-[#0b101f] border border-white/5 space-y-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Your SMM API URL (API Link)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/api/v1`}
                      className="w-full bg-white/5 px-3 py-2 rounded-lg border border-white/5 text-gray-300 font-mono text-xs focus:outline-none select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/api/v1`);
                        setCopiedApiUrl(true);
                        setTimeout(() => setCopiedApiUrl(false), 2000);
                      }}
                      className="px-3 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg text-xs font-bold transition-all border border-blue-500/10 flex items-center space-x-1"
                    >
                      {copiedApiUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedApiUrl ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* API Key */}
                <div className="p-4 rounded-xl bg-[#0b101f] border border-white/5 space-y-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Your SMM API Key
                  </label>
                  {user.apiKey ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type={showApiKey ? "text" : "password"}
                          readOnly
                          value={user.apiKey}
                          className="w-full bg-white/5 px-3 py-2 rounded-lg border border-white/5 text-gray-300 font-mono text-xs focus:outline-none select-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="px-2.5 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-bold transition-all border border-white/5"
                        >
                          {showApiKey ? 'Hide' : 'Show'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(user.apiKey || '');
                            setCopiedApiKey(true);
                            setTimeout(() => setCopiedApiKey(false), 2000);
                          }}
                          className="px-3 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg text-xs font-bold transition-all border border-blue-500/10 flex items-center space-x-1"
                        >
                          {copiedApiKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedApiKey ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleGenerateApiKey}
                          disabled={generatingApiKey}
                          className="text-[10px] text-gray-400 hover:text-white transition-colors underline flex items-center space-x-1"
                        >
                          {generatingApiKey && <RefreshCw className="w-3 h-3 animate-spin mr-1" />}
                          <span>Regenerate API Key</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-start space-y-2 pt-1">
                      <span className="text-xs text-red-400">No API Key Generated.</span>
                      <button
                        type="button"
                        onClick={handleGenerateApiKey}
                        disabled={generatingApiKey}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg flex items-center space-x-2"
                      >
                        {generatingApiKey && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        <span>Generate SMM API Key</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Custom SMM Provider Setup */}
            <div className="glass-card p-6 md:p-8 rounded-2xl border border-white/5 shadow-2xl space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-2 flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-purple-400" />
                  <span>Custom SMM API Provider Integration</span>
                </h2>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Configure another provider's SMM API link and API key. Once set, your platform orders will automatically be dispatched directly to your specified external provider using your credentials.
                </p>
              </div>

              <form onSubmit={handleSaveCustomProvider} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                    External SMM API Endpoint URL (api link)
                  </label>
                  <input
                    type="url"
                    placeholder="https://anotherprovider.com/api/v2"
                    value={customProviderUrl}
                    onChange={(e) => setCustomProviderUrl(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                    External SMM API Key (api key)
                  </label>
                  <input
                    type="password"
                    placeholder="Enter your external provider api key"
                    value={customProviderKey}
                    onChange={(e) => setCustomProviderKey(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={updatingProvider}
                    className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/30 text-white font-bold text-xs transition-all shadow-lg flex items-center space-x-2"
                  >
                    {updatingProvider && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>{updatingProvider ? 'Saving Integration...' : 'Save API Integration'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* SMM API Documentation Card */}
            <div className="glass-card p-6 md:p-8 rounded-2xl border border-white/5 shadow-2xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white mb-2 flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  <span>SMM Panel Standard API Documentation</span>
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Our API follows standard SMM panel structures, making it immediately compatible with perfect panels, child panels, and SMM scripts. Send all requests using HTTP POST or GET to our endpoint URL.
                </p>
              </div>

              <div className="space-y-6 text-xs">
                {/* Action 1: Get Balance */}
                <div className="p-5 rounded-xl bg-[#0b101f] border border-white/5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold uppercase font-mono text-[10px]">GET / POST</span>
                      <span className="font-mono text-white font-semibold">action: "balance"</span>
                    </div>
                    <span className="text-[10px] text-gray-500">Query your account balance</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Request Parameters</span>
                      <table className="w-full text-left text-gray-300 font-mono">
                        <thead>
                          <tr className="text-gray-500 border-b border-white/5 text-[10px]">
                            <th className="pb-1">Parameter</th>
                            <th className="pb-1">Type</th>
                            <th className="pb-1">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-white/5">
                            <td className="py-1.5 text-blue-300">key</td>
                            <td className="py-1.5 text-gray-400">string</td>
                            <td className="py-1.5 text-gray-400">Your API Key</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 text-blue-300">action</td>
                            <td className="py-1.5 text-gray-400">string</td>
                            <td className="py-1.5 text-gray-400">"balance"</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Response JSON</span>
                      <pre className="bg-white/5 p-3 rounded-lg border border-white/5 font-mono text-emerald-400 text-[10px] overflow-x-auto leading-relaxed">
{`{
  "balance": "100.0000",
  "currency": "USD"
}`}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Action 2: Get Services */}
                <div className="p-5 rounded-xl bg-[#0b101f] border border-white/5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold uppercase font-mono text-[10px]">GET / POST</span>
                      <span className="font-mono text-white font-semibold">action: "services"</span>
                    </div>
                    <span className="text-[10px] text-gray-500">Fetch catalog with rates</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Request Parameters</span>
                      <table className="w-full text-left text-gray-300 font-mono">
                        <thead>
                          <tr className="text-gray-500 border-b border-white/5 text-[10px]">
                            <th className="pb-1">Parameter</th>
                            <th className="pb-1">Type</th>
                            <th className="pb-1">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-white/5">
                            <td className="py-1.5 text-blue-300">key</td>
                            <td className="py-1.5 text-gray-400">string</td>
                            <td className="py-1.5 text-gray-400">Your API Key</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 text-blue-300">action</td>
                            <td className="py-1.5 text-gray-400">string</td>
                            <td className="py-1.5 text-gray-400">"services"</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Response JSON (Truncated)</span>
                      <pre className="bg-white/5 p-3 rounded-lg border border-white/5 font-mono text-emerald-400 text-[10px] overflow-x-auto leading-relaxed">
{`[
  {
    "service": "1",
    "name": "Instagram Followers [High Quality]",
    "type": "Default",
    "category": "Instagram Followers",
    "rate": "1.2500",
    "min": "100",
    "max": "10000",
    "refill": false,
    "description": "Real followers with 30 days refill."
  }
]`}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Action 3: Place Order */}
                <div className="p-5 rounded-xl bg-[#0b101f] border border-white/5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold uppercase font-mono text-[10px]">GET / POST</span>
                      <span className="font-mono text-white font-semibold">action: "add"</span>
                    </div>
                    <span className="text-[10px] text-gray-500">Automate placing new orders</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Request Parameters</span>
                      <table className="w-full text-left text-gray-300 font-mono text-[11px]">
                        <thead>
                          <tr className="text-gray-500 border-b border-white/5 text-[10px]">
                            <th className="pb-1">Parameter</th>
                            <th className="pb-1">Type</th>
                            <th className="pb-1">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-white/5">
                            <td className="py-1 text-blue-300">key</td>
                            <td className="py-1 text-gray-400">string</td>
                            <td className="py-1 text-gray-400">Your API Key</td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-1 text-blue-300">action</td>
                            <td className="py-1 text-gray-400">string</td>
                            <td className="py-1 text-gray-400">"add"</td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-1 text-blue-300">service</td>
                            <td className="py-1 text-gray-400">integer</td>
                            <td className="py-1 text-gray-400">SMM Service ID</td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-1 text-blue-300">link</td>
                            <td className="py-1 text-gray-400">string</td>
                            <td className="py-1 text-gray-400">Destination target URL</td>
                          </tr>
                          <tr>
                            <td className="py-1 text-blue-300">quantity</td>
                            <td className="py-1 text-gray-400">integer</td>
                            <td className="py-1 text-gray-400">Amount to purchase</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Response JSON</span>
                      <pre className="bg-white/5 p-3 rounded-lg border border-white/5 font-mono text-emerald-400 text-[10px] overflow-x-auto leading-relaxed">
{`{
  "order": "1547"
}`}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Action 4: Check Order Status */}
                <div className="p-5 rounded-xl bg-[#0b101f] border border-white/5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold uppercase font-mono text-[10px]">GET / POST</span>
                      <span className="font-mono text-white font-semibold">action: "status"</span>
                    </div>
                    <span className="text-[10px] text-gray-500">Check tracking status (supports bulk query)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Request Parameters</span>
                      <table className="w-full text-left text-gray-300 font-mono text-[11px]">
                        <thead>
                          <tr className="text-gray-500 border-b border-white/5 text-[10px]">
                            <th className="pb-1">Parameter</th>
                            <th className="pb-1">Type</th>
                            <th className="pb-1">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-white/5">
                            <td className="py-1 text-blue-300">key</td>
                            <td className="py-1 text-gray-400">string</td>
                            <td className="py-1 text-gray-400">Your API Key</td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-1 text-blue-300">action</td>
                            <td className="py-1 text-gray-400">string</td>
                            <td className="py-1 text-gray-400">"status"</td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-1 text-blue-300 font-semibold">order</td>
                            <td className="py-1 text-gray-400">integer</td>
                            <td className="py-1 text-gray-400">Single order ID (Option A)</td>
                          </tr>
                          <tr>
                            <td className="py-1 text-blue-300 font-semibold">orders</td>
                            <td className="py-1 text-gray-400">string</td>
                            <td className="py-1 text-gray-400">Comma-separated order IDs (Option B)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Response JSON (Single vs Bulk)</span>
                      <pre className="bg-white/5 p-3 rounded-lg border border-white/5 font-mono text-emerald-400 text-[10px] overflow-x-auto leading-relaxed">
{`// Option A: Single Query
{
  "charge": "1.2500",
  "start_count": "3412",
  "status": "COMPLETED",
  "remains": "0",
  "currency": "USD"
}

// Option B: Bulk Query
{
  "1547": {
    "charge": "1.2500",
    "start_count": "3412",
    "status": "PENDING",
    "remains": "1000",
    "currency": "USD"
  },
  "1548": {
    "error": "Order not found"
  }
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 9: CHILD PANELS */}
        {/* ===================================== */}
        {activeTab === 'child-panels' && (
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Order Form */}
              <div className="lg:col-span-1 space-y-6">
                <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6 shadow-2xl">
                  <div>
                    <h2 className="text-lg font-bold text-white mb-1 flex items-center space-x-2">
                      <Globe className="w-5 h-5 text-sky-400" />
                      <span>Order Child Panel</span>
                    </h2>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Get your own fully-branded SMM panel. Connect our API and resell our high-quality services automatically.
                    </p>
                  </div>

                  {/* Promo Banner */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/20 text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-indigo-300">Reseller License Price</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">{formatAmount(10.00)}/mo</span>
                    </div>
                    <p className="text-gray-400">Includes auto-synced services updates, currency exchange support, and white-label design customization.</p>
                  </div>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setOrderingChildPanel(true);
                      setErrorMsg('');
                      setSuccessMsg('');

                      try {
                        const res = await fetch('/api/user/child-panels', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({
                            domain: childPanelForm.domain,
                            currency: childPanelForm.currency,
                            adminUsername: childPanelForm.adminUsername,
                            adminPassword: childPanelForm.adminPassword,
                            price: 10.0,
                          }),
                        });

                        const data = await res.json();
                        if (res.ok) {
                          showSuccess('Child Panel order placed successfully!');
                          setChildPanelForm({ domain: '', currency: 'USD', adminUsername: '', adminPassword: '' });
                          fetchDashboardData();
                          onRefreshProfile();
                        } else {
                          showError(data.error || 'Failed to place child panel order.');
                        }
                      } catch (err) {
                        console.error(err);
                        showError('Network error. Failed to connect to server.');
                      } finally {
                        setOrderingChildPanel(false);
                      }
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Domain Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. yourpanel.com"
                        value={childPanelForm.domain}
                        onChange={(e) => setChildPanelForm({ ...childPanelForm, domain: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Currency</label>
                      <select
                        value={childPanelForm.currency}
                        onChange={(e) => setChildPanelForm({ ...childPanelForm, currency: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white focus:outline-none focus:border-purple-500 text-sm"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="INR">INR (₹)</option>
                        <option value="EUR">EUR (€)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Admin Username</label>
                      <input
                        type="text"
                        required
                        placeholder="Choose admin username"
                        value={childPanelForm.adminUsername}
                        onChange={(e) => setChildPanelForm({ ...childPanelForm, adminUsername: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Admin Password</label>
                      <input
                        type="password"
                        required
                        placeholder="Choose admin password"
                        value={childPanelForm.adminPassword}
                        onChange={(e) => setChildPanelForm({ ...childPanelForm, adminPassword: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 text-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={orderingChildPanel}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-lg flex items-center justify-center space-x-2"
                    >
                      {orderingChildPanel ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                      <span>{orderingChildPanel ? 'Placing Order...' : `Order Child Panel (${formatAmount(10.00)})`}</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* Status Table */}
              <div className="lg:col-span-2 space-y-6">
                <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4 shadow-2xl">
                  <h3 className="text-md font-bold text-white">Your Child Panels</h3>

                  {childPanelsList.length === 0 ? (
                    <div className="py-12 text-center text-gray-500 text-xs">
                      You haven't ordered any child panels yet. Start your reselling business today!
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            <th className="py-3">ID</th>
                            <th className="py-3">Domain</th>
                            <th className="py-3">Currency</th>
                            <th className="py-3">Admin Account</th>
                            <th className="py-3">Price</th>
                            <th className="py-3">Status</th>
                            <th className="py-3 text-right">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                          {childPanelsList.map((panel) => (
                            <tr key={panel.id} className="hover:bg-white/[0.01] transition-colors">
                              <td className="py-4 font-mono text-gray-500">#{panel.id}</td>
                              <td className="py-4 font-semibold text-white flex items-center space-x-1.5">
                                <Globe className="w-3.5 h-3.5 text-blue-400" />
                                <span>{panel.domain}</span>
                              </td>
                              <td className="py-4 font-mono">{panel.currency}</td>
                              <td className="py-4">
                                <div className="text-gray-400">{panel.adminUsername}</div>
                                <div className="text-[10px] text-gray-600 font-mono">pass: ******</div>
                              </td>
                              <td className="py-4 font-mono">{formatAmount(Number(panel.price))}</td>
                              <td className="py-4">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    panel.status === 'active'
                                      ? 'bg-emerald-500/10 text-emerald-400'
                                      : panel.status === 'pending'
                                      ? 'bg-blue-500/10 text-blue-400'
                                      : 'bg-gray-500/10 text-gray-400'
                                  }`}
                                >
                                  {panel.status}
                                </span>
                              </td>
                              <td className="py-4 text-right text-gray-500 font-mono text-[10px]">
                                {new Date(panel.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 10: REFILL HISTORY */}
        {/* ===================================== */}
        {activeTab === 'refill-history' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="glass-card p-6 md:p-8 rounded-2xl border border-white/5 shadow-2xl space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-1 flex items-center space-x-2">
                  <RotateCcw className="w-5 h-5 text-amber-400" />
                  <span>Refill Requests History</span>
                </h2>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Track the progress of your submitted refill requests for orders that dropped or required replenishment.
                </p>
              </div>

              {refillRequestsList.length === 0 ? (
                <div className="py-16 text-center text-gray-500 text-xs">
                  No refill requests found. You can submit a refill request directly from your Orders History page on any completed orders.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <th className="py-3">Refill ID</th>
                        <th className="py-3">Order ID</th>
                        <th className="py-3">Service</th>
                        <th className="py-3">Link</th>
                        <th className="py-3">Charge</th>
                        <th className="py-3">Status</th>
                        <th className="py-3 text-right">Requested At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                      {refillRequestsList.map((req) => (
                        <tr key={req.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="py-4 font-mono text-gray-500">#{req.id}</td>
                          <td className="py-4 font-mono text-purple-400">#{req.orderId}</td>
                          <td className="py-4 font-semibold text-white max-w-[240px] truncate">
                            {req.serviceName}
                          </td>
                          <td className="py-4 font-mono text-gray-400 truncate max-w-[180px]">
                            <a
                              href={req.link}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:text-blue-400 flex items-center space-x-1"
                            >
                              <span className="truncate">{req.link}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          </td>
                          <td className="py-4 font-mono">{formatAmountFourDecimals(Number(req.charge))}</td>
                          <td className="py-4">
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
                          <td className="py-4 text-right text-gray-500 font-mono text-[10px]">
                            {new Date(req.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB: BLOGS & NEWS */}
        {/* ===================================== */}
        {activeTab === 'blogs' && (
          <div className="max-w-5xl mx-auto space-y-6">
            {selectedBlog ? (
              // Detailed Single Article view
              <div className="glass-card p-6 md:p-8 rounded-2xl border border-white/5 shadow-2xl space-y-6">
                <button
                  onClick={() => setSelectedBlog(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold transition-all border border-white/5 flex items-center space-x-1"
                >
                  <span>&larr; Back to Articles</span>
                </button>

                {selectedBlog.coverImage && (
                  <img
                    src={selectedBlog.coverImage}
                    alt={selectedBlog.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-64 md:h-80 object-cover rounded-2xl border border-white/15 shadow-xl"
                  />
                )}

                <div className="space-y-2">
                  <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">{selectedBlog.title}</h2>
                  <div className="text-xs text-gray-500 flex items-center space-x-2 font-mono">
                    <span>By {selectedBlog.authorName || 'Admin'}</span>
                    <span>&bull;</span>
                    <span>
                      {new Date(selectedBlog.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <hr className="border-white/5" />

                <div className="text-gray-300 text-sm md:text-base leading-relaxed whitespace-pre-wrap font-sans space-y-4">
                  {selectedBlog.content}
                </div>
              </div>
            ) : (
              // List view of all articles
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                    <BookOpen className="w-5 h-5 text-pink-400" />
                    <span>SMM Blogs & Marketing Resource Center</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">Stay up-to-date with industry tricks, platform feature announcements, and growth strategies.</p>
                </div>

                {fetchingBlogs ? (
                  <div className="text-center py-24 text-gray-500">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-pink-400" />
                    <p className="mt-3 text-xs font-mono">Fetching latest news...</p>
                  </div>
                ) : blogs.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {blogs.map((b) => (
                      <div
                        key={b.id}
                        className="glass-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl flex flex-col group hover:border-pink-500/25 transition-all duration-300"
                      >
                        {/* Cover image or fallback */}
                        {b.coverImage ? (
                          <img
                            src={b.coverImage}
                            alt={b.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-44 object-cover group-hover:scale-[1.02] transition-transform duration-300 border-b border-white/5"
                          />
                        ) : (
                          <div className="w-full h-44 bg-gradient-to-br from-pink-900/20 to-purple-900/20 flex items-center justify-center border-b border-white/5">
                            <BookOpen className="w-10 h-10 text-pink-500/20" />
                          </div>
                        )}

                        {/* Card Info */}
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-2">
                            <span className="text-[10px] uppercase font-bold text-pink-400 tracking-wider">
                              SMM INSIGHTS
                            </span>
                            <h3 className="font-bold text-white text-md group-hover:text-pink-400 transition-colors line-clamp-2">
                              {b.title}
                            </h3>
                            <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed">
                              {b.content}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-white/5">
                            <span className="text-[10px] text-gray-500 font-mono">
                              {new Date(b.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                            <button
                              onClick={() => setSelectedBlog(b)}
                              className="text-xs font-bold text-pink-400 hover:text-pink-300 flex items-center space-x-1"
                            >
                              <span>Read Article</span>
                              <span>&rarr;</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="glass-card p-12 rounded-2xl border border-white/5 text-center text-gray-500">
                    <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                    <h4 className="font-bold text-white text-sm mb-1">No articles published yet</h4>
                    <p className="text-xs max-w-sm mx-auto">Check back later for tutorials, marketing guides, and news updates on SMM solutions!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 11: FAQ */}
        {/* ===================================== */}
        {activeTab === 'faq' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="glass-card p-6 md:p-8 rounded-2xl border border-white/5 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-2 flex items-center space-x-2">
                <HelpCircle className="w-5 h-5 text-green-400" />
                <span>Frequently Asked Questions</span>
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed mb-8">
                Find quick answers to general inquiries, billing processes, and social media fulfillment mechanics.
              </p>

              <div className="space-y-4">
                {[
                  {
                    q: 'How does the Refill Guarantee work?',
                    a: 'If you purchase a service with a refill guarantee and the quantity drops (unsubscribes or unlikes), you can trigger a free replenishment by clicking the "Refill" button in your Orders panel within the guarantee period. Our backend will automatically dispatch a command to top it back up.',
                  },
                  {
                    q: 'What is a "Start Count" and "Remains"?',
                    a: 'The "Start Count" represents the initial count of followers/likes detected on the social media link when your order was dispatched. "Remains" indicates how many more interactions need to be delivered to complete your transaction.',
                  },
                  {
                    q: 'Can I place the same link multiple times simultaneously?',
                    a: 'No. Please wait for your active order on a specific link to be marked as "Completed", "Partial" or "Cancelled" before submitting another order for that same link. Overlapping orders will trigger synchronization issues with API counters and cannot be refunded.',
                  },
                  {
                    q: 'What is a Child SMM Panel?',
                    a: 'A Child SMM Panel is your own white-label storefront that operates on your domain. It connects directly to our platform APIs, allowing you to resell all of our premium social media services with your custom margins. You collect payments directly from your buyers and pay us at our base rates.',
                  },
                  {
                    q: 'Why was my order Cancelled?',
                    a: 'Orders can be automatically cancelled or refunded to your balance due to several factors: private account settings, bad URL structure, service update downtimes, or overloaded servers. Check your profile logs for cancellation detail notes.',
                  },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="p-5 rounded-xl bg-[#0b101f] border border-white/5 space-y-2 hover:border-white/10 transition-colors"
                  >
                    <h3 className="text-sm font-bold text-white flex items-start space-x-2">
                      <span className="text-green-400">Q.</span>
                      <span>{item.q}</span>
                    </h3>
                    <p className="text-xs text-gray-400 pl-5 leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 12: CONTACT US */}
        {/* ===================================== */}
        {activeTab === 'contact-us' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
              {/* Left support widgets */}
              <div className="md:col-span-2 space-y-6">
                <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6 shadow-2xl">
                  <h3 className="text-md font-bold text-white flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-pink-400" />
                    <span>Instant Support Channels</span>
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Need immediate assistance? Connect with our dedicated support agents on official messaging platforms.
                  </p>

                  <div className="space-y-3 pt-2">
                    <a
                      href="https://t.me/smm_support_desk"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-3 p-3.5 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600/20 transition-all font-semibold text-xs"
                    >
                      <Send className="w-4 h-4" />
                      <span>Telegram Support Desk</span>
                    </a>

                    <a
                      href="https://wa.me/1234567890"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-3 p-3.5 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/20 transition-all font-semibold text-xs"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>WhatsApp Hotline (24/7)</span>
                    </a>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 text-xs text-gray-400">
                    <div className="flex justify-between">
                      <span>Working Hours:</span>
                      <span className="text-white font-medium">9:00 AM - 12:00 PM GMT</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Response Rate:</span>
                      <span className="text-emerald-400 font-bold">~15 Minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Operational Days:</span>
                      <span className="text-white font-medium">Monday - Sunday</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Form that auto-creates support tickets */}
              <div className="md:col-span-3">
                <div className="glass-card p-6 md:p-8 rounded-2xl border border-white/5 space-y-6 shadow-2xl">
                  <div>
                    <h2 className="text-lg font-bold text-white mb-1 flex items-center space-x-2">
                      <MessageSquare className="w-5 h-5 text-purple-400" />
                      <span>Send Direct Message</span>
                    </h2>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Send a message straight to our executive queue. This instantly creates a priority support ticket in our secure system.
                    </p>
                  </div>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setLoading(true);
                      setErrorMsg('');
                      setSuccessMsg('');

                      try {
                        const res = await fetch('/api/tickets/new', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({
                            subject: `Direct Contact: ${ticketForm.subject}`,
                            message: ticketForm.message,
                          }),
                        });

                        const data = await res.json();
                        if (res.ok) {
                          showSuccess('Your message was delivered! A support ticket has been opened.');
                          setTicketForm({ subject: '', message: '' });
                          fetchDashboardData();
                        } else {
                          showError(data.error || 'Failed to send message.');
                        }
                      } catch (err) {
                        console.error(err);
                        showError('Network error. Failed to submit message.');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Subject / Order ID</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Order #1459 drop issue / payment not added"
                        value={ticketForm.subject}
                        onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Your Message</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Describe your issue or custom offer inquiry in detail..."
                        value={ticketForm.message}
                        onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-[#0b101f] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 text-sm resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-lg flex items-center justify-center space-x-2"
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>{loading ? 'Sending Message...' : 'Deliver Priority Support Message'}</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===================================== */}
      {/* PORTFOLIO / MODAL LAYOUTS */}
      {/* ===================================== */}

      {/* 1. Account Details Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#0a0f1d] border border-blue-500/20 rounded-2xl shadow-2xl p-6 md:p-8 space-y-6">
            <button 
              onClick={() => setShowAccountModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <UserIcon className="w-5 h-5 text-blue-400" />
              <span>Account & Profile Settings</span>
            </h3>
            
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">User Name</span>
                  <span className="font-semibold text-white mt-1 block">{user.name || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Access Role</span>
                  <span className="font-semibold text-purple-400 mt-1 block capitalize font-mono">{user.role}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Email Address</span>
                  <span className="font-semibold text-white mt-0.5 block">{user.email}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">SMM API Key / Token</span>
                  <div className="font-mono text-xs text-blue-400 select-all break-all bg-black/30 p-2.5 rounded-lg border border-white/5 mt-1.5">
                    {token.slice(0, 32)}...
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-xs text-amber-400 leading-relaxed">
                Your credentials and API session are encrypted using secure token handshakes. Never share your API key with third parties.
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowAccountModal(false)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Terms and Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-[#0a0f1d] border border-blue-500/20 rounded-2xl shadow-2xl p-6 md:p-8 space-y-5 flex flex-col max-h-[85vh]">
            <button 
              onClick={() => setShowTermsModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <FileText className="w-5 h-5 text-amber-400" />
              <span>Terms of Service Agreement</span>
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-4 text-xs text-gray-400 pr-2 leading-relaxed scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              <p className="text-gray-200 font-semibold">Welcome to our platform. By using our dashboard or APIs, you automatically agree to the following terms:</p>
              
              <div className="space-y-2">
                <h4 className="font-bold text-white">1. Service Delivery & Execution</h4>
                <p>We do not guarantee 100% continuous uptime or delivery speed, as our system synchronizes with global social media platform APIs. SMM interaction counts (likes, subscribers, views) are subject to automated network sweeps. We offer no direct refunds for dropped delivery unless explicitly covered under the refill agreement.</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white">2. Refund & Payment Policy</h4>
                <p>Deposits added to your wallet balance are final and non-refundable. Wallet credits must be fully consumed inside the platform through ordering SMM services. Opening credit card disputes or PayPal chargebacks will trigger immediate permanent account suspension and API token termination.</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white">3. Platform Rules & Account Integrity</h4>
                <p>You agree not to use SMM campaigns for illicit, abusive, harassing, political, or adult media content. Multiple accounts are strictly forbidden. Users with custom child panels must implement identical moderation boundaries for downstream clients.</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white">4. API Integration Responsibility</h4>
                <p>Developers who connect custom systems through our Bearer token API bear full responsibility for request volume control, payload correctness, and downstream user security. We are not liable for accidental expense drains due to infinite looping script errors.</p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-white/5">
              <button
                onClick={() => setShowTermsModal(false)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Privacy Policy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-[#0a0f1d] border border-blue-500/20 rounded-2xl shadow-2xl p-6 md:p-8 space-y-5 flex flex-col max-h-[80vh]">
            <button 
              onClick={() => setShowPrivacyModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-teal-400" />
              <span>Privacy & Data Protection Policy</span>
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-4 text-xs text-gray-400 pr-1 leading-relaxed">
              <p className="text-gray-200">We respect your absolute privacy and implement industry-standard cryptographic practices to safeguard SMM logs:</p>
              
              <div className="space-y-1.5">
                <h4 className="font-bold text-white">Information We Gather</h4>
                <p>We process only essential data: email address for account authentication, password hashes, and social network link targets required to route SMM orders to execution APIs.</p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-white">No Target Telemetry Storage</h4>
                <p>We do not collect personal device locations, web trackers, or search history. Target SMM links are cached temporarily for active tracking state updates and fully anonymized upon order completion.</p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-white">Third-Party Handshakes</h4>
                <p>Payment details are processed exclusively through Stripe, PayPal, Razorpay, or PhonePe via high-security iframe handshakes. No raw credit card credentials ever touch or reside on our servers.</p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-white/5">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
              >
                Close Policy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Fund Tracker Modal (Analytics / Stats Breakdown) */}
      {showTrackerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-[#0a0f1d] border border-blue-500/20 rounded-2xl shadow-2xl p-6 md:p-8 space-y-6">
            <button 
              onClick={() => setShowTrackerModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-pink-400" />
              <span>Personal SMM Fund Tracker</span>
            </h3>
            
            <div className="space-y-5 text-sm">
              <p className="text-xs text-gray-400">
                A granular breakdown of your deposits, wallet consumption, and active campaign commitments.
              </p>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Current Balance</span>
                  <span className="text-lg font-bold font-mono text-emerald-400 mt-1 block">
                    {formatAmount(user.balance)}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/10 text-center">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Total Deposited</span>
                  <span className="text-lg font-bold font-mono text-blue-400 mt-1 block">
                    {formatAmount(payments.reduce((sum, p) => p.status === 'completed' ? sum + p.amount : sum, 0))}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/10 text-center">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Total Spent</span>
                  <span className="text-lg font-bold font-mono text-purple-400 mt-1 block">
                    {formatAmount(orders.reduce((sum, o) => o.status !== 'cancelled' ? sum + o.charge : sum, 0))}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="font-bold text-white">Active Balance Allocation</div>
                <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden flex">
                  {(() => {
                    const totalDeposits = payments.reduce((sum, p) => p.status === 'completed' ? sum + p.amount : sum, 0) || 1;
                    const totalSpent = orders.reduce((sum, o) => o.status !== 'cancelled' ? sum + o.charge : sum, 0);
                    const spentPercent = Math.min(100, (totalSpent / totalDeposits) * 100);
                    const balPercent = Math.max(0, 100 - spentPercent);
                    return (
                      <>
                        <div style={{ width: `${spentPercent}%` }} className="h-full bg-purple-500" />
                        <div style={{ width: `${balPercent}%` }} className="h-full bg-emerald-500" />
                      </>
                    );
                  })()}
                </div>
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span className="flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    <span>Spent Credits</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Available Liquidity</span>
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2.5 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>Total Placed Orders:</span>
                  <span className="text-white font-mono font-bold">{orders.length} orders</span>
                </div>
                <div className="flex justify-between">
                  <span>Pending Refills:</span>
                  <span className="text-amber-400 font-mono font-bold">
                    {orders.filter(o => o.refillStatus === 'requested').length} active
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Supported Methods Used:</span>
                  <span className="text-white font-mono truncate max-w-[200px]">
                    {Array.from(new Set(payments.map(p => p.paymentMethod))).join(', ') || 'None'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowTrackerModal(false)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
              >
                Close Tracker
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};
