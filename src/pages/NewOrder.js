import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import toast from 'react-hot-toast';

const PRODUCT_TYPES = [
  { value: 'veneer', labelKey: 'order.veneer' },
  { value: 'crown', labelKey: 'order.crown' },
  { value: 'bridge', labelKey: 'order.bridge' },
  { value: 'inlay', labelKey: 'order.inlay' },
  { value: 'onlay', labelKey: 'order.onlay' },
  { value: 'implant', labelKey: 'order.implant' },
  { value: 'nightguard', labelKey: 'order.nightguard' },
  { value: 'other', labelKey: 'order.other' }
];

const MATERIALS = [
  'e.max (Lithium Disilicate)',
  'Zirconia (Full)',
  'Zirconia (Translucent)',
  'Zirconia (Multi-layer)',
  'PFM (Porcelain Fused to Metal)',
  'Full Cast Metal',
  'Composite Resin',
  'PMMA',
  'その他 / 기타'
];

const SHADES = [
  'A1','A2','A3','A3.5','A4',
  'B1','B2','B3','B4',
  'C1','C2','C3','C4',
  'D2','D3','D4',
  'BL1','BL2','BL3','BL4',
  'その他'
];

const INITIAL_ITEM = {
  toothNumber: '',
  productType: 'veneer',
  material: 'e.max (Lithium Disilicate)',
  shade: 'A2',
  quantity: 1,
  notes: ''
};

