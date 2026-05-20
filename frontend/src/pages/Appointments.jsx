import React, { useEffect, useState } from 'react';
import api from '../api/apiClient';
import { useAuth } from '../context/AuthContext';

const STATUS_STYLE = {
  BOOKED:    { color: '#fff', bg: '#2563eb', label: 'Booked' },
  COMPLETED: { color: '#fff', bg: '#16a34a', label: 'Completed' },
  CANCELLED: { color: '#fff', bg: '#6b7280', label: 'Cancelled' },
  PENDING:   { color: '#fff', bg: '#d97706', label: 'Pending' },
  PAID:      { color: '#fff', bg: '#15803d', label: 'Paid' },
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

export default function Appointments() {
  const { user } = useAuth();
  const [appts, setAppts]       = useState([]);
  const [doctors, setDoctors]   = useState([]);
  const [form, setForm]         = useState({ doctor_id: '', appointment_dt: '', reason: '' });
  const [error, setError]       = useState('');
  const [busy, setBusy]         = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    try {
      const { data } = await api.get('/appointments');
      setAppts(data);
    } catch (err) {
      console.error('Failed to load appointments', err);
    }
  }

  useEffect(() => {
    if (!user) return;
    load();
    if (user.role === 'PATIENT') {
      api.get('/users/doctors')
        .then((r) => setDoctors(r.data))
        .catch((err) => console.error('Failed to load doctors', err));
    }
  }, [user]);

  async function bookAppointment(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/appointments', {
        doctor_id: parseInt(form.doctor_id, 10),
        appointment_dt: new Date(form.appointment_dt).toISOString(),
        reason: form.reason,
      });
      setForm({ doctor_id: '', appointment_dt: '', reason: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed.');
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(id, status) {
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      await load();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  }

  async function cancel(id) {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      await api.delete(`/appointments/${id}`);
      await load();
    } catch (err) {
      console.error('Failed to cancel appointment', err);
    }
  }

  // "Counterparty" = the other side of the appointment relative to the viewer.
  function renderCounterpartyName(a) {
    if (user.role === 'PATIENT') {
      return a.doctor_name ? `Dr. ${a.doctor_name}` : '—';
    }
    return a.patient_name || '—';
  }

  if (!user) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Montserrat:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        .za-page {
          font-family: 'Montserrat', sans-serif;
          background: #fafaf8;
          min-height: calc(100vh - 56px);
          padding: 3.5rem 4rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        @media (max-width: 900px) { .za-page { padding: 2rem 1.5rem; } }

        .za-page-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 3rem;
          animation: za-up 0.5s ease forwards;
        }
        .za-page-eyebrow {
          font-size: 10px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: #bbb;
          margin-bottom: 0.4rem;
        }
        .za-page-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 40px;
          font-weight: 300;
          font-style: italic;
          color: #111;
          line-height: 1.1;
          margin: 0;
        }

        /* Book button */
        .za-book-btn {
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
        .za-book-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: #fff;
          transform: scaleX(0);
          transform-origin: right;
          transition: transform 0.3s cubic-bezier(0.77,0,0.18,1);
          z-index: 0;
        }
        .za-book-btn:hover::after { transform: scaleX(1); }
        .za-book-btn:hover { color: #111; }
        .za-book-btn span { position: relative; z-index: 1; }

        /* Section divider */
        .za-divider {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .za-divider-label {
          font-size: 10px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #999;
          white-space: nowrap;
        }
        .za-divider-line {
          flex: 1;
          height: 1px;
          background: #e8e8e8;
        }

        /* Booking form panel */
        .za-form-panel {
          background: #fff;
          border: 1px solid #e8e8e8;
          margin-bottom: 3rem;
          animation: za-up 0.4s ease both;
        }
        .za-form-inner {
          padding: 2rem;
          display: grid;
          grid-template-columns: 1fr 1fr 1.5fr auto;
          gap: 1.5rem;
          align-items: end;
        }
        @media (max-width: 900px) {
          .za-form-inner { grid-template-columns: 1fr; }
        }

        .za-field { display: flex; flex-direction: column; gap: 0.5rem; }
        .za-label {
          font-size: 9px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #aaa;
        }
        .za-input, .za-select {
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
        .za-input:focus, .za-select:focus { border-color: #111; }

        .za-submit-btn {
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
          position: relative;
          overflow: hidden;
          transition: opacity 0.2s;
        }
        .za-submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .za-error {
          margin: 0 2rem 1.5rem;
          font-size: 11px;
          letter-spacing: 0.05em;
          color: #8b3a3a;
          border-left: 2px solid #8b3a3a;
          padding-left: 1rem;
        }

        /* Table panel — now has 6 columns (added Specialisation) */
        .za-table-panel {
          background: #fff;
          border: 1px solid #e8e8e8;
          animation: za-up 0.5s ease 0.15s both;
        }
        .za-table-head {
          display: grid;
          grid-template-columns: 1.2fr 1.1fr 1fr 1.3fr 0.8fr 0.6fr;
          padding: 0.875rem 1.5rem;
          border-bottom: 1px solid #e8e8e8;
          gap: 1rem;
        }
        .za-th {
          font-size: 9px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #aaa;
        }
        .za-th:last-child { text-align: right; }

        .za-row {
          display: grid;
          grid-template-columns: 1.2fr 1.1fr 1fr 1.3fr 0.8fr 0.6fr;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #f0f0f0;
          gap: 1rem;
          align-items: center;
          transition: background 0.15s;
        }
        .za-row:last-child { border-bottom: none; }
        .za-row:hover { background: #fafaf8; }

        .za-cell { font-size: 12px; color: #333; letter-spacing: 0.02em; }
        .za-cell-muted { font-size: 11px; color: #bbb; letter-spacing: 0.03em; }
        .za-cell-italic {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 14px;
          color: #555;
        }
        .za-actions { display: flex; justify-content: flex-end; gap: 1rem; }

        .za-action-btn {
          font-family: 'Montserrat', sans-serif;
          font-size: 9px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
          border-bottom: 1px solid currentColor;
          transition: opacity 0.2s;
        }
        .za-action-btn:hover { opacity: 0.6; }
        .za-action-btn--complete { color: #3a6f4a; }
        .za-action-btn--cancel  { color: #8b3a3a; }

        .za-empty {
          padding: 3rem 1.5rem;
          text-align: center;
          font-size: 11px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #ccc;
        }

        @keyframes za-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="za-page">

        {/* Header */}
        <header className="za-page-header">
          <div>
            <p className="za-page-eyebrow">Health Portal</p>
            <h1 className="za-page-title">Appointments.</h1>
          </div>
          {user.role === 'PATIENT' && (
            <button className="za-book-btn" onClick={() => setShowForm((v) => !v)}>
              <span>{showForm ? 'Dismiss' : '+ Book Appointment'}</span>
            </button>
          )}
        </header>

        {/* Booking form */}
        {user.role === 'PATIENT' && showForm && (
          <>
            <div className="za-divider">
              <span className="za-divider-label">New Booking</span>
              <div className="za-divider-line" />
            </div>
            <div className="za-form-panel">
              {error && <p className="za-error">{error}</p>}
              <form onSubmit={bookAppointment} className="za-form-inner">
                <div className="za-field">
                  <label className="za-label">Doctor</label>
                  <select className="za-select" required
                    value={form.doctor_id}
                    onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}>
                    <option value="">Select doctor…</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        Dr. {d.full_name}{d.specialisation ? ` — ${d.specialisation}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="za-field">
                  <label className="za-label">Date &amp; Time</label>
                  <input type="datetime-local" className="za-input" required
                    value={form.appointment_dt}
                    onChange={(e) => setForm({ ...form, appointment_dt: e.target.value })} />
                </div>
                <div className="za-field">
                  <label className="za-label">Reason</label>
                  <input type="text" className="za-input" maxLength={500}
                    placeholder="e.g. routine checkup"
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })} />
                </div>
                <button type="submit" className="za-submit-btn" disabled={busy}>
                  {busy ? 'Booking…' : 'Confirm'}
                </button>
              </form>
            </div>
          </>
        )}

        {/* Table */}
        <div className="za-divider">
          <span className="za-divider-label">
            {user.role === 'DOCTOR' ? 'My Schedule' : 'All Appointments'}
          </span>
          <div className="za-divider-line" />
        </div>

        <div className="za-table-panel">
          <div className="za-table-head">
            <span className="za-th">Date / Time</span>
            <span className="za-th">{user.role === 'PATIENT' ? 'Doctor' : 'Patient'}</span>
            <span className="za-th">Specialisation</span>
            <span className="za-th">Reason</span>
            <span className="za-th">Status</span>
            <span className="za-th" style={{ textAlign: 'right' }}>Actions</span>
          </div>

          {appts.length === 0 ? (
            <p className="za-empty">No appointments yet</p>
          ) : (
            appts.map((a) => (
              <div key={a.id} className="za-row">
                <span className="za-cell">
                  {new Date(a.appointment_dt).toLocaleString('en-AU', {
                    month: 'short', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
                <span className="za-cell">
                  {renderCounterpartyName(a)}
                </span>
                <span className="za-cell-italic">
                  {a.doctor_specialisation || '—'}
                </span>
                <span className="za-cell-muted">{a.reason || '—'}</span>
                <StatusBadge status={a.status} />
                <div className="za-actions">
                  {user.role === 'DOCTOR' && a.status === 'BOOKED' && (
                    <button className="za-action-btn za-action-btn--complete"
                      onClick={() => updateStatus(a.id, 'COMPLETED')}>
                      Complete
                    </button>
                  )}
                  {(user.role === 'PATIENT' || user.role === 'ADMIN') && a.status === 'BOOKED' && (
                    <button className="za-action-btn za-action-btn--cancel"
                      onClick={() => cancel(a.id)}>
                      Cancel
                    </button>
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