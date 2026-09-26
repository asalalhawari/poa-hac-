import { NavLink, Outlet } from 'react-router-dom';
import { Activity, BarChart3, BookOpen, FileText, LayoutDashboard, Settings, ShieldCheck, UserRoundSearch } from 'lucide-react';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/claims', label: 'Claims', icon: FileText },
  { to: '/claims/CLM-2024-001', label: 'Review Queue', icon: UserRoundSearch },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/code-reference', label: 'Code Reference', icon: BookOpen },
];

export default function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><ShieldCheck size={30}/><span>HAC Signal</span></div>
        <nav>{nav.map(({to,label,icon:Icon}) => <NavLink key={to} to={to} className={({isActive})=>isActive?'nav-item active':'nav-item'}><Icon size={18}/><span>{label}</span></NavLink>)}</nav>
        <div className="sidebar-spacer" />
        <div className="nav-item"><Settings size={18}/><span>Settings</span></div>
        <div className="user-card"><div className="avatar">JS</div><div><strong>John Smith</strong><small>Administrator</small></div></div>
      </aside>
      <main className="content"><Outlet /></main>
    </div>
  );
}
