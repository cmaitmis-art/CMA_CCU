const STATUS_VARIANTS = [
  { test: (status) => status.includes('new') || (status.includes('active') && !status.includes('non')), className: 'status-pill-green' },
  { test: (status) => status.includes('open'), className: 'status-pill-blue' },
  { test: (status) => status.includes('pending'), className: 'status-pill-amber' },
  { test: (status) => status.includes('closed') || status.includes('non active') || status.includes('nonactive') || status.includes('cancel'), className: 'status-pill-red' },
];

export default function StatusPill({ status }) {
  const normalized = String(status ?? '').trim().toLowerCase();
  const variant = normalized
    ? STATUS_VARIANTS.find((entry) => entry.test(normalized))?.className || 'status-pill-blue'
    : 'status-pill-gray';

  return (
    <span className={`status-pill ${variant}`}>
      {normalized ? status : '—'}
    </span>
  );
}
