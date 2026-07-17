import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { UserDashboard } from './components/UserDashboard.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { RefreshCw, ShieldAlert } from 'lucide-react';
import { applyThemeVariables } from './lib/theme.ts';

function executeScripts(parent: HTMLElement) {
  const scripts = Array.from(parent.getElementsByTagName('script'));
  scripts.forEach((oldScript) => {
    const newScript = document.createElement('script');
    Array.from(oldScript.attributes).forEach((attr) =>
      newScript.setAttribute(attr.name, attr.value)
    );
    newScript.appendChild(document.createTextNode(oldScript.innerHTML));
    oldScript.parentNode?.replaceChild(newScript, oldScript);
  });
}

function AppContent() {
  const { firebaseUser, user, token, loading, login, logout, refreshProfile } = useAuth();
  const [viewMode, setViewMode] = useState<'homepage' | 'dashboard'>('homepage');
  const [adminActive, setAdminActive] = useState(false);
  const [publicSettings, setPublicSettings] = useState<any>({});

  // Fetch and apply public settings
  useEffect(() => {
    fetch('/api/public-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setPublicSettings(data);

          // Apply active theme
          if (data.activeTheme) {
            applyThemeVariables(data.activeTheme);
          } else {
            applyThemeVariables('default');
          }

          // 1. Website Name
          if (data.websiteName) {
            document.title = data.websiteName;
          }

          // 2. Favicon
          if (data.favicon) {
            let faviconLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
            if (!faviconLink) {
              faviconLink = document.createElement('link');
              faviconLink.rel = 'icon';
              document.head.appendChild(faviconLink);
            }
            faviconLink.href = data.favicon;
          }

          // 3. SEO Keywords
          if (data.seoKeywords) {
            let meta = document.querySelector("meta[name='keywords']") as HTMLMetaElement;
            if (!meta) {
              meta = document.createElement('meta');
              meta.name = 'keywords';
              document.head.appendChild(meta);
            }
            meta.content = data.seoKeywords;
          }

          // 4. SEO Description
          if (data.seoDescription) {
            let meta = document.querySelector("meta[name='description']") as HTMLMetaElement;
            if (!meta) {
              meta = document.createElement('meta');
              meta.name = 'description';
              document.head.appendChild(meta);
            }
            meta.content = data.seoDescription;
          }

          // 5. Additional Header Code (General)
          if (data.additionalHeaderCode) {
            let container = document.getElementById('custom-header-code');
            if (!container) {
              container = document.createElement('div');
              container.id = 'custom-header-code';
              document.head.appendChild(container);
            }
            container.innerHTML = data.additionalHeaderCode;
            executeScripts(container);
          }

          // 6. Additional Footer Code (General)
          if (data.additionalFooterCode) {
            let container = document.getElementById('custom-footer-code');
            if (!container) {
              container = document.createElement('div');
              container.id = 'custom-footer-code';
              document.body.appendChild(container);
            }
            container.innerHTML = data.additionalFooterCode;
            executeScripts(container);
          }
        }
      })
      .catch((err) => console.error('Failed to load public settings:', err));
  }, []);

  // Additional Header Code - After Login pages
  useEffect(() => {
    if (firebaseUser && publicSettings?.additionalHeaderCodeAfterLogin) {
      let container = document.getElementById('custom-header-after-login');
      if (!container) {
        container = document.createElement('div');
        container.id = 'custom-header-after-login';
        document.head.appendChild(container);
      }
      container.innerHTML = publicSettings.additionalHeaderCodeAfterLogin;
      executeScripts(container);
    } else {
      const el = document.getElementById('custom-header-after-login');
      if (el) el.remove();
    }
  }, [firebaseUser, publicSettings]);

  // Auto-redirect to dashboard when user logs in, and first open admin panel if they are admin
  useEffect(() => {
    if (firebaseUser) {
      setViewMode('dashboard');
      if (user && user.role === 'admin' && user.email?.toLowerCase() === 'bhattg805@gmail.com') {
        setAdminActive(true);
      }
    } else {
      setViewMode('homepage');
      setAdminActive(false);
    }
  }, [firebaseUser, user]);

  const renderActiveView = () => {
    if (loading) {
      return (
        <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center text-gray-200 space-y-4">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse-glow" />
            <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
          </div>
          <div className="text-sm font-semibold tracking-wide text-gray-400 font-display">
            {publicSettings.websiteName || 'yuthsmm'} &middot; Loading workspace...
          </div>
        </div>
      );
    }

    // Handle suspended status
    if (user && user.status === 'suspended') {
      return (
        <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center text-gray-200 p-6 text-center space-y-6">
          <div className="p-4 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 shadow-lg">
            <ShieldAlert className="w-12 h-12" />
          </div>
          <div className="max-w-md space-y-2">
            <h1 className="text-2xl font-bold font-display text-white">Account Suspended</h1>
            <p className="text-sm text-gray-400 leading-relaxed">
              Your profile has been suspended for terms of service violations. Please contact the administrator or submit a manual request.
            </p>
          </div>
          <button
            onClick={logout}
            className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold font-mono text-gray-300 transition-all"
          >
            Sign Out Profile
          </button>
        </div>
      );
    }

    // View Routing
    if (viewMode === 'dashboard' && firebaseUser && user && token) {
      if (adminActive && user.role === 'admin' && user.email?.toLowerCase() === 'bhattg805@gmail.com') {
        return (
          <AdminDashboard
            token={token}
            onGoToUserView={() => setAdminActive(false)}
            onRefreshProfile={refreshProfile}
          />
        );
      }

      return (
        <UserDashboard
          user={user}
          token={token}
          onLogout={logout}
          onRefreshProfile={refreshProfile}
          isAdmin={user.role === 'admin' && user.email?.toLowerCase() === 'bhattg805@gmail.com'}
          onToggleAdminView={() => setAdminActive(true)}
        />
      );
    }

    return <LoginPage onLogin={login} />;
  };

  const cleanWaNumber = publicSettings?.whatsappNumber
    ? publicSettings.whatsappNumber.replace(/[^0-9]/g, '')
    : '';

  return (
    <div className="relative min-h-screen">
      {renderActiveView()}

      {/* Dynamic Floating WhatsApp Widget */}
      {cleanWaNumber && (
        <a
          href={`https://wa.me/${cleanWaNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#20ba5a] text-white p-3.5 rounded-full shadow-2xl transition-all hover:scale-110 flex items-center justify-center cursor-pointer active:scale-95 group border border-white/10"
          title="Contact Support on WhatsApp"
        >
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.705 1.458h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-out whitespace-nowrap text-xs font-semibold pl-0 group-hover:pl-2">
            Chat on WhatsApp
          </span>
        </a>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
