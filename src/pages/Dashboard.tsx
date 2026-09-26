import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts';
import { CalendarDays } from 'lucide-react';
import { PageHeader, StatCard } from '../components/UI';
import { trendData } from '../data/mockData';

export default function Dashboard(){
  const pie=[{name:'High',value:28},{name:'Medium',value:45},{name:'Low',value:27}];
  return <>
    <PageHeader title="Dashboard" subtitle="Overview of hospital-acquired complication signals" actions={<button className="btn outline"><CalendarDays size={16}/> Last 30 days</button>}/>
    <div className="stats-grid"><StatCard label="Total Claims" value="2,847" delta="+12% vs previous period"/><StatCard label="HAC Signals" value="342" delta="+9% vs previous period"/><StatCard label="Review Queue" value="128" delta="-18% vs previous period"/><StatCard label="Confirmed HAC" value="96" delta="+24% vs previous period"/></div>
    <div className="dashboard-grid">
      <div className="card chart-card"><div className="card-title"><h3>HAC Signals Trend</h3><span>Last 30 days</span></div><ResponsiveContainer width="100%" height={280}><LineChart data={trendData}><XAxis dataKey="day"/><YAxis/><Tooltip/><Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={3} dot={false}/><Line type="monotone" dataKey="signal" stroke="#ef4444" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></div>
      <div className="card chart-card"><div className="card-title"><h3>Signals by Risk Level</h3></div><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={pie} dataKey="value" innerRadius={62} outerRadius={82} paddingAngle={3}>{['#ef4444','#f59e0b','#22c55e'].map(c=><Cell key={c} fill={c}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer><div className="donut-total"><strong>342</strong><span>Total Signals</span></div><div className="legend-row"><span>High 28%</span><span>Medium 45%</span><span>Low 27%</span></div></div>
    </div>
  </>
}
