import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/apiClient';
import { useAuth } from '../context/AuthContext';

const STATUS_STYLE = {
  BOOKED:    { color: '#fff', bg: '#2563eb', label: 'Booked' },
  COMPLETED: { color: '#fff', bg: '#16a34a', label: 'Completed' },
  CANCELLED: { color: '#fff', bg: '#6b7280', label: 'Cancelled' },
  PENDING:   { color: '#fff', bg: '#d97706', label: 'Pending' },
  PAID:      { color: '#fff', bg: '#15803d', label: 'Paid' },
};

/* ─────────── Small reusable bits ─────────── */

function StatCard({ label, value, sub, index = 0 }) {
  return (
    <div className="z-stat-card" style={{ animationDelay: `${index * 60}ms` }}>
      <p className="z-stat-label">{label}</p>
      <p className="z-stat-value">{value}</p>
      {sub && <p className="z-stat-sub">{sub}</p>}
    </div>
  );
}

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
    }}>
      {s.label}
    </span>
  );
}

function QuickAction({ to, label, description }) {
  return (
    <Link to={to} className="z-quick-action">
      <span className="z-quick-action-label">{label}</span>
      <span className="z-quick-action-desc">{description}</span>
      <span className="z-quick-arrow">→</span>
    </Link>
  );
}

/* ─────────── Charts (inline SVG, no deps) ─────────── */

function Sparkline({ data, width = 280, height = 70, stroke = '#111' }) {
  if (!data || data.length < 2) {
    return <div className="z-chart-empty">Insufficient data</div>;
  }
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data
    .map((v, i) => `${i * stepX},${height - ((v - min) / range) * (height - 8) - 4}`)
    .join(' ');

  // Area fill path
  const areaPath = `M0,${height} L${points.replace(/,/g, ' ').split(' ').reduce((acc, _, i, arr) => {
    if (i % 2 === 0) return acc + arr[i] + ',' + arr[i + 1] + ' L';
    return acc;
  }, '')} ${width},${height} Z`.replace(/L\s*$/, '');

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="z-spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.12" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill="url(#z-spark-grad)"
      />
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {data.map((v, i) => (
        <circle
          key={i}
          cx={i * stepX}
          cy={height - ((v - min) / range) * (height - 8) - 4}
          r={i === data.length - 1 ? 3 : 0}
          fill={stroke}
        />
      ))}
    </svg>
  );
}

