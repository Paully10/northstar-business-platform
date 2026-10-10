import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Activity, ArrowUpRight, Check, CheckCheck, ChevronRight, CircleHelp, Command, FolderKanban, LayoutDashboard, LogOut, Plus, ShieldCheck, Sparkles, X } from 'lucide-react'
import { Dashboard, Project, WorkItem, request } from './api'

const emptyStats:Dashboard = { projects:0, work_items:0, completed_items:0 }
type AuthMode = 'login' | 'register'

export default function App() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('northstar_token'))
  const [authMode, setAuthMode] = useState<AuthMode>('register')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [items, setItems] = useState<WorkItem[]>([])
  const [stats, setStats] = useState<Dashboard>(emptyStats)
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [itemTitle, setItemTitle] = useState('')
  const [itemDescription, setItemDescription] = useState('')
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [showItemForm, setShowItemForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const signOut = useCallback(() => { sessionStorage.removeItem('northstar_token'); setToken(null); setProjects([]); setItems([]); setSelected(null); setStats(emptyStats) }, [])

  const loadWorkspace = useCallback(async (activeToken:string) => {
    try {
      const [p, s] = await Promise.all([request<Project[]>('/api/v1/projects', activeToken), request<Dashboard>('/api/v1/dashboard', activeToken)])
      setProjects(p); setStats(s)
      setSelected(current => current && p.some(x => x.id === current) ? current : (p[0]?.id ?? null))
    } catch (e) {
      if (e instanceof Error && /token|auth/i.test(e.message)) signOut()
      setError(e instanceof Error ? e.message : 'Could not load workspace')
    }
  }, [signOut])

  useEffect(() => { if (token) void loadWorkspace(token) }, [token, loadWorkspace])
  useEffect(() => {
    if (!token || selected === null) { setItems([]); return }
    let cancelled = false
    request<WorkItem[]>(`/api/v1/projects/${selected}/work-items`, token).then(data => { if (!cancelled) setItems(data) }).catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load tasks') })
    return () => { cancelled = true }
  }, [token, selected])

  async function authenticate(e:FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      const payload = authMode === 'register' ? { email, full_name:fullName, password } : { email, password }
      const result = await request<{access_token:string}>(`/api/v1/auth/${authMode}`, null, { method:'POST', body:JSON.stringify(payload) })
      sessionStorage.setItem('northstar_token', result.access_token); setToken(result.access_token); setNotice('Workspace ready.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Authentication failed') }
    finally { setBusy(false) }
  }

  async function createProject(e:FormEvent) {
    e.preventDefault(); if (!token) return
    setBusy(true); setError('')
    try {
      const project = await request<Project>('/api/v1/projects', token, { method:'POST', body:JSON.stringify({ name:projectName, description:projectDescription }) })
      setProjects(old => [project, ...old]); setSelected(project.id); setProjectName(''); setProjectDescription(''); setShowProjectForm(false); setNotice('Project created.'); await loadWorkspace(token)
    } catch(e) { setError(e instanceof Error ? e.message : 'Could not create project') }
    finally { setBusy(false) }
  }

  async function createItem(e:FormEvent) {
    e.preventDefault(); if (!token || selected === null) return
    setBusy(true); setError('')
    try {
      const item = await request<WorkItem>(`/api/v1/projects/${selected}/work-items`, token, { method:'POST', body:JSON.stringify({ title:itemTitle, description:itemDescription }) })
      setItems(old => [item, ...old]); setItemTitle(''); setItemDescription(''); setShowItemForm(false); setNotice('Task added.'); await loadWorkspace(token)
    } catch(e) { setError(e instanceof Error ? e.message : 'Could not add task') }
    finally { setBusy(false) }
  }

  async function toggleItem(item:WorkItem) {
    if (!token) return
    try { const updated = await request<WorkItem>(`/api/v1/work-items/${item.id}/complete`, token, { method:'PATCH' }); setItems(old => old.map(x => x.id === item.id ? updated : x)); await loadWorkspace(token) }
    catch(e) { setError(e instanceof Error ? e.message : 'Could not update task') }
  }

  if (!token) return <div className="auth-shell"><div className="auth-brand"><div className="brand-mark"><Command size={22}/></div><span>NORTHSTAR</span><span className="brand-caption">BUSINESS OPERATIONS</span></div><div className="auth-card"><div className="eyebrow"><Sparkles size={14}/> YOUR WORKSPACE, IN FOCUS</div><h1>{authMode === 'register' ? 'Build with clarity.' : 'Welcome back.'}</h1><p className="muted">A calm, focused space to coordinate projects and move work forward.</p><form onSubmit={authenticate} className="stack-form">{authMode === 'register' && <label>Full name<input autoComplete="name" value={fullName} onChange={e=>setFullName(e.target.value)} minLength={2} maxLength={120} required placeholder="Your name"/></label>}<label>Work email<input autoComplete="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@company.com"/></label><label>Password<input autoComplete={authMode==='register'?'new-password':'current-password'} type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={authMode==='register'?10:1} maxLength={128} required placeholder={authMode==='register'?'At least 10 characters':'Your password'}/></label>{error && <div className="alert error">{error}</div>}<button className="primary full" disabled={busy}>{busy?'Please wait…':authMode==='register'?'Create workspace':'Sign in'} <ArrowUpRight size={16}/></button></form><p className="auth-switch">{authMode==='register'?'Already have an account?':'New to Northstar?'} <button className="text-button" onClick={()=>{setAuthMode(authMode==='register'?'login':'register');setError('')}}>{authMode==='register'?'Sign in':'Create an account'}</button></p><div className="security-note"><ShieldCheck size={15}/> Your workspace is private to your account.</div></div><p className="auth-footer">NORTHSTAR · EARLY ACCESS FOUNDATION</p></div>

  return <div className="app-shell"><aside className="sidebar"><div className="side-brand"><div className="brand-mark"><Command size={20}/></div><div><strong>NORTHSTAR</strong><span>WORKSPACE</span></div></div><div className="workspace-switch"><div className="workspace-avatar">N</div><div className="workspace-meta"><strong>My workspace</strong><span>Personal account</span></div><ChevronRight size={15}/></div><div className="nav-label">WORKSPACE</div><button className="nav-item active"><LayoutDashboard size={17}/> Overview</button><button className="nav-item" onClick={()=>setShowProjectForm(true)}><FolderKanban size={17}/> Projects <span className="nav-count">{projects.length}</span></button><div className="nav-label project-nav-label">YOUR PROJECTS <button aria-label="Add project" onClick={()=>setShowProjectForm(true)}><Plus size={15}/></button></div><div className="project-nav">{projects.map(p=><button key={p.id} className={`project-nav-item ${selected===p.id?'selected':''}`} onClick={()=>setSelected(p.id)}><span className="project-dot"/>{p.name}</button>)}{projects.length===0 && <p className="empty-nav">Your projects will appear here.</p>}</div><div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={17}/></div><strong>Need a hand?</strong><p>Your workspace is just getting started. Keep your next action small and clear.</p></div><button className="nav-item signout" onClick={signOut}><LogOut size={17}/> Sign out</button><div className="user-row"><div className="user-avatar">{email.slice(0,1).toUpperCase()}</div><div className="user-details"><strong>{email}</strong><span>Workspace member</span></div><div className="online-dot"/></div></div></aside>

  <main className="main-content"><header className="topbar"><div className="breadcrumb">Workspace <ChevronRight size={14}/> <strong>Overview</strong></div><div className="topbar-right"><span className="system-status"><span className="status-dot"/> All systems ready</span><div className="top-avatar">{email.slice(0,1).toUpperCase()}</div></div></header><div className="page-wrap"><div className="page-heading"><div><div className="eyebrow">SATURDAY, OCTOBER 10, 2026</div><h1>Good work starts here<span>.</span></h1><p>Keep your priorities visible. Turn plans into progress.</p></div><button className="primary" onClick={()=>setShowProjectForm(true)}><Plus size={17}/> New project</button></div>{error && <div className="alert error global-alert">{error}<button onClick={()=>setError('')} aria-label="Dismiss error"><X size={15}/></button></div>}{notice && <div className="alert success global-alert">{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss notice"><X size={15}/></button></div>}

  <section className="stats-grid"><StatCard label="ACTIVE PROJECTS" value={stats.projects} note="Your current initiatives" icon={<FolderKanban size={18}/>} tone="violet"/><StatCard label="TOTAL TASKS" value={stats.work_items} note="Across all projects" icon={<Activity size={18}/>} tone="blue"/><StatCard label="COMPLETED TASKS" value={stats.completed_items} note={stats.work_items ? `${Math.round(stats.completed_items/stats.work_items*100)}% of all tasks`:'Ready when you are'} icon={<CheckCheck size={18}/>} tone="green"/><div className="focus-card"><div className="focus-top"><span>YOUR MOMENTUM</span><Sparkles size={17}/></div><div className="focus-value">{stats.work_items ? Math.round(stats.completed_items/stats.work_items*100):0}<span>%</span></div><div className="momentum-track"><span style={{width:`${stats.work_items ? stats.completed_items/stats.work_items*100:0}%`}}/></div><p>Progress is built one finished task at a time.</p></div></section>

  <section className="content-grid"><div className="panel projects-panel"><div className="panel-heading"><div><div className="section-kicker">YOUR PORTFOLIO</div><h2>Projects <span className="pill-count">{projects.length}</span></h2></div><button className="icon-button" onClick={()=>setShowProjectForm(true)} aria-label="Create project"><Plus size={18}/></button></div>{projects.length===0 ? <div className="empty-state"><div className="empty-illustration"><FolderKanban size={27}/></div><h3>Your next big thing starts here.</h3><p>Create a project to organize the work that matters.</p><button className="secondary" onClick={()=>setShowProjectForm(true)}><Plus size={16}/> Create first project</button></div> : <div className="project-list">{projects.map(p=>{const count=items.filter(i=>i.project_id===p.id).length;return <button key={p.id} className={`project-card ${selected===p.id?'chosen':''}`} onClick={()=>setSelected(p.id)}><div className="project-symbol">{p.name.slice(0,1).toUpperCase()}</div><div className="project-info"><strong>{p.name}</strong><span>{p.description || 'No description yet'}</span><small><span className="project-dot"/> Active project</small></div><div className="project-card-end"><span>{selected===p.id?`${items.length} tasks`:count+' tasks'}</span><ChevronRight size={16}/></div></button>})}</div>}</div>

  <div className="panel tasks-panel"><div className="panel-heading"><div><div className="section-kicker">MAKE IT HAPPEN</div><h2>{projects.find(p=>p.id===selected)?.name || 'Your task list'}</h2></div><button className="icon-button" onClick={()=>selected?setShowItemForm(true):setShowProjectForm(true)} aria-label="Add task"><Plus size={18}/></button></div>{selected===null ? <div className="empty-state compact"><div className="empty-illustration"><CheckCheck size={26}/></div><h3>One step at a time.</h3><p>Choose or create a project to start tracking tasks.</p></div> : <><div className="task-summary"><span>{items.filter(i=>!i.is_done).length} open</span><span>{items.filter(i=>i.is_done).length} completed</span></div><div className="task-list">{items.map(item=><div key={item.id} className={`task-row ${item.is_done?'is-done':''}`}><button className={`task-check ${item.is_done?'checked':''}`} onClick={()=>void toggleItem(item)} aria-label={item.is_done?'Mark incomplete':'Mark complete'}>{item.is_done&&<Check size={13}/>}</button><div className="task-copy"><strong>{item.title}</strong>{item.description&&<span>{item.description}</span>}</div><span className={`task-status ${item.is_done?'done':''}`}>{item.is_done?'Done':'To do'}</span></div>)}{items.length===0&&<div className="empty-state compact"><div className="empty-illustration"><Check size={26}/></div><h3>A clean slate.</h3><p>Add the first task for this project.</p></div>}</div><button className="add-task-button" onClick={()=>setShowItemForm(true)}><Plus size={16}/> Add a task</button></>}</div></section>

  <section className="bottom-banner"><div className="banner-symbol"><Sparkles size={20}/></div><div><strong>Clarity creates momentum.</strong><p>Pick the most meaningful next step, then give it your attention.</p></div><div className="banner-decoration">N<span>.</span></div></section><footer className="page-footer"><span>© 2026 NORTHSTAR WORKSPACE</span><span><span className="status-dot"/> CONNECTED TO YOUR WORKSPACE</span></footer></div></main>

  {showProjectForm&&<Modal title="Create a project" subtitle="Give this initiative a clear name and purpose." onClose={()=>setShowProjectForm(false)}><form className="stack-form" onSubmit={createProject}><label>Project name<input autoFocus value={projectName} onChange={e=>setProjectName(e.target.value)} minLength={2} maxLength={140} required placeholder="e.g. Website launch"/></label><label>Description <span className="optional">OPTIONAL</span><textarea value={projectDescription} onChange={e=>setProjectDescription(e.target.value)} maxLength={4000} rows={3} placeholder="What does success look like?"/></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowProjectForm(false)}>Cancel</button><button className="primary" disabled={busy}>{busy?'Creating…':'Create project'} <ArrowUpRight size={15}/></button></div></form></Modal>}
  {showItemForm&&<Modal title="Add a task" subtitle="Define one clear action to move this project forward." onClose={()=>setShowItemForm(false)}><form className="stack-form" onSubmit={createItem}><label>Task title<input autoFocus value={itemTitle} onChange={e=>setItemTitle(e.target.value)} minLength={2} maxLength={180} required placeholder="e.g. Draft the project brief"/></label><label>Details <span className="optional">OPTIONAL</span><textarea value={itemDescription} onChange={e=>setItemDescription(e.target.value)} maxLength={4000} rows={3} placeholder="Add useful context…"/></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowItemForm(false)}>Cancel</button><button className="primary" disabled={busy}>{busy?'Adding…':'Add task'} <ArrowUpRight size={15}/></button></div></form></Modal>}
  </div>
}

function StatCard({label,value,note,icon,tone}:{label:string;value:number;note:string;icon:ReactNode;tone:string}) { return <div className="stat-card"><div className="stat-top"><span>{label}</span><div className={`stat-icon ${tone}`}>{icon}</div></div><div className="stat-value">{value.toString().padStart(2,'0')}</div><div className="stat-note">{note}</div></div> }
function Modal({title,subtitle,onClose,children}:{title:string;subtitle:string;onClose:()=>void;children:ReactNode}) { return <div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-heading"><div><h2>{title}</h2><p>{subtitle}</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18}/></button></div>{children}</div></div> }
