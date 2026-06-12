import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  collection, query, where, orderBy, onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import OrderDetail from '../components/OrderDetail';

const STATUS_COLORS = {
  pending: 'badge-pending',
  inProgress: 'badge-in-progress',
  shipped: 'badge-shipped',
  delivered: 'badge-delivered',
  cancelled: 'badge-cancelled'
};

export default function OrderHistory() {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'all'
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'orders'),
      where('clinicId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [currentUser]);

  const filteredOrders = orders.filter(order => {
    if (!order.createdAt) return true;
    const orderDate = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    const matchesMonth = viewMode === 'all' || format(orderDate, 'yyyy-MM') === selectedMonth;
    const matchesSearch = !searchText ||
      order.orderNumber?.includes(searchText) ||
      order.patientName?.includes(searchText);
    return matchesMonth && matchesSearch;
  });

  const totalAmount = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  if (selectedOrder) {
    return <OrderDetail order={selectedOrder} onBack={() => setSelectedOrder(null)} isAdmin={false} />;
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 24 }}>
        {t('history.title')}
      </h2>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">{t('history.totalOrders')}</div>
          <div className="stat-value">{filteredOrders.length}</div>
          <div className="stat-sub">件</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('history.totalAmount')}</div>
          <div className="stat-value">¥{totalAmount.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">製作中</div>
          <div className="stat-value">
            {filteredOrders.filter(o => o.status === 'inProgress').length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">発送済み</div>
          <div className="stat-value">
            {filteredOrders.filter(o => o.status === 'shipped').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className={`btn btn-sm ${viewMode === 'month' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('month')}
            >
              {t('history.filterByMonth')}
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('all')}
            >
              全て表示
            </button>
          </div>
          {viewMode === 'month' && (
            <input
              type="month"
              className="form-input"
              style={{ width: 'auto' }}
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            />
          )}
          <input
            className="form-input"
            style={{ flex: 1, minWidth: 160 }}
            placeholder="注文番号・患者名で検索"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="card">
        {filteredOrders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p>{t('history.noOrders')}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('order.orderNumber')}</th>
                  <th>{t('order.orderDate')}</th>
                  <th>{t('order.patientName')}</th>
                  <th>品目数</th>
                  <th>{t('order.dueDate')}</th>
                  <th>{t('order.status')}</th>
                  <th>{t('order.totalAmount')}</th>
                  <th>配送</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => {
                  const createdAt = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
                  return (
                    <tr key={order.id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-primary)', fontSize: 13 }}>
                          {order.orderNumber}
                        </span>
                      </td>
                      <td>{format(createdAt, 'yyyy/MM/dd')}</td>
                      <td>{order.patientName}</td>
                      <td>{order.items?.length || 0} 点</td>
                      <td>{order.dueDate}</td>
                      <td>
                        <span className={`badge ${STATUS_COLORS[order.status] || 'badge-pending'}`}>
                          {t(`status.${order.status}`) || order.status}
                        </span>
                      </td>
                      <td>
                        {order.totalAmount ? `¥${order.totalAmount.toLocaleString()}` : '—'}
                      </td>
                      <td>
                        {order.status === 'shipped' && order.trackingNumber ? (
                          <a
                            href={`https://www.dhl.com/jp-ja/home/tracking.html?tracking-id=${order.trackingNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                            onClick={e => e.stopPropagation()}
                          >
                            🚚 追跡
                          </a>
                        ) : '—'}
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setSelectedOrder(order)}
                          style={{ color: 'var(--color-primary)' }}
                        >
                          詳細 →
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
