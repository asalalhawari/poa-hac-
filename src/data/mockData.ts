export const claims = [
  { id: 'CLM-2024-001', patient: 'P-45872', admission: 'Jan 15, 2024', diagnosis: 'T84.50XA', score: 78, risk: 'High', status: 'In Review', provider: 'General Hospital' },
  { id: 'CLM-2024-002', patient: 'P-31695', admission: 'Jan 14, 2024', diagnosis: 'J95.811', score: 65, risk: 'High', status: 'New', provider: 'General Hospital' },
  { id: 'CLM-2024-003', patient: 'P-78234', admission: 'Jan 12, 2024', diagnosis: 'K91.870', score: 52, risk: 'Medium', status: 'In Review', provider: 'Regional Medical Center' },
  { id: 'CLM-2024-004', patient: 'P-90123', admission: 'Jan 10, 2024', diagnosis: 'D62', score: 28, risk: 'Low', status: 'Cleared', provider: 'City Hospital' },
  { id: 'CLM-2024-005', patient: 'P-67321', admission: 'Jan 08, 2024', diagnosis: 'T81.50XA', score: 71, risk: 'High', status: 'New', provider: 'General Hospital' },
];

export const scoringComponents = [
  { key: 'A', title: 'Cause transparency of the diagnosis', subtitle: "What the code's own descriptor admits about cause", score: 16, max: 20, color: '#3b82f6' },
  { key: 'B', title: 'New mid-stay indication', subtitle: 'Whether this diagnosis first appears after admission', score: 20, max: 20, color: '#22c55e' },
  { key: 'C', title: 'Unrelatedness to the admission indication', subtitle: 'The discriminator that separates a complication', score: 10, max: 20, color: '#f59e0b' },
  { key: 'D', title: 'Unplanned intervention triggered', subtitle: 'What it forced them to do', score: 25, max: 25, color: '#ef4444' },
  { key: 'E', title: 'Provider linkage', subtitle: 'For the complication that arrives on a later visit', score: 7, max: 15, color: '#8b5cf6' },
];

export const componentA = [
  { band: 'A1', label: 'The descriptor names a care event', points: 20 },
  { band: 'A2', label: 'The descriptor names a device or a drug', points: 16 },
  { band: 'A3', label: 'A cause-neutral stand-in for a complication code', points: 12 },
  { band: 'A4', label: 'An injury, which needs an external event', points: 10 },
  { band: 'A5', label: 'On a complication list, but silent on cause', points: 6 },
  { band: 'A6', label: 'Everything else', points: 0 },
];

export const trendData = [
  { day: 'Jan 1', total: 820, signal: 55 }, { day: 'Jan 5', total: 980, signal: 62 }, { day: 'Jan 10', total: 910, signal: 70 },
  { day: 'Jan 15', total: 1080, signal: 78 }, { day: 'Jan 20', total: 990, signal: 69 }, { day: 'Jan 25', total: 1170, signal: 85 }, { day: 'Jan 30', total: 1120, signal: 80 },
];

export const analyticsBars = [
  { name: 'A', value: 245 }, { name: 'B', value: 189 }, { name: 'C', value: 156 }, { name: 'D', value: 208 }, { name: 'E', value: 120 },
];
