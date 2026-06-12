import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/AuthContext';
import LOGO_DATA from '../lib/logoData';
import toast from 'react-hot-toast';

const PREFECTURES = [
  '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
  '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
  '新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県',
  '静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県',
  '奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県',
  '徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県',
  '熊本県','大分県','宮崎県','鹿児島県','沖縄県'
];

export default function Register() {
  const { t, i18n } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    clinicName: '',
    doctorName: '',
    email: '',
    subEmail: '',
    password: '',
    confirmPassword: '',
    phone: '',
    prefecture: '',
    city: '',
    streetAddress: ''
  });

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('パスワードが一致しません。');
      return;
    }
    if (form.password.length < 8) {
      toast.error('パスワードは8文字以上で入力してください。');
      return;
    }
    setLoading(true);
    try {
      await register(form.email, form.password, {
        clinicName: form.clinicName,
        doctorName: form.doctorName,
        subEmail: form.subEmail,
        phone: form.phone,
        address: {
          prefecture: form.prefecture,
          city: form.city,
          streetAddress: form.streetAddress
        }
      });
      toast.success(t('auth.registerSuccess'));
      navigate('/login');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        toast.error('このメールアドレスは既に登録されています。');
      } else {
        toast.error('登録に失敗しました。もう一度お試しください。');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ alignItems: 'flex-start', paddingTop: 40, paddingBottom: 40 }}>
      <div className="auth-card" style={{ maxWidth: 560 }}>
        {/* Language Switcher */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <div className="lang-switcher">
            <button
              className={`lang-btn ${i18n.language === 'ja' ? 'active' : ''}`}
              onClick={() => i18n.changeLanguage('ja')}
            >🇯🇵 日本語</button>
            <button
              className={`lang-btn ${i18n.language === 'ko' ? 'active' : ''}`}
              onClick={() => i18n.changeLanguage('ko')}
            >🇰🇷 한국어</button>
          </div>
        </div>

        <div className="auth-logo">
          <img
            src={LOGO_DATA}
            alt="Tokyo Veneer System"
            style={{
              width: '100%',
              maxWidth: 280,
              height: 'auto',
              display: 'block',
              margin: '0 auto',
              borderRadius: 6,
            }}
          />
          <p style={{ marginTop: 14, fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--tvs-text-mid)' }}>
            {t('auth.registerTitle')}
          </p>
          <div className="gold-divider" />
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ background: 'var(--tvs-dark-3)', borderRadius: 8, padding: '14px 16px', marginBottom: 20, border: '1px solid var(--tvs-border)' }}>
            <p style={{ fontSize: 12, color: 'var(--tvs-text-mid)', lineHeight: 1.6 }}>
              ご登録後、TVS歯科技工所にて内容を確認の上、承認メールをお送りします。<br/>
              承認完了後にログインが可能となります。
            </p>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('auth.clinicName')} <span className="required">*</span></label>
              <input className="form-input" name="clinicName" value={form.clinicName}
                onChange={handleChange} required placeholder="○○歯科クリニック" />
            </div>
            <div className="form-group">
              <label className="form-label">{t('auth.doctorName')} <span className="required">*</span></label>
              <input className="form-input" name="doctorName" value={form.doctorName}
                onChange={handleChange} required placeholder="山田 太郎" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('auth.email')} <span className="required">*</span></label>
            <input className="form-input" type="email" name="email" value={form.email}
              onChange={handleChange} required placeholder="clinic@example.com" />
          </div>

          <div className="form-group">
            <label className="form-label">{t('auth.subEmail')}</label>
            <input className="form-input" type="email" name="subEmail" value={form.subEmail}
              onChange={handleChange} placeholder="sub@example.com" />
          </div>

          <div className="form-group">
            <label className="form-label">{t('auth.phone')} <span className="required">*</span></label>
            <input className="form-input" type="tel" name="phone" value={form.phone}
              onChange={handleChange} required placeholder="03-1234-5678" />
          </div>

          <div className="form-group">
            <label className="form-label">{t('auth.prefecture')} <span className="required">*</span></label>
            <select className="form-select" name="prefecture" value={form.prefecture}
              onChange={handleChange} required>
              <option value="">都道府県を選択</option>
              {PREFECTURES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('auth.city')} <span className="required">*</span></label>
              <input className="form-input" name="city" value={form.city}
                onChange={handleChange} required placeholder="渋谷区" />
            </div>
            <div className="form-group">
              <label className="form-label">{t('auth.streetAddress')} <span className="required">*</span></label>
              <input className="form-input" name="streetAddress" value={form.streetAddress}
                onChange={handleChange} required placeholder="1-2-3 ○○ビル 2F" />
            </div>
          </div>

          <div className="divider" />

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('auth.password')} <span className="required">*</span></label>
              <input className="form-input" type="password" name="password" value={form.password}
                onChange={handleChange} required placeholder="8文字以上" minLength={8} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('profile.confirmPassword')} <span className="required">*</span></label>
              <input className="form-input" type="password" name="confirmPassword" value={form.confirmPassword}
                onChange={handleChange} required placeholder="パスワードを再入力" />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? t('common.loading') : '登録を申請する'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 14 }}>
          <Link to="/login" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
            {t('auth.alreadyAccount')} →
          </Link>
        </div>
      </div>
    </div>
  );
}
