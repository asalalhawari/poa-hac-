import { LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Login(){
  const nav = useNavigate();
  return <div className="login-page">
    <section className="login-hero">
      <div className="hero-overlay"></div>
      <div className="hero-content">
        <div className="brand large"><ShieldCheck size={42}/><span>POA</span></div>
        <h1>Hospital-Acquired<br/>Complication Signal</h1>
        <p>Identify potential hospital-acquired complications with transparency and confidence.</p>
        <ul><li>Evidence-based scoring</li><li>22 scoring bands across 5 components</li><li>Clear audit trail</li><li>Better patient outcomes</li></ul>
      </div>
    </section>
    <section className="login-panel">
      <div className="login-box"><h2>Welcome Back</h2><p>Sign in to your POA account</p>
        <label>Email address</label><div className="input-wrap"><Mail size={17}/><input defaultValue="demo@kayan.health"/></div>
        <label>Password</label><div className="input-wrap"><LockKeyhole size={17}/><input type="password" defaultValue="password"/></div>
        <div className="login-row"><label className="check"><input type="checkbox" defaultChecked/> Remember me</label><a>Forgot password?</a></div>
        <button className="btn primary full" onClick={()=>nav('/dashboard')}>Sign In</button>
        <div className="divider"><span>or continue with</span></div>
        <button className="btn outline full">Sign in with SSO</button><button className="btn outline full">Sign in with Microsoft</button>
      </div>
    </section>
  </div>
}
