import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Claims from './pages/Claims';
import ClaimDetails from './pages/ClaimDetails';
import ScoringDetails from './pages/ScoringDetails';
import ComponentDetails from './pages/ComponentDetails';
import PatientTimeline from './pages/PatientTimeline';
import CodeReference from './pages/CodeReference';
import Analytics from './pages/Analytics';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/claims" element={<Claims />} />
        <Route path="/claims/:claimId" element={<ClaimDetails />} />
        <Route path="/claims/:claimId/scoring" element={<ScoringDetails />} />
        <Route path="/claims/:claimId/scoring/:component" element={<ComponentDetails />} />
        <Route path="/claims/:claimId/timeline" element={<PatientTimeline />} />
        <Route path="/code-reference" element={<CodeReference />} />
        <Route path="/analytics" element={<Analytics />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