function generateOrderNumber() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TVS${y}${m}${d}-${rand}`;
}

export default function NewOrder() {
  const { t } = useTranslation();
  const { currentUser, userProfile } = useAuth();
  const [items, setItems] = useState([{ ...INITIAL_ITEM }]);
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const handleItemChange = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const addItem = () => {
    setItems(prev => [...prev, { ...INITIAL_ITEM }]);
  };

  const removeItem = (idx) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleFiles = (newFiles) => {
    const validFiles = Array.from(newFiles).filter(f => {
      const ext = f.name.split('.').pop().toLowerCase();
      return ['stl','ply','dcm','jpg','jpeg','png','pdf'].includes(ext);
    });
    if (files.length + validFiles.length > 10) {
      toast.error(t('order.maxFiles'));
      return;
    }
    setFiles(prev => [...prev, ...validFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dueDate) { toast.error('納期希望日を入力してください。'); return; }
    setLoading(true);
    try {
      const orderNumber = generateOrderNumber();

      // Upload files
      const uploadedFiles = [];
      for (const file of files) {
        const fileRef2 = ref(storage, `orders/${orderNumber}/${file.name}`);
        await uploadBytes(fileRef2, file);
        const url = await getDownloadURL(fileRef2);
        uploadedFiles.push({ name: file.name, url, size: file.size });
      }

      // Save order to Firestore
      await addDoc(collection(db, 'orders'), {
        orderNumber,
        clinicId: currentUser.uid,
        clinicName: userProfile.clinicName,
        doctorName: userProfile.doctorName,
        clinicEmail: currentUser.email,
        clinicSubEmail: userProfile.subEmail || '',
        patientName,
        patientId,
        dueDate,
        generalNotes,
        items,
        files: uploadedFiles,
        status: 'pending',
        trackingNumber: '',
        shippedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast.success(t('order.orderSuccess'));
      // Reset form
      setItems([{ ...INITIAL_ITEM }]);
      setPatientName('');
      setPatientId('');
      setDueDate('');
      setGeneralNotes('');
      setFiles([]);
    } catch (err) {
      console.error(err);
      toast.error('注文の送信に失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-primary)' }}>
          {t('order.newOrder')}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
          {userProfile?.clinicName} — {userProfile?.doctorName}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Patient Info */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">👤 患者情報 / 환자 정보</h3>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('order.patientName')} <span className="required">*</span></label>
              <input className="form-input" value={patientName} onChange={e => setPatientName(e.target.value)}
                required placeholder="患者名" />
            </div>
            <div className="form-group">
              <label className="form-label">{t('order.patientId')}</label>
              <input className="form-input" value={patientId} onChange={e => setPatientId(e.target.value)}
                placeholder="患者ID（任意）" />
            </div>
            <div className="form-group">
              <label className="form-label">{t('order.dueDate')} <span className="required">*</span></label>
              <input className="form-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                required min={new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]} />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">🦷 製作品目 / 제작 항목</h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>
              + {t('order.addItem')}
            </button>
          </div>

          {items.map((item, idx) => (
            <div key={idx} style={{
              background: 'var(--color-bg)',
              borderRadius: 8,
              padding: '16px',
              marginBottom: 12,
              border: '1px solid var(--color-border)',
              position: 'relative'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}>
                  #{idx + 1}
                </span>
                {items.length > 1 && (
                  <button type="button" className="btn btn-ghost btn-sm"
                    onClick={() => removeItem(idx)}
                    style={{ color: 'var(--color-danger)', fontSize: 12 }}>
                    × {t('order.removeItem')}
                  </button>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('order.toothNumber')} <span className="required">*</span></label>
                  <input className="form-input" value={item.toothNumber}
                    onChange={e => handleItemChange(idx, 'toothNumber', e.target.value)}
                    required placeholder="例: #11, #21" />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('order.productType')} <span className="required">*</span></label>
                  <select className="form-select" value={item.productType}
                    onChange={e => handleItemChange(idx, 'productType', e.target.value)}>
                    {PRODUCT_TYPES.map(pt => (
                      <option key={pt.value} value={pt.value}>{t(pt.labelKey)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('order.material')} <span className="required">*</span></label>
                  <select className="form-select" value={item.material}
                    onChange={e => handleItemChange(idx, 'material', e.target.value)}>
                    {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('order.shade')}</label>
                  <select className="form-select" value={item.shade}
                    onChange={e => handleItemChange(idx, 'shade', e.target.value)}>
                    {SHADES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('order.quantity')}</label>
                  <input className="form-input" type="number" min="1" max="20"
                    value={item.quantity}
                    onChange={e => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)} />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">{t('order.notes')}</label>
                  <input className="form-input" value={item.notes}
                    onChange={e => handleItemChange(idx, 'notes', e.target.value)}
                    placeholder="特記事項・形態指示など" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* File Upload */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">📎 {t('order.attachments')}</h3>
          </div>

          <input type="file" ref={fileRef} style={{ display: 'none' }}
            multiple accept=".stl,.ply,.dcm,.jpg,.jpeg,.png,.pdf"
            onChange={e => handleFiles(e.target.files)} />

          <div
            className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
            onClick={() => fileRef.current.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <div className="upload-zone-icon">📁</div>
            <p>{t('order.dragDrop')}</p>
            <p>{t('order.orClick')}</p>
            <p style={{ fontSize: 12, marginTop: 8, color: '#94a3b8' }}>
              {t('order.fileTypes')}
            </p>
          </div>

          {files.length > 0 && (
            <div className="uploaded-files">
              {files.map((f, i) => (
                <div key={i} className="uploaded-file">
                  <span>📄</span>
                  <span className="uploaded-file-name">{f.name}</span>
                  <span className="uploaded-file-size">
                    {(f.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                  <button type="button" className="btn btn-ghost btn-sm"
                    onClick={() => removeFile(i)}
                    style={{ color: 'var(--color-danger)', padding: '2px 6px' }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* General Notes */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3 className="card-title">📝 全体備考 / 전체 비고</h3>
          </div>
          <textarea
            className="form-textarea"
            value={generalNotes}
            onChange={e => setGeneralNotes(e.target.value)}
            placeholder="全体への特記事項があればご記入ください"
            rows={3}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button type="button" className="btn btn-secondary btn-lg"
            onClick={() => {
              if (window.confirm('入力内容をリセットしますか？')) {
                setItems([{ ...INITIAL_ITEM }]);
                setPatientName(''); setPatientId(''); setDueDate('');
                setGeneralNotes(''); setFiles([]);
              }
            }}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                送信中...
              </span>
            ) : '🚀 注文を送信する'}
          </button>
        </div>
      </form>
    </div>
  );
}
