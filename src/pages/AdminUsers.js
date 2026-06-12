import React, { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'client'));
    const unsub = onSnapshot(q, snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleApprove = async (userId, userData) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: 'approved',
        approvedAt: serverTimestamp()
      });
      toast.success(`${userData.clinicName} 승인 완료`);
      // In production: send approval email via Firebase Functions
    } catch (e) {
      toast.error('승인 실패');
    }
  };

  const handleReject = async (userId, userData) => {
    if (!window.confirm(`${userData.clinicName}을(를) 거부하시겠습니까?`)) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: 'rejected',
        rejectedAt: serverTimestamp()
      });
      toast.success('거부 처리되었습니다.');
    } catch (e) {
      toast.error('처리 실패');
    }
  };

  const filtered = users.filter(u =>
    filterStatus === 'all' ? true : u.status === filterStatus
  );

  const pendingCount = users.filter(u => u.status === 'pending').length;

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <h2>거래처 관리</h2>
        <p>일본 치과 거래처 등록 승인 및 관리</p>
      </div>

      {pendingCount > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          🔔 승인 대기 중인 신규 거래처가 <strong>{pendingCount}곳</strong> 있습니다.
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[
          { value: 'pending', label: `대기 (${users.filter(u=>u.status==='pending').length})` },
          { value: 'approved', label: `승인됨 (${users.filter(u=>u.status==='approved').length})` },
          { value: 'rejected', label: `거부됨 (${users.filter(u=>u.status==='rejected').length})` },
          { value: 'all', label: '전체' }
        ].map(tab => (
          <button
            key={tab.value}
            className={`btn btn-sm ${filterStatus === tab.value ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterStatus(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <p>해당하는 거래처가 없습니다.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>치과명</th>
                <th>원장명</th>
                <th>이메일</th>
                <th>전화번호</th>
                <th>주소</th>
                <th>등록일</th>
                <th>상태</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => {
                const createdAt = user.createdAt?.toDate ? user.createdAt.toDate() : new Date();
                return (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 600, color: 'var(--tvs-silver-hi)' }}>
                      {user.clinicName}
                    </td>
                    <td>Dr. {user.doctorName}</td>
                    <td style={{ fontSize: 12 }}>
                      <div>{user.email}</div>
                      {user.subEmail && (
                        <div style={{ color: 'var(--tvs-text-dim)', fontSize: 11 }}>
                          {user.subEmail}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: 12 }}>{user.phone}</td>
                    <td style={{ fontSize: 12, color: 'var(--tvs-text-mid)' }}>
                      {user.address?.prefecture}{user.address?.city}<br/>
                      <span style={{ fontSize: 11 }}>{user.address?.streetAddress}</span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--tvs-text-mid)' }}>
                      {format(createdAt, 'yyyy/MM/dd')}
                    </td>
                    <td>
                      <span className={`badge badge-${
                        user.status === 'approved' ? 'approved' :
                        user.status === 'rejected' ? 'rejected' : 'waiting'
                      }`}>
                        {user.status === 'approved' ? '승인됨' :
                         user.status === 'rejected' ? '거부됨' : '대기 중'}
                      </span>
                    </td>
                    <td>
                      {user.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleApprove(user.id, user)}
                          >
                            ✓ 승인
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleReject(user.id, user)}
                          >
                            ✕ 거부
                          </button>
                        </div>
                      )}
                      {user.status === 'approved' && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setSelectedUser(user)}
                        >
                          상세 보기
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* User detail modal */}
      {selectedUser && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            z: 200, padding: 20
          }}
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="card"
            style={{ maxWidth: 460, width: '100%', borderColor: 'var(--tvs-border-mid)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="card-header">
              <h3 className="card-title">거래처 상세</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedUser(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['치과명', selectedUser.clinicName],
                ['원장명', `Dr. ${selectedUser.doctorName}`],
                ['대표 이메일', selectedUser.email],
                ['서브 이메일', selectedUser.subEmail || '—'],
                ['전화번호', selectedUser.phone],
                ['주소', `${selectedUser.address?.prefecture}${selectedUser.address?.city} ${selectedUser.address?.streetAddress}`],
              ].map(([label, value]) => (
                <div key={label} className="print-field">
                  <span className="print-field-label">{label}</span>
                  <span className="print-field-value" style={{ fontSize: 13 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