function StatusBarChart({ data }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) {
    return <p className="z-chart-empty">No appointments to analyse</p>;
  }
  return (
    <div className="z-bars">
      {data.map((d) => {
        const pct = total ? (d.count / total) * 100 : 0;
        return (
          <div key={d.status} className="z-bar-row">
            <span className="z-bar-label">{STATUS_STYLE[d.status]?.label || d.status}</span>
            <div className="z-bar-track">
              <div
                className="z-bar-fill"
                style={{
                  width: `${pct}%`,
                  background: STATUS_STYLE[d.status]?.bg || '#999',
                }}
              />
            </div>
            <span className="z-bar-count">{d.count}</span>
            <span className="z-bar-pct">{pct.toFixed(0)}%</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────── Main component ─────────── */

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats]             = useState(null);
  const [upcoming, setUpcoming]       = useState([]);
  const [allAppts, setAllAppts]       = useState([]);
  const [bills, setBills]             = useState([]);

  useEffect(() => {
    if (!user) return;

    // Everyone: pull appointments
    api.get('/appointments').then((r) => {
      setAllAppts(r.data);
      setUpcoming(r.data.slice(0, 5));
    }).catch(() => {});

    // Admin gets extra data
    if (user.role === 'ADMIN') {
      api.get('/reports/dashboard').then((r) => setStats(r.data)).catch(() => {});
      api.get('/billing').then((r) => setBills(r.data)).catch(() => {});
    }
  }, [user]);

  /* ─── Derived analytics (client-side) ─── */

  // Last 7 days revenue from paid bills
  const revenueTrend = useMemo(() => {
    if (user?.role !== 'ADMIN') return [];
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push({ date: d, total: 0 });
    }
    bills.forEach((b) => {
      if (b.status !== 'PAID') return;
      const paidDate = new Date(b.paid_date || b.issued_date);
      paidDate.setHours(0, 0, 0, 0);
      const slot = days.find((d) => d.date.getTime() === paidDate.getTime());
      if (slot) slot.total += Number(b.amount);
    });
    return days;
  }, [bills, user]);

  const revenue7d = revenueTrend.reduce((sum, d) => sum + d.total, 0);

  // Appointment status counts
  const statusBreakdown = useMemo(() => {
    const counts = { BOOKED: 0, COMPLETED: 0, CANCELLED: 0 };
    allAppts.forEach((a) => {
      counts[a.status] = (counts[a.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [allAppts]);

  // Activity feed: combine recent appointments + recent bills, sorted by time
  const activityFeed = useMemo(() => {
    if (user?.role !== 'ADMIN') return [];
    const items = [];
    allAppts.slice(0, 8).forEach((a) => {
      items.push({
        type: 'appt',
        time: new Date(a.appointment_dt),
        text: `${a.patient_name || 'Patient'} booked with Dr. ${a.doctor_name || '—'}`,
        meta: a.status,
        id: `a-${a.id}`,
      });
    });
    bills.slice(0, 8).forEach((b) => {
      items.push({
        type: 'bill',
        time: new Date(b.issued_date),
        text: `Invoice $${Number(b.amount).toFixed(2)} — ${b.patient_name || 'patient'}`,
        meta: b.status,
        id: `b-${b.id}`,
      });
    });
    return items.sort((a, b) => b.time - a.time).slice(0, 6);
  }, [allAppts, bills, user]);

  if (!user) return null;

  const firstName = user.full_name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const quickActions = {
    ADMIN: [
      { to: '/appointments', label: 'Appointments', description: 'Manage all bookings' },
      { to: '/billing',      label: 'Billing',      description: 'Invoices & revenue' },
      { to: '/staff',        label: 'Staff',        description: 'Doctors & nurses' },
      { to: '/ehr',          label: 'EHR',          description: 'Patient records' },
    ],
    DOCTOR: [
      { to: '/appointments', label: 'My Schedule',  description: 'Upcoming appointments' },
      { to: '/ehr',          label: 'Patient EHR',  description: 'Electronic health records' },
    ],
    NURSE: [
      { to: '/ehr',     label: 'Patient Records', description: 'View & update records' },
      { to: '/billing', label: 'Billing',          description: 'Check billing status' },
    ],
    PATIENT: [
      { to: '/appointments', label: 'Book Appointment', description: 'Schedule a visit' },
      { to: '/ehr',          label: 'My Records',       description: 'Health history' },
      { to: '/billing',      label: 'My Bills',         description: 'View & pay invoices' },
    ],
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Montserrat:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        .z-dashboard {
          font-family: 'Montserrat', sans-serif;
          background: #fafaf8;
          min-height: calc(100vh - 56px);
          padding: 3.5rem 4rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        @media (max-width: 900px) { .z-dashboard { padding: 2rem 1.5rem; } }

        /* ── Header ── */
        .z-dash-header { margin-bottom: 3rem; animation: z-up 0.5s ease forwards; }
        .z-dash-greeting {
          font-size: 10px; letter-spacing: 0.3em;
          text-transform: uppercase; color: #bbb; margin-bottom: 0.5rem;
        }
        .z-dash-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 40px; font-weight: 300; font-style: italic;
          color: #111; line-height: 1.1;
        }
        .z-dash-role {
          font-size: 10px; letter-spacing: 0.2em;
          text-transform: uppercase; color: #bbb; margin-top: 0.5rem;
        }

        /* ── Divider ── */
        .z-section-divider {
          display: flex; align-items: center; gap: 1.5rem; margin-bottom: 1.5rem;
        }
        .z-section-label {
          font-size: 10px; letter-spacing: 0.25em;
          text-transform: uppercase; color: #999; white-space: nowrap;
        }
        .z-section-line { flex: 1; height: 1px; background: #e8e8e8; }

        /* ── Stat Cards (now 6) ── */
        .z-stats-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 1px;
          background: #e8e8e8;
          border: 1px solid #e8e8e8;
          margin-bottom: 3rem;
          animation: z-up 0.5s ease 0.1s both;
        }
        @media (max-width: 1100px) { .z-stats-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 600px)  { .z-stats-grid { grid-template-columns: repeat(2, 1fr); } }

        .z-stat-card {
          background: #fff;
          padding: 1.5rem 1.25rem;
          animation: z-up 0.5s ease both;
        }
        .z-stat-label {
          font-size: 9px; letter-spacing: 0.25em;
          text-transform: uppercase; color: #aaa; margin-bottom: 0.6rem;
        }
        .z-stat-value {
          font-family: 'Cormorant Garamond', serif;
          font-size: 32px; font-weight: 300;
          color: #111; line-height: 1;
        }
        .z-stat-sub {
          font-size: 10px; color: #bbb;
          letter-spacing: 0.05em; margin-top: 0.5rem;
        }

        /* ── Analytics panels (revenue + status) ── */
        .z-analytics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1px;
          background: #e8e8e8;
          border: 1px solid #e8e8e8;
          margin-bottom: 3rem;
          animation: z-up 0.5s ease 0.15s both;
        }
        @media (max-width: 900px) { .z-analytics-grid { grid-template-columns: 1fr; } }

        .z-panel {
          background: #fff;
          padding: 1.75rem 1.5rem;
        }
        .z-panel-head {
          display: flex; align-items: baseline; justify-content: space-between;
          margin-bottom: 1.25rem;
        }
        .z-panel-eyebrow {
          font-size: 9px; letter-spacing: 0.25em;
          text-transform: uppercase; color: #aaa;
        }
        .z-panel-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 26px; font-weight: 300; font-style: italic;
          color: #111; line-height: 1; margin-top: 4px;
        }
        .z-panel-meta {
          font-size: 10px; color: #bbb;
          letter-spacing: 0.1em; text-transform: uppercase;
        }

        .z-chart-empty {
          padding: 2rem 0; text-align: center;
          font-size: 10px; letter-spacing: 0.15em;
          text-transform: uppercase; color: #ccc;
        }

        /* ── Bar chart ── */
        .z-bars { display: flex; flex-direction: column; gap: 0.875rem; }
        .z-bar-row {
          display: grid;
          grid-template-columns: 80px 1fr 40px 40px;
          align-items: center;
          gap: 12px;
        }
        .z-bar-label {
          font-size: 10px; letter-spacing: 0.15em;
          text-transform: uppercase; color: #666;
        }
        .z-bar-track {
          height: 6px; background: #f3f3f0; overflow: hidden;
        }
        .z-bar-fill {
          height: 100%;
          transition: width 0.6s cubic-bezier(0.65, 0, 0.35, 1);
        }
        .z-bar-count {
          font-family: 'Cormorant Garamond', serif;
          font-size: 16px; color: #111;
        }
        .z-bar-pct {
          font-size: 10px; color: #bbb;
          letter-spacing: 0.05em; text-align: right;
        }

        /* ── Activity feed ── */
        .z-feed-panel {
          background: #fff;
          border: 1px solid #e8e8e8;
          margin-bottom: 3rem;
          animation: z-up 0.5s ease 0.2s both;
        }
        .z-feed-item {
          display: grid;
          grid-template-columns: auto 1fr auto auto;
          gap: 1rem;
          align-items: center;
          padding: 0.875rem 1.5rem;
          border-bottom: 1px solid #f0f0f0;
        }
        .z-feed-item:last-child { border-bottom: none; }
        .z-feed-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #ddd;
        }
        .z-feed-dot--appt { background: #2563eb; }
        .z-feed-dot--bill { background: #15803d; }
        .z-feed-text { font-size: 12px; color: #333; letter-spacing: 0.02em; }
        .z-feed-time {
          font-size: 10px; color: #bbb;
          letter-spacing: 0.05em; white-space: nowrap;
        }

        /* ── Quick Actions ── */
        .z-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1px;
          background: #e8e8e8;
          border: 1px solid #e8e8e8;
          margin-bottom: 3rem;
          animation: z-up 0.5s ease 0.25s both;
        }
        .z-quick-action {
          background: #fff; padding: 1.5rem;
          text-decoration: none;
          display: flex; flex-direction: column; gap: 4px;
          position: relative; transition: background 0.25s; overflow: hidden;
        }
        .z-quick-action::after {
          content: ''; position: absolute; inset: 0;
          background: #111;
          transform: scaleY(0); transform-origin: bottom;
          transition: transform 0.3s cubic-bezier(0.77,0,0.18,1);
          z-index: 0;
        }
        .z-quick-action:hover::after { transform: scaleY(1); }
        .z-quick-action:hover .z-quick-action-label,
        .z-quick-action:hover .z-quick-action-desc,
        .z-quick-action:hover .z-quick-arrow { color: #fff; }
        .z-quick-action > * { position: relative; z-index: 1; transition: color 0.3s; }
        .z-quick-action-label {
          font-size: 10px; letter-spacing: 0.2em;
          text-transform: uppercase; color: #111;
        }
        .z-quick-action-desc {
          font-size: 11px; color: #999; font-weight: 300; margin-top: 2px;
        }
        .z-quick-arrow { font-size: 16px; color: #ccc; margin-top: 0.75rem; }

        /* ── Appointments Table ── */
        .z-appts-panel {
          background: #fff; border: 1px solid #e8e8e8;
          animation: z-up 0.5s ease 0.3s both;
        }
        .z-appts-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.25rem 1.5rem; border-bottom: 1px solid #e8e8e8;
        }
        .z-appts-title {
          font-size: 10px; letter-spacing: 0.25em;
          text-transform: uppercase; color: #111;
        }
        .z-appts-view-all {
          font-size: 10px; letter-spacing: 0.15em;
          text-transform: uppercase; color: #999; text-decoration: none;
          border-bottom: 1px solid #ddd;
          transition: color 0.2s, border-color 0.2s;
        }
        .z-appts-view-all:hover { color: #111; border-color: #111; }

        .z-appt-row {
          display: grid;
          grid-template-columns: 1fr 1.5fr 1fr auto;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #f0f0f0;
          gap: 1rem;
          transition: background 0.15s;
        }
        .z-appt-row:last-child { border-bottom: none; }
        .z-appt-row:hover { background: #fafaf8; }

        .z-appt-name { font-size: 13px; font-weight: 400; color: #111; letter-spacing: 0.02em; }
        .z-appt-reason { font-size: 11px; color: #bbb; letter-spacing: 0.03em; }
        .z-appt-date { font-size: 11px; color: #555; letter-spacing: 0.03em; }
        .z-appt-empty {
          padding: 3rem 1.5rem; text-align: center;
          font-size: 11px; letter-spacing: 0.1em;
          text-transform: uppercase; color: #bbb;
        }

        /* ── Admin Extra ── */
        .z-admin-banner {
          display: flex; align-items: center; justify-content: space-between;
          background: #111; color: #fff;
          padding: 1rem 1.5rem; margin-bottom: 3rem;
          animation: z-up 0.4s ease both;
        }
        .z-admin-banner-text {
          font-size: 10px; letter-spacing: 0.2em;
          text-transform: uppercase; opacity: 0.6;
        }
        .z-admin-banner-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px; font-weight: 300; font-style: italic;
          letter-spacing: 0.05em;
        }

        @keyframes z-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="z-dashboard">

        {/* Header */}
        <header className="z-dash-header">
          <p className="z-dash-greeting">{greeting}</p>
          <h1 className="z-dash-title">{firstName}.</h1>
          <p className="z-dash-role">Signed in as {user.role} &nbsp;·&nbsp; {user.email}</p>
        </header>

        {/* Admin banner */}
        {user.role === 'ADMIN' && (
          <div className="z-admin-banner">
            <div>
              <p className="z-admin-banner-text">Administrator Access</p>
              <p className="z-admin-banner-title">System Overview</p>
            </div>
            <span style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.4 }}>
              {new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        )}

        {/* Admin stats — expanded to 6 cards */}
        {user.role === 'ADMIN' && stats && (
          <>
            <div className="z-section-divider">
              <span className="z-section-label">Statistics</span>
              <div className="z-section-line" />
            </div>
            <div className="z-stats-grid">
              <StatCard index={0} label="Patients"     value={stats.totalPatients ?? '—'} />
              <StatCard index={1} label="Doctors"      value={stats.totalDoctors ?? '—'} />
              <StatCard index={2} label="Nurses"       value={stats.totalNurses ?? '—'} />
              <StatCard index={3} label="Today"        value={stats.appointmentsToday ?? '—'}
                sub="appointments" />
              <StatCard index={4} label="Revenue"
                value={`$${Number(stats.totalRevenue ?? 0).toFixed(0)}`}
                sub="all-time" />
              <StatCard index={5} label="Pending"      value={stats.pendingBills ?? '—'}
                sub="invoices" />
            </div>
          </>
        )}

        {/* Admin analytics — revenue trend + status breakdown */}
        {user.role === 'ADMIN' && (
          <>
            <div className="z-section-divider">
              <span className="z-section-label">Analytics</span>
              <div className="z-section-line" />
            </div>
            <div className="z-analytics-grid">
              <div className="z-panel">
                <div className="z-panel-head">
                  <div>
                    <p className="z-panel-eyebrow">Revenue</p>
                    <p className="z-panel-title">${revenue7d.toFixed(0)}</p>
                  </div>
                  <span className="z-panel-meta">Last 7 days</span>
                </div>
                <Sparkline data={revenueTrend.map((d) => d.total)} />
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  marginTop: '0.5rem', fontSize: 9, color: '#ccc',
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>
                  <span>{revenueTrend[0]?.date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
                  <span>Today</span>
                </div>
              </div>

              <div className="z-panel">
                <div className="z-panel-head">
                  <div>
                    <p className="z-panel-eyebrow">Appointments</p>
                    <p className="z-panel-title">{allAppts.length}</p>
                  </div>
                  <span className="z-panel-meta">By status</span>
                </div>
                <StatusBarChart data={statusBreakdown} />
              </div>
            </div>
          </>
        )}

        {/* Activity feed — admin only */}
        {user.role === 'ADMIN' && activityFeed.length > 0 && (
          <>
            <div className="z-section-divider">
              <span className="z-section-label">Recent Activity</span>
              <div className="z-section-line" />
            </div>
            <div className="z-feed-panel">
              {activityFeed.map((item) => (
                <div key={item.id} className="z-feed-item">
                  <span className={`z-feed-dot z-feed-dot--${item.type}`} />
                  <span className="z-feed-text">{item.text}</span>
                  <StatusBadge status={item.meta} />
                  <span className="z-feed-time">
                    {item.time.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Quick actions */}
        {quickActions[user.role] && (
          <>
            <div className="z-section-divider">
              <span className="z-section-label">Quick Access</span>
              <div className="z-section-line" />
            </div>
            <div className="z-actions-grid">
              {quickActions[user.role].map((a) => (
                <QuickAction key={a.to} {...a} />
              ))}
            </div>
          </>
        )}

        {/* Recent appointments table */}
        <div className="z-section-divider">
          <span className="z-section-label">
            {user.role === 'DOCTOR' ? 'Upcoming Patients' : 'Recent Appointments'}
          </span>
          <div className="z-section-line" />
        </div>

        <div className="z-appts-panel">
          <div className="z-appts-header">
            <span className="z-appts-title">
              {user.role === 'DOCTOR' ? 'Upcoming Patients' : 'Recent Appointments'}
            </span>
            <Link to="/appointments" className="z-appts-view-all">View all</Link>
          </div>

          {upcoming.length === 0 ? (
            <p className="z-appt-empty">No appointments yet</p>
          ) : (
            upcoming.map((a) => (
              <div key={a.id} className="z-appt-row">
                <p className="z-appt-name">
                  {user.role === 'PATIENT'
                    ? (a.doctor_name ? `Dr. ${a.doctor_name}` : '—')
                    : (a.patient_name || '—')}
                </p>
                <p className="z-appt-reason">{a.reason || '—'}</p>
                <p className="z-appt-date">
                  {new Date(a.appointment_dt).toLocaleString('en-AU', {
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
                <StatusBadge status={a.status} />
              </div>
            ))
          )}
        </div>

      </div>
    </>
  );
}