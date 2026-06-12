import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  collection, query, orderBy, onSnapshot, doc, updateDoc,
  serverTimestamp, where, getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import OrderDetail from '../components/OrderDetail';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'pending', label: { ko: '처리 대기', ja: '処理待ち' } },
  { value: 'inProgress', label: { ko: '제작 중', ja: '製作中' } },
  { value: 'shipped', label: { ko: '발송 완료', ja: '発送済み' } },
  { value: 'delivered', label: { ko: '납품 완료', ja: '納品済み' } },
  { value: 'cancelled', label: { ko: '취소됨', ja: 'キャンセル' } }
];

const STATUS_COLORS = {
  pending: 'badge-pending',
  inProgress: 'badge-in-progress',
  shipped: 'badge-shipped',
  delivered: 'badge-delivered',
  cancelled: 'badge-cancelled'
};

// Notification sound / voice synthesis
function playNewOrderNotification(clinicName) {
  try {
    const utterance = new SpeechSynthesisUtterance(
      `띵동. 새로운 주문이 ${clinicName} 거래처에서 발생했습니다.`
    );
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.log('TTS not available');
  }
  // Also play a chime if possible
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {}
}

export default function AdminDashboard() {
  const { i18n } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [filterClinic, setFilterClinic] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchText, setSearchText] = useState('');
  const [editingOrder, setEditingOrder] = useState(null);
  const [trackingInput, setTrackingInput] = useState('');
  const [priceInput, setPriceInput] = useState({});
  const prevOrderIds = useRef(new Set());
  const lang = i18n.language === 'ko' ? 'ko' : 'ja';

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // Detect new orders and notify
      data.forEach(order => {
        if (!prevOrderIds.current.has(order.id) && prevOrderIds.current.size > 0) {
          playNewOrderNotification(order.clinicName);
          toast.success(`🔔 新規注文: ${order.clinicName} — ${order.orderNumber}`, {
            duration: 6000
          });
        }
        prevOrderIds.current.add(order.id);
      });
      if (prevOrderIds.current.size === 0) {
        data.forEach(o => prevOrderIds.current.add(o.id));
      }

      setOrders(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const clinics = [...new Set(orders.map(o => o.clinicName))].filter(Boolean);

  const filteredOrders = orders.filter(order => {
    const createdAt = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
    const matchesMonth = !selectedMonth || format(createdAt, 'yyyy-MM') === selectedMonth;
    const matchesClinic = !filterClinic || order.clinicName === filterClinic;
    const matchesStatus = !filterStatus || order.status === filterStatus;
    const matchesSearch = !searchText ||
      order.orderNumber?.includes(searchText) ||
      order.patientName?.includes(searchText) ||
      order.clinicName?.includes(searchText);
    return matchesMonth && matchesClinic && matchesStatus && matchesSearch;
  });

  const totalAmount = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const pendingCount = orders.filter(o => o.status === 'pending').length;

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast.success('상태가 업데이트되었습니다.');
    } catch (e) {
      toast.error('업데이트 실패');
    }
  };

  const handleShip = async (orderId) => {
    if (!trackingInput.trim()) {
      toast.error('운송장 번호를 입력하세요.');
      return;
    }
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'shipped',
        trackingNumber: trackingInput.trim(),
        shippedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setTrackingInput('');
      setEditingOrder(null);
      toast.success('발송 완료 처리되었습니다.');
    } catch (e) {
      toast.error('처리 실패');
    }
  };

  const handleSetPrice = async (orderId) => {
    const price = parseFloat(priceInput[orderId]);
    if (!price) { toast.error('금액을 입력하세요.'); return; }
    const tax = Math.round(price * 0.1);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        subtotal: price,
        tax,
        totalAmount: price + tax,
        updatedAt: serverTimestamp()
      });
      setPriceInput(prev => ({ ...prev, [orderId]: '' }));
      toast.success('금액이 저장되었습니다.');
    } catch (e) {
      toast.error('저장 실패');
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  if (selectedOrder) {
    return (
      <OrderDetail
        order={selectedOrder}
        onBack={() => setSelectedOrder(null)}
        isAdmin={true}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-primary)' }}>
          {lang === 'ko' ? '주문 관리 대시보드' : '注文管理ダッシュボード'}
        </h2>
        {pendingCount > 0 && (
          <div style={{
            background: '#fef3c7', color: '#92400e', padding: '8px 16px',
            borderRadius: 20, fontSize: 13, fontWeight: 600,
            border: '1px solid #fde68a'
          }}>
            🔔 미처리 주문 {pendingCount}건
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">{lang === 'ko' ? '전체 주문' : '総注文数'}</div>
          <div className="stat-value">{filteredOrders.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{lang === 'ko' ? '미처리' : '処理待ち'}</div>
          <div className="stat-value" style={{ color: 'var(--color-warning)' }}>
            {filteredOrders.filter(o => o.status === 'pending').length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{lang === 'ko' ? '제작 중' : '製作中'}</div>
          <div className="stat-value" style={{ color: 'var(--color-info)' }}>
            {filteredOrders.filter(o => o.status === 'inProgress').length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{lang === 'ko' ? '총 매출' : '売上合計'}</div>
          <div className="stat-value">¥{totalAmount.toLocaleString()}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="month" className="form-input" style={{ width: 'auto' }}
            value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
          <select className="form-select" style={{ width: 'auto', minWidth: 140 }}
            value={filterClinic} onChange={e => setFilterClinic(e.target.value)}>
            <option value="">{lang === 'ko' ? '전체 거래처' : '全거래처'}</option>
            {clinics.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="form-select" style={{ width: 'auto', minWidth: 120 }}
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">{lang === 'ko' ? '전체 상태' : '全ステータス'}</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label[lang]}</option>
            ))}
          </select>
          <input className="form-input" style={{ flex: 1, minWidth: 160 }}
            placeholder={lang === 'ko' ? '주문번호·환자명·거래처 검색' : '注文番号・患者名・거래처 検索'}
            value={searchText} onChange={e => setSearchText(e.target.value)} />
        </div>
      </div>

      {/* Orders Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            {lang === 'ko' ? '주문 목록' : '注文一覧'}
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: 8 }}>
              ({filteredOrders.length}건)
            </span>
          </h3>
        </div>
        {filteredOrders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p>{lang === 'ko' ? '주문 내역이 없습니다' : '注文がありません'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{lang === 'ko' ? '주문번호' : '注文番号'}</th>
                  <th>{lang === 'ko' ? '거래처' : '거래처'}</th>
                  <th>{lang === 'ko' ? '환자명' : '患者名'}</th>
                  <th>{lang === 'ko' ? '주문일' : '注文日'}</th>
                  <th>{lang === 'ko' ? '납기' : '納期'}</th>
                  <th>{lang === 'ko' ? '상태' : 'ステータス'}</th>
                  <th>{lang === 'ko' ? '금액' : '金額'}</th>
                  <th>{lang === 'ko' ? '운송장' : '追跡番号'}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => {
                  const createdAt = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
                  return (
                    <tr key={order.id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-primary)', fontSize: 12 }}>
                          {order.orderNumber}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{order.clinicName}</td>
                      <td>{order.patientName}</td>
                      <td style={{ fontSize: 13 }}>{format(createdAt, 'yyyy/MM/dd')}</td>
                      <td style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-primary)' }}>
                        {order.dueDate}
                      </td>
                      <td>
                        <select
                          className="form-select"
                          style={{ fontSize: 12, padding: '3px 6px', width: 'auto' }}
                          value={order.status}
                          onChange={e => handleUpdateStatus(order.id, e.target.value)}
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s.value} value={s.value}>{s.label[lang]}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {order.totalAmount ? (
                          <span style={{ fontWeight: 600 }}>¥{order.totalAmount.toLocaleString()}</span>
                        ) : (
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <input
                              className="form-input"
                              style={{ width: 80, padding: '3px 6px', fontSize: 12 }}
                              placeholder="금액"
                              value={priceInput[order.id] || ''}
                              onChange={e => setPriceInput(prev => ({ ...prev, [order.id]: e.target.value }))}
                            />
                            <button className="btn btn-primary btn-sm"
                              style={{ padding: '3px 8px', fontSize: 11 }}
                              onClick={() => handleSetPrice(order.id)}>
                              저장
                            </button>
                          </div>
                        )}
                      </td>
                      <td>
                        {order.trackingNumber ? (
                          <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-success)' }}>
                            ✓ {order.trackingNumber}
                          </span>
                        ) : editingOrder === order.id ? (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <input
                              className="form-input"
                              style={{ width: 110, padding: '3px 6px', fontSize: 12 }}
                              placeholder="DHL 운송장"
                              value={trackingInput}
                              onChange={e => setTrackingInput(e.target.value)}
                              autoFocus
                            />
                            <button className="btn btn-success btn-sm"
                              style={{ padding: '3px 8px', fontSize: 11 }}
                              onClick={() => handleShip(order.id)}>
                              발송
                            </button>
                            <button className="btn btn-ghost btn-sm"
                              style={{ padding: '3px 6px', fontSize: 11 }}
                              onClick={() => setEditingOrder(null)}>
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button className="btn btn-secondary btn-sm"
                            style={{ fontSize: 11 }}
                            onClick={() => { setEditingOrder(order.id); setTrackingInput(''); }}>
                            🚚 발송 처리
                          </button>
                        )}
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm"
                          onClick={() => setSelectedOrder(order)}
                          style={{ color: 'var(--color-primary)' }}>
                          상세 →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
