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
  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    const role = user.role?.toLowerCase() || '';
    const isAdmin = user.username === 'yavuz50' || user.is_staff || role === 'superadmin' || role === 'admin';
    const isAgency = user.is_agency || role === 'merchant' || role === 'agency' || role === 'merchant/agency' || role === 'restaurant';

    if (!isAdmin) {
      // 2. UNIFIED BUSINESS ROUTING LOCK (AUTH GUARD)
      // Eğer kullanıcı Acenta/Restoran ise ve admin paneline girmeye çalışırsa, kendi paneline fırlat!
      if (isAgency) {
        router.push('/agency/dashboard');
      } else {
        // Standart Müşteri ise kendi paneline fırlat
        router.push('/profile');
      }
    }
  }, [user, isLoading, router]);
  
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
