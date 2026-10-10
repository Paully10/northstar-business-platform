const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
export type Project = { id:number; name:string; description:string; status:string; created_at:string }
export type WorkItem = { id:number; title:string; description:string; status:string; is_done:boolean; project_id:number; created_at:string }
export type Dashboard = { projects:number; work_items:number; completed_items:number }

export async function request<T>(path:string, token:string | null, options:RequestInit = {}):Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type','application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.detail || `Request failed (${response.status})`)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
