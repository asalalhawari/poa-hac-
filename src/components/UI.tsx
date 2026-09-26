import { ReactNode } from 'react';

export function PageHeader({title, subtitle, actions}:{title:string; subtitle?:string; actions?:ReactNode}) {
  return <div className="page-header"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{actions && <div>{actions}</div>}</div>
}

export function StatCard({label,value,delta}:{label:string;value:string;delta?:string}) {
  return <div className="card stat-card"><span>{label}</span><strong>{value}</strong>{delta && <small>{delta}</small>}</div>
}

export function RiskBadge({risk}:{risk:string}) {
  const cls = risk.toLowerCase().replace(' ', '-');
  return <span className={`badge risk-${cls}`}>{risk}</span>
}

export function StatusBadge({status}:{status:string}) {
  return <span className="badge status-badge">{status}</span>
}

export function ScoreRing({score}:{score:number}) {
  return <div className="score-ring" style={{'--score': `${score * 3.6}deg`} as React.CSSProperties}><div><strong>{score}</strong><span>out of 100</span></div></div>
}
