import React, { useState, useEffect } from 'react';
import {
  collection, query, onSnapshot, doc, setDoc, getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

const PRODUCT_TYPES = [
  { value: 'veneer',    label: { ko: '베니어', ja: 'ベニア' } },
  { value: 'crown',     label: { ko: '크라운', ja: 'クラウン' } },
  { value: 'bridge',    label: { ko: '브릿지', ja: 'ブリッジ' } },
  { value: 'inlay',     label: { ko: '인레이', ja: 'インレー' } },
  { value: 'onlay',     label: { ko: '온레이', ja: 'オンレー' } },
  { value: 'implant',   label: { ko: '임플란트', ja: 'インプラント' } },
  { value: 'nightguard',label: { ko: '나이트가드', ja: 'ナイトガード' } },
  { value: 'other',     label: { ko: '기타', ja: 'その他' } },
];

export default function AdminPricing() {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('__default__');
  const [prices, setPrices] = useState({});
  const [savedPrices, setSavedPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load clients
  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, snap => {
      const approved = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.status === 'approved' && u.role === 'client');
      setClients(approved);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Load prices for selected client
  useEffect(() => {
    const loadPrices = async () => {
      const docRef = doc(db, 'pricing', selectedClient);
      const snap = await getDocs(query(collection(db, 'pricing')));
      const found = snap.docs.find(d => d.id === selectedClient);
      if (found) {
        const data = found.data();
        setSavedPrices(data);
        setPrices(data);
      } else {
        setSavedPrices({});
        setPrices({});
      }
    };
    loadPrices();
  }, [selectedClient]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'pricing', selectedClient), prices);
      setSavedPrices(prices);
      toast.success('가격 설정이 저장되었습니다.');
    } catch (e) {
      toast.error('저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const getClientName = (id) => {
    if (id === '__default__') return '기본 가격표 (Default)';
    return clients.find(c => c.id === id)?.clinicName || id;
  };

  const getPriceForProduct = (productType) => {
    return prices[productType] ?? savedPrices[productType] ?? '';
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <h2>가격 설정</html2>
        <p>거래처별 제품 단가 설정 (JPY 기준)</p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">거래처 선택</label>
          <select
            className="form-select"
            style={{ maxWidth: 320 }}
            value={selectedClient}
            onChange={e => setSelectedClient(e.target.value)}
          >
            <option value="__default__">⭐ 기본 가격표 (모든 거래처 공통)</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.clinicName} — Dr. {c.doctorName}</option>
            ))}
          </select>
        </div>
        {selectedClient !== '__default__' && (
          <div className="alert alert-info" style={{ marginTop: 14, marginBottom: 0 }}>
            거래처별 가격이 설정된 경우, 해당 가격이 기본 가격표보다 우선 적용됩니다.
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            {getClientName(selectedClient)} — 가격 설정
          </h3>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '저장 중...' : '💾 저장'}
          </button>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>제품 종류</th>
              <th>일본어명</th>
              <th>단가 (¥)</th>
              <th>저장된 단가</th>
            </tr>
          </thead>
          <tbody>
            {PRODUCT_TYPES.map(pt => (
              <tr key={pt.value}>
                <td style={{ fontWeight: 500, color: 'var(--tvs-silver-hi)' }}>
                  {pt.label.ko}
                </td>
                <td style={{ color: 'var(--tvs-text-mid)' }}>{pt.label.ja}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--tvs-text-dim)', fontSize: 13 }}>¥</span>
                    <input
                      className="form-input"
                      type="number"
                      style={{ width: 120 }}
                      min="0"
                      step="100"
                      placeholder="0"
                      value={getPriceForProduct(pt.value)}
                      onChange={e => setPrices(prev => ({
                        ...prev,
                        [pt.value]: e.target.value ? parseFloat(e.target.value) : ''
                      }))}
                    />
                  </div>
                </td>
                <td>
                  {savedPrices[pt.value] ? (
                    <span style={{ color: 'var(--tvs-gold-hi)', fontWeight: 600 }}>
                      ¥{Number(savedPrices[pt.value]).toLocaleString()}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--tvs-text-dim)', fontSize: 12 }}>미설정</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 20, padding: '12px 14px', background: 'var(--tvs-dark-3)', borderRadius: 'var(--r-sm)', fontSize: 12, color: 'var(--tvs-text-mid)' }}>
          💡 주문 입력 시 단가 × 수량으로 소계가 자동 계산되며, 소비세(10%)가 추가됩니다.
        </div>
      </div>
    </div>
  );
}
