import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';

const STATUS_LABELS = {
  pending: { ja: '処理待ち', ko: '처리 대기', color: '#92400e', bg: '#fef3c7' },
  inProgress: { ja: '製作中', ko: '제작 중', color: '#1e40af', bg: '#dbeafe' },
  shipped: { ja: '発送済み', ko: '발송 완료', color: '#065f46', bg: '#d1fae5' },
  delivered: { ja: '納品済み', ko: '납품 완료', color: '#166534', bg: '#f0fdf4' },
  cancelled: { ja: 'キャンセル', ko: '취소됨', color: '#991b1b', bg: '#fee2e2' }
};

export default function OrderDetail({ order, onBack, isAdmin = false }) {
  const { t, i18n } = useTranslation();
  const printRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `TVS_${order.orderNumber}`,
  });

  const createdAt = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
  const status = STATUS_LABELS[order.status] || STATUS_LABELS.pending;
  const statusLabel = i18n.language === 'ko' ? status.ko : status.ja;

  return (
    <div>
      {/* Action bar */}
      <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          ← {t('common.back')}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
          🖨️ {t('common.print')}
        </button>
        {order.trackingNumber && (
          <a
            href={`https://www.dhl.com/jp-ja/home/tracking.html?tracking-id=${order.trackingNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-success btn-sm"
          >
            🚚 DHL追跡 / DHL 추적
          </a>
        )}
      </div>

      {/* Printable order sheet */}
      <div ref={printRef} className="print-order card">
        {/* Header */}
        <div className="print-header">
          <div className="print-logo">
            <h1>TVS</h1>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Dental Laboratory · Seoul, Korea</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Order Sheet / 注文書
            </p>
            <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'monospace' }}>
              {order.orderNumber}
            </p>
            <span style={{
              display: 'inline-block', marginTop: 4,
              background: status.bg, color: status.color,
              padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500
            }}>
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Clinic & Patient Info */}
        <div className="print-grid">
          <div className="print-section">
            <h3>医院情報 / 치과 정보</h3>
            <div className="print-field">
              <span className="print-field-label">医院名</span>
              <span className="print-field-value">{order.clinicName}</span>
            </div>
            <div className="print-field">
              <span className="print-field-label">担当医師</span>
              <span className="print-field-value">Dr. {order.doctorName}</span>
            </div>
            <div className="print-field">
              <span className="print-field-label">メール</span>
              <span className="print-field-value" style={{ fontSize: 12 }}>{order.clinicEmail}</span>
            </div>
          </div>
          <div className="print-section">
            <h3>注文情報 / 주문 정보</h3>
            <div className="print-field">
              <span className="print-field-label">患者名</span>
              <span className="print-field-value">{order.patientName}</span>
            </div>
            {order.patientId && (
              <div className="print-field">
                <span className="print-field-label">患者ID</span>
                <span className="print-field-value">{order.patientId}</span>
              </div>
            )}
            <div className="print-field">
              <span className="print-field-label">注文日</span>
              <span className="print-field-value">{format(createdAt, 'yyyy/MM/dd')}</span>
            </div>
            <div className="print-field">
              <span className="print-field-label">納期希望日</span>
              <span className="print-field-value" style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                {order.dueDate}
              </span>
            </div>
          </div>
        </div>

        <div className="divider" />

        {/* Items table */}
        <div className="print-section" style={{ marginBottom: 20 }}>
          <h3>製作品目 / 제작 항목</h3>
          <table className="data-table" style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>歯番号</th>
                <th>製品種別</th>
                <th>素材</th>
                <th>シェード</th>
                <th>数量</th>
                {isAdmin && <th>単価</th>}
                {isAdmin && <th>小計</th>}
                <th>備考</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{item.toothNumber}</td>
                  <td>{item.productType}</td>
                  <td style={{ fontSize: 12 }}>{item.material}</td>
                  <td>{item.shade}</td>
                  <td>{item.quantity}</td>
                  {isAdmin && <td>{item.unitPrice ? `¥${item.unitPrice.toLocaleString()}` : '—'}</td>}
                  {isAdmin && <td>{item.subtotal ? `¥${item.subtotal.toLocaleString()}` : '—'}</td>}
                  <td style={{ fontSize: 12, color: '#64748b' }}>{item.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total (admin only or if set) */}
        {(order.totalAmount > 0) && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <div style={{
              background: 'var(--color-bg)', borderRadius: 8, padding: '12px 20px',
              minWidth: 200, border: '1px solid var(--color-border)'
            }}>
              <div className="print-field">
                <span className="print-field-label">小計</span>
                <span className="print-field-value">¥{(order.subtotal || 0).toLocaleString()}</span>
              </div>
              <div className="print-field">
                <span className="print-field-label">消費税(10%)</span>
                <span className="print-field-value">¥{(order.tax || 0).toLocaleString()}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 6, paddingTop: 6 }}>
                <div className="print-field">
                  <span style={{ fontWeight: 700 }}>合計</span>
                  <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-primary)' }}>
                    ¥{(order.totalAmount || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Shipping info */}
        {order.trackingNumber && (
          <>
            <div className="divider" />
            <div className="print-section">
              <h3>配送情報 / 배송 정보</h3>
              <div className="print-field">
                <span className="print-field-label">配送業者</span>
                <span className="print-field-value">DHL</span>
              </div>
              <div className="print-field">
                <span className="print-field-label">追跡番号</span>
                <span className="print-field-value" style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                  {order.trackingNumber}
                </span>
              </div>
              {order.shippedAt && (
                <div className="print-field">
                  <span className="print-field-label">発送日</span>
                  <span className="print-field-value">
                    {format(order.shippedAt.toDate ? order.shippedAt.toDate() : new Date(order.shippedAt), 'yyyy/MM/dd')}
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {/* General notes */}
        {order.generalNotes && (
          <>
            <div className="divider" />
            <div className="print-section">
              <h3>備考 / 비고</h3>
              <p style={{ fontSize: 13, whiteSpace: 'pre-wrap', color: '#374151' }}>{order.generalNotes}</p>
            </div>
          </>
        )}

        {/* Attachments */}
        {order.files && order.files.length > 0 && (
          <>
            <div className="divider" />
            <div className="print-section">
              <h3>添付ファイル / 첨부파일</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {order.files.map((f, i) => (
                  <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm no-print"
                    style={{ fontSize: 12 }}>
                    📄 {f.name}
                  </a>
                ))}
              </div>
              <div className="print-only" style={{ display: 'none' }}>
                {order.files.map((f, i) => (
                  <p key={i} style={{ fontSize: 12 }}>📄 {f.name}</p>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{
          marginTop: 30, paddingTop: 16, borderTop: '1px solid var(--color-border)',
          display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8'
        }}>
          <span>TVS Dental Laboratory · Seoul, Korea · tvs@tvsdental.com</span>
          <span>印刷日: {format(new Date(), 'yyyy/MM/dd HH:mm')}</span>
        </div>
      </div>
    </div>
  );
}
