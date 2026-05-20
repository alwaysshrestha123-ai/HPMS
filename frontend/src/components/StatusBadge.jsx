import React from 'react';

const palette = {
  BOOKED:    { color: '#fff', bg: '#2563eb' },
  COMPLETED: { color: '#fff', bg: '#16a34a' },
  CANCELLED: { color: '#fff', bg: '#6b7280' },
  PENDING:   { color: '#fff', bg: '#d97706' },
  PAID:      { color: '#fff', bg: '#15803d' },
};

export default function StatusBadge({ status }) {
  const s = palette[status] || { color: '#fff', bg: '#9ca3af' };
  return (
    <span style={{
      fontSize: 9,
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      fontFamily: "'Montserrat', sans-serif",
      fontWeight: 500,
      color: s.color,
      background: s.bg,
      padding: '4px 10px',
      whiteSpace: 'nowrap',
      display: 'inline-block',
    }}>
      {status}
    </span>
  );
}