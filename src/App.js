import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import './i18n';
import './styles/global.css';

import { AuthProvider, useAuth } from './lib/AuthContext';
import LOGO_DATA from './lib/logoData';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import NewOrder from './pages/NewOrder';
import OrderHistory from './pages/OrderHistory';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminPricing from './pages/AdminPricing';

// ── LOGO — actual TVS logo image (embedded) ──
const LOGO_PATH = LOGO_DATA;

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  return (
    <div className="lang-switcher">
      <button
        className={`lang-btn ${i18n.language === 'ja' ? 'active' : ''}`}
        onClick={() => i18n.changeLanguage('ja')}
        title="日本語"
      >
        🇯🇵 <span>JP</span>
      </button>
      <button
        className={`lang-btn ${i18n.language === 'ko' ? 'active' : ''}`}
        onClick={() => i18n.changeLanguage('ko')}
        title="한국어"
      >
        🇰🇷 <span>KR</span>
      </button>
    </div>
  );
}

function ClientLayout({ children, title }) {
  const { t } = useTranslation();
  const { logout, userProfile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <img src={LOGO_PATH} alt="TVS Logo" />
          <h1>TVS</h1>
          <p>DENTAL LABORATORY</p>
          <div className="gold-line" />
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">メニュー / 메뉴</div>
          <NavLink to="/new-order" className={({isActive}) => isActive ? 'active' : ''}
            onClick={() => setSidebarOpen(false)}>
            ✦ {t('nav.newOrder')}
          </NavLink>
          <NavLink to="/history" className={({isActive}) => isActive ? 'active' : ''}
            onClick={() => setSidebarOpen(false)}>
            ◈ {t('nav.orderHistory')}
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <strong>{userProfile?.clinicName}</strong>
            Dr. {userProfile?.doctorName}
          </div>
          <button className="btn btn-ghost btn-sm nav-btn"
            style={{ padding: '7px 0', color: 'var(--tvs-text-dim)', width: '100%', justifyContent: 'flex-start' }}
            onClick={logout}>
            → {t('common.logout')}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              ☰
            </button>
            <span className="topbar-title">{title || 'TOKYO VENEER SYSTEM'}</span>
          </div>
          <div className="topbar-right">
            <LanguageSwitcher />
          </div>
        </header>
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}

function AdminLayout({ children, title }) {
  const { logout, userProfile } = useAuth();
  const { i18n } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const lang = i18n.language === 'ko' ? 'ko' : 'ja';

  const navItems = [
    { to: '/admin', label: { ko: '주문 대시보드', ja: '注文ダッシュボード' }, icon: '◈', end: true },
    { to: '/admin/users', label: { ko: '거래처 관리', ja: '거래처管理' }, icon: '◎' },
    { to: '/admin/pricing', label: { ko: '가격 설정', ja: '価格設定' }, icon: '◇' },
  ];

  return (
    <div className="app-layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <img src={LOGO_PATH} alt="TVS Logo" />
          <h1>TVS</h1>
          <p>ADMIN</p>
          <div className="gold-line" />
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">관리자 메뉴</div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => isActive ? 'active' : ''}
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon} {item.label[lang]}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <strong>TVS Korea</strong>
            Admin
          </div>
          <div style={{ marginBottom: 8 }}>
            <div className="lang-switcher" style={{ justifyContent: 'center' }}>
              <button className={`lang-btn ${lang === 'ko' ? 'active' : ''}`}
                onClick={() => i18n.changeLanguage('ko')}>🇰🇷 KR</button>
              <button className={`lang-btn ${lang === 'ja' ? 'active' : ''}`}
                onClick={() => i18n.changeLanguage('ja')}>🇯🇵 JP</button>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm"
            style={{ padding: '7px 0', color: 'var(--tvs-text-dim)', width: '100%', justifyContent: 'flex-start' }}
            onClick={logout}>
            → 로그아웃
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              ☰
            </button>
            <span className="topbar-title">{title || 'TVS ADMIN'}</span>
          </div>
          <div className="topbar-right">
            <span style={{ fontSize: 11, color: 'var(--tvs-gold-lo)', letterSpacing: '1px' }}>
              ADMIN CONSOLE
            </span>
          </div>
        </header>
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}

// Route guards
function ClientRoute({ children }) {
  const { currentUser, userProfile, isAdmin } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
  if (isAdmin) return <Navigate to="/admin" />;
  return children;
}

function AdminRoute({ children }) {
  const { currentUser, isAdmin } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
  if (!isAdmin) return <Navigate to="/new-order" />;
  return children;
}

function AppRoutes() {
  const { currentUser, isAdmin } = useAuth();
  const { t } = useTranslation();

  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={
        currentUser
          ? <Navigate to={isAdmin ? '/admin' : '/new-order'} />
          : <Login />
      } />
      <Route path="/register" element={
        currentUser ? <Navigate to="/" /> : <Register />
      } />

      {/* Client Routes */}
      <Route path="/new-order" element={
        <ClientRoute>
          <ClientLayout title={t('order.newOrder')}>
            <NewOrder />
          </ClientLayout>
        </ClientRoute>
      } />
      <Route path="/history" element={
        <ClientRoute>
          <ClientLayout title={t('history.title')}>
            <OrderHistory />
          </ClientLayout>
        </ClientRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <AdminRoute>
          <AdminLayout title="주문 관리 대시보드">
            <AdminDashboard />
          </AdminLayout>
        </AdminRoute>
      } />
      <Route path="/admin/users" element={
        <AdminRoute>
          <AdminLayout title="거래처 관리">
            <AdminUsers />
          </AdminLayout>
        </AdminRoute>
      } />
      <Route path="/admin/pricing" element={
        <AdminRoute>
          <AdminLayout title="가격 설정">
            <AdminPricing />
          </AdminLayout>
        </AdminRoute>
      } />

      {/* Default */}
      <Route path="/" element={
        <Navigate to={currentUser ? (isAdmin ? '/admin' : '/new-order') : '/login'} />
      } />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1a1a',
              color: '#f0f0f0',
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: '13px',
              fontFamily: "'Noto Sans JP', sans-serif",
            },
            success: { iconTheme: { primary: '#c9a84c', secondary: '#0a0a0a' } },
            error: { iconTheme: { primary: '#f87171', secondary: '#0a0a0a' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
