import { CalendarDays, Filter, MoreHorizontal, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, RiskBadge, StatusBadge } from '../components/UI';
import { claims } from '../data/mockData';

export default function Claims(){
  const nav=useNavigate();
  return <><PageHeader title="Claims" subtitle="View and analyze claims with HAC signals" actions={<button className="btn primary"><Plus size={16}/> Upload Claims</button>}/>
    <div className="tabs"><button className="tab active">All Claims (2,847)</button><button className="tab">HAC Signals (342)</button><button className="tab">In Review (128)</button><button className="tab">Confirmed (96)</button></div>
    <div className="toolbar"><div className="search"><Search size={17}/><input placeholder="Search by patient ID, claim number, diagnosis code..."/></div><button className="btn outline"><CalendarDays size={16}/>Date Range</button><button className="btn outline">Risk Level</button><button className="btn outline"><Filter size={16}/>Filters</button></div>
    <div className="card table-card"><table><thead><tr><th>Claim #</th><th>Patient</th><th>Admission Date</th><th>Diagnosis Code</th><th>HAC Score</th><th>Risk Level</th><th>Status</th><th>Actions</th></tr></thead><tbody>{claims.map(c=><tr key={c.id} onClick={()=>nav(`/claims/${c.id}`)}><td className="link-cell">{c.id}</td><td>{c.patient}</td><td>{c.admission}</td><td>{c.diagnosis}</td><td><span className="score-pill">{c.score}</span></td><td><RiskBadge risk={c.risk}/></td><td><StatusBadge status={c.status}/></td><td><button className="icon-btn"><MoreHorizontal size={17}/></button></td></tr>)}</tbody></table><div className="table-footer"><span>Showing 1–5 of 2,847 claims</span><div className="pager"><button>‹</button><button className="active">1</button><button>2</button><button>3</button><button>4</button><button>5</button><button>›</button></div></div></div>
  </>
}
