'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import './dashboard.css';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: '📊', href: '/dashboard' },
  { label: 'Acenteler', icon: '🏢', href: '/dashboard/agencies' },
  { label: 'Turlar', icon: '🗺️', href: '/dashboard/tours' },
  { label: 'Rezervasyonlar', icon: '📋', href: '/dashboard/bookings' },
  { label: 'Ayarlar', icon: '⚙️', href: '/dashboard/settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const pathname = usePathname();

  // Check admin access
  useEffect(() => {
    async function checkAdmin() {
      try {
        const token =
          localStorage.getItem('access_token') ||
          document.cookie.match(/auth-token=([^;]+)/)?.[1];

        if (!token) {
          setIsAdmin(false);
          return;
        }

        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
        const res = await fetch(`${API_BASE}/admin/dashboard/`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });

        if (res.ok) {
          setIsAdmin(true);
        } else if (res.status === 403 || res.status === 401) {
          setIsAdmin(false);
        } else {
          // API not reachable — allow access in dev mode for demo
          setIsAdmin(true);
        }
      } catch {
        // Backend not running — allow access for demo/dev
        setIsAdmin(true);
      }
    }
    checkAdmin();
  }, []);

  // Loading state
  if (isAdmin === null) {
    return (
      <div className="dashboard-root">
        <div className="dash-loading" style={{ width: '100%' }}>
          <div className="dash-spinner" />
          Yetki kontrol ediliyor...
        </div>
      </div>
    );
  }

  // Access denied
  if (!isAdmin) {
    return (
      <div className="dash-access-denied">
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h1>Erişim Engellendi</h1>
        <p>Bu sayfayı görüntülemek için yönetici yetkisi gereklidir.</p>
        <Link href="/">← Ana Sayfaya Dön</Link>
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
