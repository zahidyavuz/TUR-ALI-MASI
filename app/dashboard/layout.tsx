'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import './dashboard.css';

const NAV_ITEMS = [
  { label: 'Dashboard',       icon: '📊', href: '/dashboard' },
  { label: 'Acenteler',       icon: '🏢', href: '/dashboard/agencies' },
  { label: 'Turlar',          icon: '🗺️', href: '/dashboard/tours' },
  { label: 'Rezervasyonlar',  icon: '📋', href: '/dashboard/bookings' },
  { label: 'Ayarlar',         icon: '⚙️', href: '/dashboard/settings' },
  // ── Güvenlik Bölümü ──────────────────────────────────────────────
  { label: '─ Güvenlik',      icon: '',   href: '', divider: true },
  { label: 'Kara Kutu',         icon: '⬛', href: '/dashboard/audit-log' },
  { label: 'Webhook Alarm',     icon: '🛡️', href: '/dashboard/webhook-fraud' },
  { label: 'Felaket Kurtarma',  icon: '🛸', href: '/dashboard/disaster-recovery' },
  { label: 'Kütüphane Analiz', icon: '📦', href: '/dashboard/security-status' },
  { label: 'Siber Kapanlar',  icon: '🍯', href: '/dashboard/honeypot' },
] as const;

type NavItem = typeof NAV_ITEMS[number];


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [authStatus, setAuthStatus] = useState<'checking' | 'authorized' | 'unauthorized'>('checking');

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      setAuthStatus('unauthorized');
      setTimeout(() => router.push('/login'), 2000);
      return;
    }

    const role = user.role?.toLowerCase() || '';
    const isAdmin = user.username === 'yavuz50' || user.is_staff || role === 'superadmin' || role === 'admin';

    if (isAdmin) {
      setAuthStatus('authorized');
    } else {
      setAuthStatus('unauthorized');
      
      // Redirect to their respective panels
      const isAgency = user.is_agency || role === 'merchant' || role === 'agency' || role === 'merchant/agency';
      setTimeout(() => {
        if (isAgency) {
          router.push('/agency/dashboard');
        } else {
          router.push('/profile');
        }
      }, 3000); // Wait 3 seconds to show the warning
    }
  }, [user, isLoading, router]);

  // Loading state
  if (isLoading || authStatus === 'checking') {
    return (
      <div className="dashboard-root">
        <div className="dash-loading" style={{ width: '100%' }}>
          <div className="dash-spinner" />
          Yönetici Yetkisi Kontrol Ediliyor...
        </div>
      </div>
    );
  }

  // Access denied
  if (authStatus === 'unauthorized') {
    return (
      <div className="dash-access-denied" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f8fafc' }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🛡️</div>
        <h1 style={{ fontSize: '32px', color: '#ef4444', fontWeight: '900', marginBottom: '16px' }}>Yetkisiz Giriş</h1>
        <p style={{ fontSize: '16px', color: '#64748b', marginBottom: '24px', textAlign: 'center', maxWidth: '400px' }}>
          Bu alana girmeye yetkiniz bulunmuyor. Güvenlik protokolleri gereği kendi panelinize yönlendiriliyorsunuz...
        </p>
        <div className="dash-spinner" style={{ borderColor: '#ef4444', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="dashboard-root">
      {/* Sidebar */}
      <aside className={`dash-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="dash-sidebar-logo">
          <div className="logo-icon">⚡</div>
          <span className="logo-text">Kontrol Paneli</span>
        </div>

        <nav className="dash-nav">
          {NAV_ITEMS.map((item) => {
            // Divider öğesi
            if ('divider' in item && item.divider) {
              return (
                <div key={item.label} style={{
                  padding: '8px 16px 4px',
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'rgba(255,255,255,0.3)',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  marginTop: '8px',
                }}>
                  {collapsed ? '—' : 'GÜVENLİK'}
                </div>
              );
            }

            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`dash-nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="dash-sidebar-toggle">
          <button onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? '→' : '←'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className={`dash-main ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <header className="dash-topbar">
          <h1 className="dash-topbar-title">
            {NAV_ITEMS.find((item) =>
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)
            )?.label || 'Dashboard'}
          </h1>

          <div className="dash-topbar-actions">
            <Link href="/" style={{
              fontSize: '13px', fontWeight: 600, color: '#64748b',
              textDecoration: 'none', padding: '6px 14px',
              border: '1px solid #e2e8f0', borderRadius: '8px',
              transition: 'all 0.2s',
            }}>
              ← Siteye Dön
            </Link>
            <div className="dash-topbar-user">
              <div className="user-avatar">A</div>
              <span>Admin</span>
            </div>
          </div>
        </header>

        <div className="dash-content">
          {children}
        </div>
      </main>
    </div>
  );
}
