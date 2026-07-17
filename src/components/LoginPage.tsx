import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Sparkles,
  Eye,
  X,
  Search,
  CheckCircle,
  Users,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Zap,
  Globe
} from 'lucide-react';
import { Service } from '../types.ts';
import { AnimatedLogo } from './AnimatedLogo.tsx';

interface LoginPageProps {
  onLogin: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [ytId, setYtId] = useState('');

  useEffect(() => {
    fetch('/api/public-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.homepageYoutubeId) {
          setYtId(data.homepageYoutubeId);
        }
      })
      .catch((err) => console.error("Error loading youtube setting:", err));
  }, []);

  useEffect(() => {
    if (showServicesModal) {
      fetch('/api/services/public')
        .then((res) => {
          if (res.ok) return res.json();
          return [];
        })
        .then((data) => setServices(data))
        .catch((err) => console.error(err));
    }
  }, [showServicesModal]);

  const categories = ['All', ...Array.from(new Set(services.map((s) => s.categoryName || 'General')))];

  const filteredServices = services.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const cat = s.categoryName || 'General';
    const matchesCategory = filterCategory === 'All' || cat === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#030712] relative overflow-hidden text-gray-200 flex flex-col justify-between font-sans">
      {/* Dynamic Cosmic Background Ambient */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] bg-blue-500/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] bg-purple-500/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.012)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Modern Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between z-20 border-b border-white/5 bg-gray-950/20 backdrop-blur-md">
        <AnimatedLogo size="md" />
        <button
          onClick={() => setShowServicesModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 text-xs font-semibold tracking-wide text-gray-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <Eye className="w-4 h-4 text-blue-400" />
          <span>View Public Services</span>
        </button>
      </header>

      {/* Main Screen Layout: Focused About & Google Login Card */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-12 z-10 max-w-7xl w-full mx-auto">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: About yuthsmm */}
          <div className="lg:col-span-7 space-y-8 text-left">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-4"
            >
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-300 text-xs font-semibold uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                <span>Next-Gen SMM Framework</span>
              </div>
              
              <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl tracking-tight text-white leading-[1.1]">
                Grow Faster with <br />
                <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                  YouthSMM
                </span>
              </h1>
              
              <div className="space-y-6 pt-4">
                <div className="flex items-start space-x-4">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex-shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Instant Automation & Growth</h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-md leading-relaxed">
                      Access premium SMM services, instant order tracking, secure payments, and 24/7 support—all from one dashboard.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex-shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Encrypted Financial Ledger</h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-md leading-relaxed">
                      Track and audit balance additions, secure discount coupons, and track historic transaction statements inside our isolated local databases.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex-shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Dynamic Developer API</h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-md leading-relaxed">
                      Integrate rest endpoints into your existing platforms with high-compatibility parameters and real-time JSON responses.
                    </p>
                  </div>
                </div>
              </div>

              {/* Dynamic Homepage YouTube Explainer Player */}
              {ytId && (
                <div className="mt-8 border border-white/5 rounded-2xl overflow-hidden shadow-2xl aspect-video w-full max-w-xl bg-gray-950/50 backdrop-blur-md relative group select-none">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-50" />
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${ytId}`}
                    title="Platform Introduction"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                </div>
              )}
            </motion.div>

            {/* Verification highlights */}
            <div className="flex items-center space-x-6 text-xs text-gray-500 font-mono border-t border-white/5 pt-6">
              <span className="flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Audited Core Engine</span>
              </span>
              <span>&middot;</span>
              <span className="flex items-center space-x-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
                <span>100% Client Isolation</span>
              </span>
            </div>
          </div>

          {/* Right Column: Dynamic Authentic Login & Google Trigger */}
          <div className="lg:col-span-5 w-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="glass-card rounded-2xl border border-white/5 p-8 shadow-2xl relative"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex flex-col items-center text-center space-y-6">
                <div className="p-3.5 rounded-full bg-gradient-to-tr from-blue-500/10 to-purple-500/10 border border-white/10 text-blue-400">
                  <Lock className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-white font-display">Welcome to yuthsmm</h2>
                  <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                    Instantly sign in using Google credentials to configure packages, dispatch tasks, and audit performance logs.
                  </p>
                </div>

                {/* Google Login Trigger */}
                <button
                  onClick={onLogin}
                  className="w-full flex items-center justify-center space-x-3 px-5 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all cursor-pointer group"
                >
                  <svg className="w-4 h-4 text-white group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor" />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                {/* Developer / Tester Notice Center */}
                <div className="w-full text-left bg-white/5 border border-white/5 rounded-xl p-4 space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold text-yellow-400">
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Developer & Tester Access Notes</span>
                  </div>
                  <ul className="text-[11px] text-gray-400 space-y-2 pl-4 list-disc font-mono">
                    <li>
                      Logging in with <strong className="text-gray-300">bhattg805@gmail.com</strong> immediately authenticates you as the <strong className="text-yellow-500">Admin</strong> role.
                    </li>
                    <li>
                      The Admin Panel automatically launches first for Admin profiles.
                    </li>
                    <li>
                      Any tester account can switch roles (between User and Admin) using the <strong className="text-gray-300">Switch Role</strong> tool on the sidebar.
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
          
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 py-6 px-6 bg-gray-950/40 z-10 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>&copy; 2026 yuthsmm Platform. Secure and verified containerized workspace.</p>
          <div className="flex items-center space-x-4">
            <span className="hover:text-gray-300 transition-colors">Vite Engine</span>
            <span>&middot;</span>
            <span className="hover:text-gray-300 transition-colors">PostgreSQL Database</span>
          </div>
        </div>
      </footer>

      {/* Interactive Services Inspection Modal */}
      <AnimatePresence>
        {showServicesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Modal Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowServicesModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-4xl bg-[#090d1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white font-display">Services catalog</h3>
                  <p className="text-xs text-gray-400">Inspect the complete, up-to-date catalog of active growth services.</p>
                </div>
                <button
                  onClick={() => setShowServicesModal(false)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filters & Search Inside Modal */}
              <div className="p-6 bg-white/[0.02] border-b border-white/5 flex flex-col md:flex-row gap-4 items-center">
                <div className="w-full md:flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search active services..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#030712] border border-white/5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="flex gap-1.5 overflow-x-auto max-w-full pb-1 no-scrollbar self-start md:self-center">
                  {categories.map((cat, idx) => (
                    <button
                      key={idx}
                      onClick={() => setFilterCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        filterCategory === cat
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Services List Table */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider">
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Service Name</th>
                        <th className="px-4 py-3 text-right">Price per 1k</th>
                        <th className="px-4 py-3 text-center">Min / Max</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {filteredServices.length > 0 ? (
                        filteredServices.map((srv) => (
                          <tr key={srv.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3 text-gray-500 font-mono">#{srv.id}</td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-gray-200">{srv.name}</div>
                              {srv.description && (
                                <div className="text-[10px] text-gray-500 mt-0.5">{srv.description}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                              ${srv.pricePerThousand.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-center text-gray-500 font-mono">
                              {srv.minAmount} / {srv.maxAmount}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="text-center py-12 text-gray-500 font-mono">
                            No matching services active.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/5 bg-white/[0.01] flex justify-between items-center text-xs">
                <div className="text-gray-500 flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>Interactive SMM Guest Mode</span>
                </div>
                <button
                  onClick={onLogin}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all cursor-pointer"
                >
                  Join & Order Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
