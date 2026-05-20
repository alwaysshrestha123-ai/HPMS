import React, { useEffect, useState } from 'react';
import api from '../api/apiClient';
import { useAuth } from '../context/AuthContext';

export default function EHR() {
  const { user } = useAuth();
  const [records, setRecords]           = useState([]);
  const [patients, setPatients]         = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [form, setForm]                 = useState({ diagnosis: '', prescription: '', notes: '' });
  const [error, setError]               = useState('');
  const [showForm, setShowForm]         = useState(false);

  async function loadOwn() {
    const { data } = await api.get('/ehr/me');
    setRecords(data);
  }

  async function loadForPatient(patientId) {
    const { data } = await api.get(`/ehr/patient/${patientId}`);
    setRecords(data);
  }

  useEffect(() => {
    if (user.role === 'PATIENT') {
      loadOwn();
    } else {
      api.get('/users/patients').then((r) => setPatients(r.data));
    }
  }, [user]);

  useEffect(() => {
    if (selectedPatient) loadForPatient(selectedPatient);
  }, [selectedPatient]);

  async function addRecord(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/ehr', {
        patient_id: parseInt(selectedPatient, 10),
        ...form,
      });
      setForm({ diagnosis: '', prescription: '', notes: '' });
      setShowForm(false);
      await loadForPatient(selectedPatient);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add record.');
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Montserrat:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        .ze-page {
          font-family: 'Montserrat', sans-serif;
          background: #fafaf8;
          min-height: calc(100vh - 56px);
          padding: 3.5rem 4rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        @media (max-width: 900px) { .ze-page { padding: 2rem 1.5rem; } }

        /* Header */
        .ze-page-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 3rem;
          animation: ze-up 0.5s ease forwards;
        }
        .ze-page-eyebrow {
          font-size: 10px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: #bbb;
          margin-bottom: 0.4rem;
        }
        .ze-page-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 40px;
          font-weight: 300;
          font-style: italic;
          color: #111;
          line-height: 1.1;
          margin: 0;
        }

        .ze-add-btn {
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
        .ze-add-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: #fff;
          transform: scaleX(0);
          transform-origin: right;
          transition: transform 0.3s cubic-bezier(0.77,0,0.18,1);
          z-index: 0;
        }
        .ze-add-btn:hover::after { transform: scaleX(1); }
        .ze-add-btn:hover { color: #111; }
        .ze-add-btn span { position: relative; z-index: 1; }

        /* Divider */
        .ze-divider {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .ze-divider-label {
          font-size: 10px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #999;
          white-space: nowrap;
        }
        .ze-divider-line { flex: 1; height: 1px; background: #e8e8e8; }

        /* Patient selector */
        .ze-selector-panel {
          background: #fff;
          border: 1px solid #e8e8e8;
          padding: 1.5rem;
          margin-bottom: 3rem;
          animation: ze-up 0.5s ease 0.05s both;
          display: flex;
          align-items: center;
          gap: 2rem;
        }
        .ze-selector-label {
          font-size: 9px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #aaa;
          white-space: nowrap;
        }
        .ze-select {
          font-family: 'Montserrat', sans-serif;
          font-size: 12px;
          color: #111;
          background: #fafaf8;
          border: 1px solid #e8e8e8;
          padding: 10px 12px;
          outline: none;
          transition: border-color 0.2s;
          appearance: none;
          flex: 1;
          max-width: 400px;
        }
        .ze-select:focus { border-color: #111; }

        /* New record form */
        .ze-form-panel {
          background: #fff;
          border: 1px solid #e8e8e8;
          margin-bottom: 3rem;
          animation: ze-up 0.4s ease both;
        }
        .ze-form-inner {
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .ze-field { display: flex; flex-direction: column; gap: 0.5rem; }
        .ze-label {
          font-size: 9px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #aaa;
        }
        .ze-input, .ze-textarea {
          font-family: 'Montserrat', sans-serif;
          font-size: 12px;
          color: #111;
          background: #fafaf8;
          border: 1px solid #e8e8e8;
          padding: 10px 12px;
          outline: none;
          transition: border-color 0.2s;
          width: 100%;
          resize: vertical;
        }
        .ze-input:focus, .ze-textarea:focus { border-color: #111; }

        .ze-form-footer {
          display: flex;
          justify-content: flex-end;
        }
        .ze-submit-btn {
          font-family: 'Montserrat', sans-serif;
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          background: #111;
          color: #fff;
          border: none;
          padding: 11px 28px;
          cursor: pointer;
        }

        .ze-error {
          margin: 0 0 1rem;
          font-size: 11px;
          color: #8b3a3a;
          border-left: 2px solid #8b3a3a;
          padding-left: 1rem;
        }

        /* Records list */
        .ze-records {
          display: flex;
          flex-direction: column;
          gap: 1px;
          background: #e8e8e8;
          border: 1px solid #e8e8e8;
          animation: ze-up 0.5s ease 0.2s both;
        }
        .ze-record-card {
          background: #fff;
          padding: 1.75rem 2rem;
          transition: background 0.15s;
        }
        .ze-record-card:hover { background: #fafaf8; }

        .ze-record-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 1rem;
        }
        .ze-record-diagnosis {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          font-weight: 300;
          font-style: italic;
          color: #111;
          line-height: 1.2;
        }
        .ze-record-date {
          font-size: 10px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #bbb;
          white-space: nowrap;
          margin-left: 2rem;
          padding-top: 4px;
        }

        .ze-record-meta {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .ze-record-field {
          font-size: 11px;
          color: #555;
          letter-spacing: 0.03em;
        }
        .ze-record-field strong {
          font-size: 9px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #aaa;
          margin-right: 0.5rem;
          font-weight: 400;
        }
        .ze-record-doctor {
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #ccc;
          margin-top: 0.75rem;
          border-top: 1px solid #f0f0f0;
          padding-top: 0.75rem;
        }

        .ze-empty {
          background: #fff;
          border: 1px solid #e8e8e8;
          padding: 3rem 1.5rem;
          text-align: center;
          font-size: 11px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #ccc;
          animation: ze-up 0.5s ease 0.2s both;
        }

        @keyframes ze-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="ze-page">

        {/* Header */}
        <header className="ze-page-header">
          <div>
            <p className="ze-page-eyebrow">Clinical</p>
            <h1 className="ze-page-title">Health Records.</h1>
          </div>
          {user.role === 'DOCTOR' && selectedPatient && (
            <button className="ze-add-btn" onClick={() => setShowForm((v) => !v)}>
              <span>{showForm ? 'Dismiss' : '+ Add Record'}</span>
            </button>
          )}
        </header>

        {/* Patient selector */}
        {user.role !== 'PATIENT' && (
          <>
            <div className="ze-divider">
              <span className="ze-divider-label">Select Patient</span>
              <div className="ze-divider-line" />
            </div>
            <div className="ze-selector-panel">
              <span className="ze-selector-label">Patient</span>
              <select className="ze-select"
                value={selectedPatient}
                onChange={(e) => { setSelectedPatient(e.target.value); setShowForm(false); }}>
                <option value="">Choose a patient…</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Add record form */}
        {user.role === 'DOCTOR' && selectedPatient && showForm && (
          <>
            <div className="ze-divider">
              <span className="ze-divider-label">New Record</span>
              <div className="ze-divider-line" />
            </div>
            <div className="ze-form-panel">
              <div className="ze-form-inner">
                {error && <p className="ze-error">{error}</p>}
                <form onSubmit={addRecord} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="ze-field">
                    <label className="ze-label">Diagnosis</label>
                    <input className="ze-input" required maxLength={1000}
                      value={form.diagnosis}
                      onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />
                  </div>
                  <div className="ze-field">
                    <label className="ze-label">Prescription</label>
                    <input className="ze-input" maxLength={1000}
                      value={form.prescription}
                      onChange={(e) => setForm({ ...form, prescription: e.target.value })} />
                  </div>
                  <div className="ze-field">
                    <label className="ze-label">Notes</label>
                    <textarea className="ze-textarea" rows={4} maxLength={2000}
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                  <div className="ze-form-footer">
                    <button type="submit" className="ze-submit-btn">Save Record</button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}

        {/* Records */}
        <div className="ze-divider">
          <span className="ze-divider-label">
            {user.role === 'PATIENT' ? 'Your Medical History' : 'Patient History'}
          </span>
          <div className="ze-divider-line" />
        </div>

        {records.length === 0 ? (
          <div className="ze-empty">No records to display</div>
        ) : (
          <div className="ze-records">
            {records.map((r) => (
              <div key={r.id} className="ze-record-card">
                <div className="ze-record-top">
                  <p className="ze-record-diagnosis">{r.diagnosis}</p>
                  <p className="ze-record-date">
                    {new Date(r.visit_date).toLocaleDateString('en-AU', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="ze-record-meta">
                  {r.prescription && (
                    <p className="ze-record-field">
                      <strong>Rx</strong>{r.prescription}
                    </p>
                  )}
                  {r.notes && (
                    <p className="ze-record-field">
                      <strong>Notes</strong>{r.notes}
                    </p>
                  )}
                </div>
                <p className="ze-record-doctor">Dr. {r.doctor_name}</p>
              </div>
            ))}
          </div>
        )}

      </div>
    </>
  );
}