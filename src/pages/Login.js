import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/AuthContext';
import LOGO_DATA from '../lib/logoData';
import toast from 'react-hot-toast';

export default function Login() {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      if (err.message === 'PENDING_APPROVAL') {
        toast.error(t('auth.pendingApproval'));
      } else if (err.message === 'ACCOUNT_REJECTED') {
        toast.error('アカウントが拒否されました。TVSにお問い合わせください。');
      } else {
        toast.error('メールアドレスまたはパスワードが正しくありません。');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Language Switcher */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <div className="lang-switcher">
            <button
              className={`lang-btn ${i18n.language === 'ja' ? 'active' : ''}`}
              onClick={() => i18n.changeLanguage('ja')}
            >
              🇯🇵 日本語
            </button>
            <button
              className={`lang-btn ${i18n.language === 'ko' ? 'active' : ''}`}
              onClick={() => i18n.changeLanguage('ko')}
            >
              🇰🇷 한국어
            </button>
          </div>
        </div>

        {/* Logo */}
        <div className="auth-logo">
          <img
            src={LOGO_DATA}
            alt="Tokyo Veneer System"
            style={{
              width: '100%',
              maxWidth: 320,
              height: 'auto',
              display: 'block',
              margin: '0 auto',
              borderRadius: 6,
            }}
          />
          <div className="gold-divider" />
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">{t('auth.email')}</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="clinic@example.com"
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('auth.password')}</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? t('common.loading') : t('common.login')}
          </button>
        </form>

        <div style={{ marginTop: 22, textAlign: 'center', fontSize: 13 }}>
          <Link to="/register" style={{ color: 'var(--tvs-gold)', textDecoration: 'none', letterSpacing: '0.3px' }}>
            {t('auth.noAccount')} →
          </Link>
        </div>
        <div style={{ marginTop: 10, textAlign: 'center' }}>
          <Link to="/reset-password" style={{ color: 'var(--tvs-text-dim)', textDecoration: 'none', fontSize: 12 }}>
            {t('auth.forgotPassword')}
          </Link>
        </div>
      </div>
    </div>
  );
}
