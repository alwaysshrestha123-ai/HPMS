import React, { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../api/apiClient';
import { useAuth } from '../context/AuthContext';

const SPECIALISATIONS = [
  'General Practitioner',
  'Cardiologist',
  'Dermatologist',
  'Endocrinologist',
  'Gastroenterologist',
  'Neurologist',
  'Obstetrician/Gynaecologist',
  'Oncologist',
  'Ophthalmologist',
  'Orthopaedic Surgeon',
  'Paediatrician',
  'Psychiatrist',
  'Pulmonologist',
  'Radiologist',
  'Urologist',
];

const ROLE_STYLE = {
  DOCTOR: { color: '#fff', bg: '#2563eb', label: 'Doctor' },
  NURSE:  { color: '#fff', bg: '#0ea5e9', label: 'Nurse' },
};

const STATUS_STYLE = {
  ACTIVE:   { color: '#fff', bg: '#16a34a', label: 'Active' },
  INACTIVE: { color: '#fff', bg: '#6b7280', label: 'Inactive' },
};

function Badge({ map, value }) {
  const s = map[value] || { color: '#888', bg: '#f5f5f5', label: value };
  return (
    <span style={{
      fontSize: 9,
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      color: s.color,
      background: s.bg,
      padding: '3px 8px',
      whiteSpace: 'nowrap',
      borderRadius: 2,
    }}>
      {s.label}
    </span>
  );
}

const blankForm = {
  role: 'DOCTOR',
  full_name: '',
  email: '',
  password: '',
  phone: '',
  specialisation: '',
  license_number: '',
};

/**
 * Safely extracts an array from any API response shape.
 * Handles: plain array, { rows: [] }, { staff: [] }, { data: [] }, { users: [] }
 */
function extractArray(responseData) {
  if (!responseData) return [];
  if (Array.isArray(responseData)) return responseData;
  if (Array.isArray(responseData.rows))  return responseData.rows;
  if (Array.isArray(responseData.staff)) return responseData.staff;
  if (Array.isArray(responseData.data))  return responseData.data;
  if (Array.isArray(responseData.users)) return responseData.users;
  return [];
}

export default function StaffManagement() {
  const { user } = useAuth();
  const [staff, setStaff]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter]       = useState('ALL');
  const [search, setSearch]       = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [busy, setBusy]           = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm]           = useState(blankForm);

  // ─── Data fetching ─────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await api.get('/users/staff');

      /*
       * Axios wraps the response body in res.data.
       * The backend sends a plain array, so res.data should already be [].
       * extractArray handles any other shape defensively.
       */
      const list = extractArray(res?.data ?? res);
      setStaff(list);
    } catch (err) {
      console.error('Failed to load staff:', err);

      let message = 'Failed to load staff. Please try again.';
      if (err?.response?.status === 401) {
        message = 'Session expired — please log in again.';
      } else if (err?.response?.status === 403) {
        message = 'Access denied: Admin account required.';
      } else if (err?.response?.data?.message) {
        message = err.response.data.message;
      } else if (err?.message) {
        message = err.message;
      }

      setLoadError(message);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load once user role is confirmed ADMIN
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      load();
    } else if (user && user.role !== 'ADMIN') {
      setLoading(false);
    }
  }, [user, load]);

  // ─── Create staff ──────────────────────────────────────────────────────────
  async function createStaff(e) {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      const payload = {
        role:      form.role,
        full_name: form.full_name.trim(),
        email:     form.email.trim().toLowerCase(),
        password:  form.password,
        phone:     form.phone.trim() || null,
      };
      if (form.role === 'DOCTOR') {
        payload.specialisation = form.specialisation.trim() || null;
        payload.license_number = form.license_number.trim() || null;
      }
      await api.post('/users/staff', payload);
      setForm(blankForm);
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(
        err?.response?.data?.message ||
        err?.message ||
        'Failed to create staff member.'
      );
    } finally {
      setBusy(false);
    }
  }

  // ─── Toggle status ─────────────────────────────────────────────────────────
  async function toggleStatus(id, currentStatus) {
    const next = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const verb = next === 'INACTIVE' ? 'deactivate' : 'reactivate';
    if (!window.confirm(`Are you sure you want to ${verb} this staff member?`)) return;
    try {
      await api.patch(`/users/staff/${id}/status`, { status: next });
      // Optimistic local update — no full reload needed
      setStaff((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: next } : s))
      );
    } catch (err) {
      console.error('Failed to update status:', err);
      window.alert(
        err?.response?.data?.message || 'Could not update status. Please try again.'
      );
    }
  }

  // ─── Filter + search ───────────────────────────────────────────────────────
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((s) => {
      if (filter !== 'ALL' && s.role !== filter) return false;
      if (!q) return true;
      return (
        s.full_name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.specialisation?.toLowerCase().includes(q) ||
        s.license_number?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q)
      );
    });
  }, [staff, filter, search]);

  const counts = useMemo(() => ({
    ALL:    staff.length,
    DOCTOR: staff.filter((s) => s.role === 'DOCTOR').length,
    NURSE:  staff.filter((s) => s.role === 'NURSE').length,
  }), [staff]);

  // ─── Access gate ───────────────────────────────────────────────────────────
  if (!user) return null;

  if (user.role !== 'ADMIN') {
    return (
      <div style={{
        padding: '4rem 2rem', textAlign: 'center',
        fontFamily: 'Montserrat, sans-serif',
      }}>
        <p style={{
          fontSize: 10, letterSpacing: '0.25em',
          textTransform: 'uppercase', color: '#bbb',
        }}>Access denied</p>
        <p style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: 28, fontStyle: 'italic', color: '#111', marginTop: '0.5rem',
        }}>Administrators only.</p>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Montserrat:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        .zs-page {
          font-family: 'Montserrat', sans-serif;
          background: #fafaf8;
          min-height: calc(100vh - 56px);
          padding: 3.5rem 4rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        @media (max-width: 900px) { .zs-page { padding: 2rem 1.5rem; } }

        /* Header */
        .zs-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 3rem;
          animation: zs-up 0.5s ease forwards;
        }
        .zs-eyebrow {
          font-size: 10px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: #bbb;
          margin-bottom: 0.4rem;
        }
        .zs-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 40px;
          font-weight: 300;
          font-style: italic;
          color: #111;
          line-height: 1.1;
          margin: 0;
        }

        .zs-add-btn {
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
        .zs-add-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: #fff;
          transform: scaleX(0);
          transform-origin: right;
          transition: transform 0.3s cubic-bezier(0.77,0,0.18,1);
          z-index: 0;
        }
        .zs-add-btn:hover::after { transform: scaleX(1); }
        .zs-add-btn:hover { color: #111; }
        .zs-add-btn span { position: relative; z-index: 1; }

        /* Load error banner */
        .zs-load-error {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          background: #fff5f5;
          border: 1px solid #fca5a5;
          border-left: 3px solid #dc2626;
          padding: 0.875rem 1.25rem;
          margin-bottom: 1.5rem;
          border-radius: 2px;
          animation: zs-up 0.3s ease both;
        }
        .zs-load-error p { font-size: 12px; color: #7f1d1d; margin: 0; }
        .zs-retry-btn {
          font-family: 'Montserrat', sans-serif;
          font-size: 9px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #dc2626;
          background: transparent;
          border: 1px solid #fca5a5;
          padding: 6px 14px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .zs-retry-btn:hover { background: #dc2626; color: #fff; border-color: #dc2626; }

        /* Toolbar */
        .zs-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .zs-tabs { display: flex; gap: 0; }
        .zs-tab {
          font-family: 'Montserrat', sans-serif;
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #999;
          background: transparent;
          border: 1px solid #e8e8e8;
          padding: 8px 16px;
          cursor: pointer;
          transition: all 0.2s;
          border-right: none;
        }
        .zs-tab:last-child { border-right: 1px solid #e8e8e8; }
        .zs-tab:hover { color: #111; }
        .zs-tab--active { background: #111; color: #fff; border-color: #111; }
        .zs-tab-count { font-size: 9px; opacity: 0.6; margin-left: 6px; }

        .zs-search {
          font-family: 'Montserrat', sans-serif;
          font-size: 12px;
          color: #111;
          background: #fff;
          border: 1px solid #e8e8e8;
          padding: 8px 14px;
          width: 240px;
          outline: none;
          transition: border-color 0.2s;
        }
        .zs-search:focus { border-color: #111; }
        @media (max-width: 600px) { .zs-search { width: 100%; } }

        /* Divider */
        .zs-divider {
          display: flex; align-items: center; gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .zs-divider-label {
          font-size: 10px; letter-spacing: 0.25em;
          text-transform: uppercase; color: #999; white-space: nowrap;
        }
        .zs-divider-line { flex: 1; height: 1px; background: #e8e8e8; }

        /* Form panel */
        .zs-form-panel {
          background: #fff;
          border: 1px solid #e8e8e8;
          margin-bottom: 3rem;
          animation: zs-up 0.4s ease both;
        }
        .zs-form-inner {
          padding: 2rem;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }
        @media (max-width: 900px) { .zs-form-inner { grid-template-columns: 1fr; } }

        .zs-field { display: flex; flex-direction: column; gap: 0.5rem; }
        .zs-field--full { grid-column: 1 / -1; }
        .zs-label {
          font-size: 9px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #aaa;
        }
        .zs-input, .zs-select {
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
        .zs-input:focus, .zs-select:focus { border-color: #111; }

        /* Role toggle */
        .zs-role-toggle { display: flex; gap: 0; }
        .zs-role-btn {
          flex: 1;
          font-family: 'Montserrat', sans-serif;
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #999;
          background: #fafaf8;
          border: 1px solid #e8e8e8;
          padding: 10px 12px;
          cursor: pointer;
          transition: all 0.2s;
          border-right: none;
        }
        .zs-role-btn:last-child { border-right: 1px solid #e8e8e8; }
        .zs-role-btn--active { background: #111; color: #fff; border-color: #111; }

        .zs-form-actions {
          padding: 0 2rem 2rem;
          display: flex; gap: 1rem; justify-content: flex-end;
        }
        .zs-submit-btn {
          font-family: 'Montserrat', sans-serif;
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          background: #111; color: #fff; border: none;
          padding: 11px 28px;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .zs-submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .zs-cancel-btn {
          font-family: 'Montserrat', sans-serif;
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          background: transparent;
          color: #999;
          border: 1px solid #e8e8e8;
          padding: 11px 24px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .zs-cancel-btn:hover { color: #111; border-color: #111; }

        .zs-error {
          margin: 0 2rem 1.5rem;
          font-size: 11px;
          color: #8b3a3a;
          border-left: 2px solid #8b3a3a;
          padding-left: 1rem;
          padding-top: 0.25rem;
          padding-bottom: 0.25rem;
        }

        /* Table */
        .zs-table-panel {
          background: #fff;
          border: 1px solid #e8e8e8;
          animation: zs-up 0.5s ease 0.15s both;
        }
        .zs-table-head {
          display: grid;
          grid-template-columns: 1.4fr 0.7fr 1.4fr 1.4fr 0.8fr 0.7fr;
          padding: 0.875rem 1.5rem;
          border-bottom: 1px solid #e8e8e8;
          gap: 1rem;
        }
        .zs-th {
          font-size: 9px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #aaa;
        }
        .zs-th:last-child { text-align: right; }

        .zs-row {
          display: grid;
          grid-template-columns: 1.4fr 0.7fr 1.4fr 1.4fr 0.8fr 0.7fr;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #f0f0f0;
          gap: 1rem;
          align-items: center;
          transition: background 0.15s;
        }
        .zs-row:last-child { border-bottom: none; }
        .zs-row:hover { background: #fafaf8; }

        .zs-cell { font-size: 12px; color: #333; letter-spacing: 0.02em; }
        .zs-cell-strong { font-size: 13px; color: #111; font-weight: 500; }
        .zs-cell-muted { font-size: 11px; color: #bbb; }
        .zs-cell-italic {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 14px;
          color: #555;
        }

        .zs-actions { display: flex; justify-content: flex-end; gap: 1rem; }
        .zs-action-btn {
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
        .zs-action-btn:hover { opacity: 0.6; }
        .zs-action-btn--danger  { color: #8b3a3a; }
        .zs-action-btn--restore { color: #3a6f4a; }

        /* Skeleton loader */
        .zs-skeleton-row {
          display: grid;
          grid-template-columns: 1.4fr 0.7fr 1.4fr 1.4fr 0.8fr 0.7fr;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #f0f0f0;
          gap: 1rem;
          align-items: center;
        }
        .zs-skeleton {
          height: 12px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: zs-shimmer 1.4s infinite;
          border-radius: 2px;
        }
        @keyframes zs-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .zs-empty {
          padding: 3rem 1.5rem;
          text-align: center;
          font-size: 11px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #ccc;
        }

        @keyframes zs-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
          .zs-table-head { display: none; }
          .zs-row {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: auto;
            gap: 0.5rem;
            padding: 1rem;
          }
          .zs-skeleton-row { display: none; }
        }
      `}</style>

      <div className="zs-page">

        {/* ── Header ── */}
        <header className="zs-header">
          <div>
            <p className="zs-eyebrow">Administration</p>
            <h1 className="zs-title">Staff.</h1>
          </div>
          <button className="zs-add-btn" onClick={() => setShowForm((v) => !v)}>
            <span>{showForm ? 'Dismiss' : '+ Add Staff Member'}</span>
          </button>
        </header>

        {/* ── Load error ── */}
        {loadError && (
          <div className="zs-load-error">
            <p>{loadError}</p>
            <button className="zs-retry-btn" onClick={load}>Retry</button>
          </div>
        )}

        {/* ── Add staff form ── */}
        {showForm && (
          <>
            <div className="zs-divider">
              <span className="zs-divider-label">
                New {form.role === 'DOCTOR' ? 'Doctor' : 'Nurse'}
              </span>
              <div className="zs-divider-line" />
            </div>

            <div className="zs-form-panel">
              {formError && <p className="zs-error">{formError}</p>}
              <form onSubmit={createStaff}>
                <div className="zs-form-inner">

                  {/* Role */}
                  <div className="zs-field zs-field--full">
                    <label className="zs-label">Role</label>
                    <div className="zs-role-toggle">
                      {['DOCTOR', 'NURSE'].map((r) => (
                        <button
                          key={r}
                          type="button"
                          className={`zs-role-btn ${form.role === r ? 'zs-role-btn--active' : ''}`}
                          onClick={() => setForm({ ...form, role: r })}
                        >
                          {r === 'DOCTOR' ? 'Doctor' : 'Nurse'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Full Name */}
                  <div className="zs-field">
                    <label className="zs-label">Full Name</label>
                    <input
                      className="zs-input"
                      required
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      placeholder="Jane Smith"
                    />
                  </div>

                  {/* Email */}
                  <div className="zs-field">
                    <label className="zs-label">Email</label>
                    <input
                      type="email"
                      className="zs-input"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="jane@clinic.com"
                    />
                  </div>

                  {/* Phone */}
                  <div className="zs-field">
                    <label className="zs-label">Phone</label>
                    <input
                      className="zs-input"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+61 4XX XXX XXX"
                    />
                  </div>

                  {/* Temporary Password */}
                  <div className="zs-field">
                    <label className="zs-label">Temporary Password</label>
                    <input
                      type="text"
                      className="zs-input"
                      required
                      minLength={8}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Min. 8 characters"
                    />
                  </div>

                  {/* Doctor-only fields */}
                  {form.role === 'DOCTOR' && (
                    <>
                      <div className="zs-field">
                        <label className="zs-label">Specialisation</label>
                        <input
                          className="zs-input"
                          list="zs-spec-list"
                          required
                          value={form.specialisation}
                          onChange={(e) => setForm({ ...form, specialisation: e.target.value })}
                          placeholder="e.g. Cardiologist"
                        />
                        <datalist id="zs-spec-list">
                          {SPECIALISATIONS.map((s) => (
                            <option key={s} value={s} />
                          ))}
                        </datalist>
                      </div>

                      <div className="zs-field">
                        <label className="zs-label">Licence Number</label>
                        <input
                          className="zs-input"
                          value={form.license_number}
                          onChange={(e) => setForm({ ...form, license_number: e.target.value })}
                          placeholder="MED1234567"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="zs-form-actions">
                  <button
                    type="button"
                    className="zs-cancel-btn"
                    onClick={() => {
                      setShowForm(false);
                      setForm(blankForm);
                      setFormError('');
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="zs-submit-btn" disabled={busy}>
                    {busy ? 'Creating…' : 'Create Staff Member'}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {/* ── Toolbar ── */}
        <div className="zs-toolbar">
          <div className="zs-tabs">
            {[
              { key: 'ALL',    label: 'All' },
              { key: 'DOCTOR', label: 'Doctors' },
              { key: 'NURSE',  label: 'Nurses' },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`zs-tab ${filter === key ? 'zs-tab--active' : ''}`}
                onClick={() => setFilter(key)}
              >
                {label}
                <span className="zs-tab-count">{counts[key]}</span>
              </button>
            ))}
          </div>
          <input
            type="text"
            className="zs-search"
            placeholder="Search name, email, specialisation…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* ── Table ── */}
        <div className="zs-table-panel">
          <div className="zs-table-head">
            <span className="zs-th">Name</span>
            <span className="zs-th">Role</span>
            <span className="zs-th">Specialisation</span>
            <span className="zs-th">Contact</span>
            <span className="zs-th">Status</span>
            <span className="zs-th">Actions</span>
          </div>

          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="zs-skeleton-row">
                <div>
                  <div className="zs-skeleton" style={{ width: '70%', marginBottom: 6 }} />
                  <div className="zs-skeleton" style={{ width: '45%', height: 9 }} />
                </div>
                <div className="zs-skeleton" style={{ width: 52, height: 20 }} />
                <div className="zs-skeleton" style={{ width: '60%' }} />
                <div>
                  <div className="zs-skeleton" style={{ width: '80%', marginBottom: 6 }} />
                  <div className="zs-skeleton" style={{ width: '40%', height: 9 }} />
                </div>
                <div className="zs-skeleton" style={{ width: 52, height: 20 }} />
                <div className="zs-skeleton" style={{ width: 64, height: 14, marginLeft: 'auto' }} />
              </div>
            ))
          ) : visible.length === 0 ? (
            <p className="zs-empty">
              {loadError
                ? 'Could not load staff — see error above'
                : search || filter !== 'ALL'
                  ? 'No matching staff found'
                  : 'No staff members yet — add one above'}
            </p>
          ) : (
            visible.map((s) => {
              const status = s.status || 'ACTIVE';
              return (
                <div key={s.id} className="zs-row">
                  <div>
                    <p className="zs-cell-strong">
                      {s.role === 'DOCTOR' ? ` ${s.full_name}` : s.full_name}
                    </p>
                    {s.license_number && (
                      <p className="zs-cell-muted">Lic: {s.license_number}</p>
                    )}
                  </div>

                  <Badge map={ROLE_STYLE} value={s.role} />

                  <span className="zs-cell-italic">
                    {s.specialisation || (s.role === 'NURSE' ? 'General Nursing' : '—')}
                  </span>

                  <div>
                    <p className="zs-cell">{s.email}</p>
                    {s.phone && <p className="zs-cell-muted">{s.phone}</p>}
                  </div>

                  <Badge map={STATUS_STYLE} value={status} />

                  <div className="zs-actions">
                    {status === 'ACTIVE' ? (
                      <button
                        className="zs-action-btn zs-action-btn--danger"
                        onClick={() => toggleStatus(s.id, 'ACTIVE')}
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        className="zs-action-btn zs-action-btn--restore"
                        onClick={() => toggleStatus(s.id, 'INACTIVE')}
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </>
  );
}