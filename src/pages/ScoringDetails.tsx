import { ChevronRight } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader, RiskBadge } from '../components/UI';
import { scoringComponents } from '../data/mockData';

export default function ScoringDetails(){const nav=useNavigate();const {claimId}=useParams();return <><PageHeader title="HAC Signal Scoring Details" subtitle="Breakdown of all 5 components and scoring bands" actions={<div className="score-summary"><div><span>Total Score</span><strong>78</strong><small>out of 100</small></div><RiskBadge risk="High"/></div>}/><div className="component-list">{scoringComponents.map(c=><button className="component-card" key={c.key} onClick={()=>nav(`/claims/${claimId}/scoring/${c.key}`)}><span className="component-icon" style={{background:c.color}}>{c.key}</span><span className="component-copy"><strong>{c.title}</strong><small>{c.subtitle}</small></span><span className="component-score" style={{color:c.color}}>{c.score}/{c.max}</span><ChevronRight size={18}/></button>)}</div></>}
