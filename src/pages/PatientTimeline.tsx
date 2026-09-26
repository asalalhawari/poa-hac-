import { Activity, Stethoscope, Syringe, TriangleAlert } from 'lucide-react';
import { PageHeader } from '../components/UI';

const events=[
  {date:'Jan 15, 2024',time:'10:30',title:'Admission',desc:'Primary diagnosis: M16.11 — Unilateral primary osteoarthritis, right hip',icon:Stethoscope,cls:'blue'},
  {date:'Jan 16, 2024',time:'14:20',title:'Procedure',desc:'0SR902Z — Replacement of right hip joint with synthetic substitute',icon:Syringe,cls:'green'},
  {date:'Jan 18, 2024',time:'09:15',title:'Diagnosis (POA)',desc:'M16.11 — Unilateral primary osteoarthritis, right hip',icon:Activity,cls:'amber'},
  {date:'Jan 20, 2024',time:'11:30',title:'Diagnosis (HAC Signal)',desc:'T84.50XA — Infection and inflammatory reaction due to internal joint prosthesis',icon:TriangleAlert,cls:'red'},
  {date:'Jan 21, 2024',time:'16:45',title:'Procedure (Unplanned)',desc:'0SP902Z — Revision of right hip joint',icon:Syringe,cls:'purple'}
];
export default function PatientTimeline(){return <><PageHeader title="Patient Timeline" subtitle="Chronological view of diagnoses, procedures, and key events"/><div className="timeline-layout"><div className="card timeline-card">{events.map(({date,time,title,desc,icon:Icon,cls},i)=><div className="timeline-item" key={i}><div className="timeline-date"><strong>{date}</strong><span>{time}</span></div><div className={`timeline-icon ${cls}`}><Icon size={17}/></div><div><h4>{title}</h4><p>{desc}</p></div></div>)}</div><div className="card insight-card"><h3>Key Insights</h3><ul><li>HAC diagnosis appears 4 days after admission (B1: 20 pts)</li><li>Unplanned intervention triggered (D1: 25 pts)</li><li>Device-related diagnosis (A2: 16 pts)</li><li>No direct relationship to admission (C1/C2 review required)</li></ul></div></div></>}
