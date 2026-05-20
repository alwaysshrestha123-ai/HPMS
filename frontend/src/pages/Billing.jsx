import React, { useEffect, useState } from 'react';
import api from '../api/apiClient';
import { useAuth } from '../context/AuthContext';

const STATUS_STYLE = {
  PENDING: { color: '#ffff', bg: '#d97706', label: 'Pending' },
  PAID:    { color: '#ffff', bg: '#15803d', label: 'Paid' },
  OVERDUE: { color: '#ffff', bg: '#EF4444', label: 'Overdue' },
};


function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || { color: '#888', bg: '#f5f5f5', label: status };
  return (
    <span style={{
      fontSize: 9,
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      color: s.color,
      background: s.bg,
      padding: '3px 8px',
      whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}

export default function Billing() {
  const { user } = useAuth();
  const [bills, setBills]     = useState([]);
  const [patients, setPatients] = useState([]);
  const [form, setForm]       = useState({ patient_id: '', amount: '', description: '' });
  const [error, setError]     = useState('');
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const { data } = await api.get('/billing');
    setBills(data);
  }
  useEffect(() => {
    load();
    if (user.role === 'ADMIN' || user.role === 'NURSE') {
      api.get('/users/patients').then((r) => setPatients(r.data));
    }
  }, [user]);

  async function issueInvoice(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/billing', {
        patient_id: parseInt(form.patient_id, 10),
        amount: parseFloat(form.amount),
        description: form.description,
      });
      setForm({ patient_id: '', amount: '', description: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to issue invoice.');
    }
  }

  async function pay(id) {
    if (!confirm('Mark this invoice as paid? (demo only — no real payment is processed)')) return;
    await api.patch(`/billing/${id}/pay`);
    await load();
  }

  const totalPending = bills
    .filter((b) => b.status === 'PENDING')
    .reduce((sum, b) => sum + Number(b.amount), 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Montserrat:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        .zb-page {
          font-family: 'Montserrat', sans-serif;
          background: #fafaf8;
          min-height: calc(100vh - 56px);
          padding: 3.5rem 4rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        @media (max-width: 900px) { .zb-page { padding: 2rem 1.5rem; } }

        .zb-page-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 3rem;
          animation: zb-up 0.5s ease forwards;
        }
        .zb-page-eyebrow {
          font-size: 10px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: #bbb;
          margin-bottom: 0.4rem;
        }
        .zb-page-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 40px;
          font-weight: 300;
          font-style: italic;
          color: #111;
          line-height: 1.1;
          margin: 0;
        }

        .zb-issue-btn {
          font-family: 'Montserrat', sans-serif;
          font-size: 10px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #fff;
          background: #111;
          border: 1px solid #111;
          padding: 10px 24px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: color 0.3s;
          white-space: nowrap;
        }
        .zb-issue-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: #fff;
          transform: scaleX(0);
          transform-origin: right;
          transition: transform 0.3s cubic-bezier(0.77,0,0.18,1);
          z-index: 0;
        }
        .zb-issue-btn:hover::after { transform: scaleX(1); }
        .zb-issue-btn:hover { color: #111; }
        .zb-issue-btn span { position: relative; z-index: 1; }

        /* Summary strip */
        .zb-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: #e8e8e8;
          border: 1px solid #e8e8e8;
          margin-bottom: 3rem;
          animation: zb-up 0.5s ease 0.1s both;
        }
        @media (max-width: 700px) { .zb-summary { grid-template-columns: 1fr; } }
        .zb-summary-card {
          background: #fff;
          padding: 1.5rem;
        }
        .zb-summary-label {
          font-size: 9px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #aaa;
          margin-bottom: 0.6rem;
        }
        .zb-summary-value {
          font-family: 'Cormorant Garamond', serif;
          font-size: 32px;
          font-weight: 300;
          color: #111;
          line-height: 1;
        }

        /* Divider */
        .zb-divider {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .zb-divider-label {
          font-size: 10px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #999;
          white-space: nowrap;
        }
        .zb-divider-line { flex: 1; height: 1px; background: #e8e8e8; }

        /* Form panel */
        .zb-form-panel {
          background: #fff;
          border: 1px solid #e8e8e8;
          margin-bottom: 3rem;
          animation: zb-up 0.4s ease both;
        }
        .zb-form-inner {
          padding: 2rem;
          display: grid;
          grid-template-columns: 1fr 1fr 1.5fr auto;
          gap: 1.5rem;
          align-items: end;
        }
        @media (max-width: 900px) { .zb-form-inner { grid-template-columns: 1fr; } }

        .zb-field { display: flex; flex-direction: column; gap: 0.5rem; }
        .zb-label {
          font-size: 9px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #aaa;
        }
        .zb-input, .zb-select {
          font-family: 'Montserrat', sans-serif;
          font-size: 12px;
          color: #111;
          background: #fafaf8;
          border: 1px solid #e8e8e8;
          padding: 10px 12px;
          outline: none;
          transition: border-color 0.2s;
          appearance: none;
          width: 100%;
        }
        .zb-input:focus, .zb-select:focus { border-color: #111; }

        .zb-submit-btn {
          font-family: 'Montserrat', sans-serif;
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          background: #111;
          color: #fff;
          border: none;
          padding: 11px 20px;
          cursor: pointer;
          white-space: nowrap;
        }

        .zb-error {
          margin: 0 2rem 1.5rem;
          font-size: 11px;
          color: #8b3a3a;
          border-left: 2px solid #8b3a3a;
          padding-left: 1rem;
        }

        /* Table */
        .zb-table-panel {
          background: #fff;
          border: 1px solid #e8e8e8;
          animation: zb-up 0.5s ease 0.15s both;
        }
        .zb-table-head {
          display: grid;
          gap: 1rem;
          padding: 0.875rem 1.5rem;
          border-bottom: 1px solid #e8e8e8;
        }
        .zb-row {
          display: grid;
          gap: 1rem;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #f0f0f0;
          align-items: center;
          transition: background 0.15s;
        }
        .zb-row:last-child { border-bottom: none; }
        .zb-row:hover { background: #fafaf8; }

        /* columns vary by role */
        .zb-cols-admin { grid-template-columns: 1fr 1fr 1.5fr 0.8fr 0.8fr 0.5fr; }
        .zb-cols-patient { grid-template-columns: 1fr 1.5fr 0.8fr 0.8fr 0.5fr; }

        .zb-th {
          font-size: 9px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #aaa;
        }
        .zb-cell { font-size: 12px; color: #333; letter-spacing: 0.02em; }
        .zb-cell-muted { font-size: 11px; color: #bbb; }
        .zb-cell-amount {
          font-family: 'Cormorant Garamond', serif;
          font-size: 16px;
          font-weight: 400;
          color: #111;
        }

        .zb-pay-btn {
          font-family: 'Montserrat', sans-serif;
          font-size: 9px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #3a6f4a;
          background: transparent;
          border: none;
          cursor: pointer;
          border-bottom: 1px solid currentColor;
          padding: 0;
          transition: opacity 0.2s;
        }
        .zb-pay-btn:hover { opacity: 0.6; }

        .zb-empty {
          padding: 3rem 1.5rem;
          text-align: center;
          font-size: 11px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #ccc;
        }

        @keyframes zb-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="zb-page">

        {/* Header */}
        <header className="zb-page-header">
          <div>
            <p className="zb-page-eyebrow">Finance</p>
            <h1 className="zb-page-title">Billing.</h1>
          </div>
          {(user.role === 'ADMIN' || user.role === 'NURSE') && (
            <button className="zb-issue-btn" onClick={() => setShowForm((v) => !v)}>
              <span>{showForm ? 'Dismiss' : '+ Issue Invoice'}</span>
            </button>
          )}
        </header>

        {/* Summary strip — always visible */}
        <div className="zb-summary">
          <div className="zb-summary-card">
            <p className="zb-summary-label">Total Invoices</p>
            <p className="zb-summary-value">{bills.length}</p>
          </div>
          <div className="zb-summary-card">
            <p className="zb-summary-label">Pending Amount</p>
            <p className="zb-summary-value">${totalPending.toFixed(2)}</p>
          </div>
          <div className="zb-summary-card">
            <p className="zb-summary-label">Paid Invoices</p>
            <p className="zb-summary-value">{bills.filter((b) => b.status === 'PAID').length}</p>
          </div>
        </div>

        {/* Issue invoice form */}
        {(user.role === 'ADMIN' || user.role === 'NURSE') && showForm && (
          <>
            <div className="zb-divider">
              <span className="zb-divider-label">New Invoice</span>
              <div className="zb-divider-line" />
            </div>
            <div className="zb-form-panel">
              {error && <p className="zb-error">{error}</p>}
              <form onSubmit={issueInvoice} className="zb-form-inner">
                <div className="zb-field">
                  <label className="zb-label">Patient</label>
                  <select className="zb-select" required value={form.patient_id}
                    onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>
                    <option value="">Select…</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="zb-field">
                  <label className="zb-label">Amount (AUD)</label>
                  <input type="number" min="0" step="0.01" className="zb-input" required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div className="zb-field">
                  <label className="zb-label">Description</label>
                  <input className="zb-input" required maxLength={500}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <button type="submit" className="zb-submit-btn">Issue</button>
              </form>
            </div>
          </>
        )}

        {/* Invoices table */}
        <div className="zb-divider">
          <span className="zb-divider-label">Invoices</span>
          <div className="zb-divider-line" />
        </div>

        <div className="zb-table-panel">
          <div className={`zb-table-head ${user.role !== 'PATIENT' ? 'zb-cols-admin' : 'zb-cols-patient'}`}>
            <span className="zb-th">Issued</span>
            {user.role !== 'PATIENT' && <span className="zb-th">Patient</span>}
            <span className="zb-th">Description</span>
            <span className="zb-th">Amount</span>
            <span className="zb-th">Status</span>
            <span className="zb-th" />
          </div>

          {bills.length === 0 ? (
            <p className="zb-empty">No invoices to display</p>
          ) : (
            bills.map((b) => (
              <div key={b.id} className={`zb-row ${user.role !== 'PATIENT' ? 'zb-cols-admin' : 'zb-cols-patient'}`}>
                <span className="zb-cell">
                  {new Date(b.issued_date).toLocaleDateString('en-AU', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </span>
                {user.role !== 'PATIENT' && (
                  <span className="zb-cell">{b.patient_name}</span>
                )}
                <span className="zb-cell-muted">{b.description}</span>
                <span className="zb-cell-amount">${Number(b.amount).toFixed(2)}</span>
                <StatusBadge status={b.status} />
                <div style={{ textAlign: 'right' }}>
                  {user.role === 'PATIENT' && b.status === 'PENDING' && (
                    <button className="zb-pay-btn" onClick={() => pay(b.id)}>Pay now</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </>
  );
}