// app/dashboard/layout.tsx
export const revalidate = 0
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getRecords, TABLES } from '@/lib/nocodb'
import Sidebar from '@/components/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  let cssVars = ''
  try {
    const cd = await getRecords(TABLES.CAI_DAT, { limit: 1, fields: 'ui_theme' })
    const raw = cd.list?.[0]?.['ui_theme']
    if (raw) {
      const t = JSON.parse(raw)
      cssVars = `:root{
        --primary:${t.primary||'#1B3A6B'};
        --primary-light:${t.primaryLight||'#2E5BA8'};
        --primary-pale:${t.primaryPale||'#EBF1FB'};
        --accent:${t.accent||'#C8860A'};
        --accent-light:${t.accentLight||'#F5A623'};
        --accent-pale:${t.accentPale||'#FEF6E4'};
        --bg:${t.bg||'#F7F8FC'};
      }`
    }
  } catch(e) {
    console.error('[layout] load theme error:', e)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {cssVars&&<style dangerouslySetInnerHTML={{__html:cssVars}}/>}
      <Sidebar user={session} />
      <main style={{
        flex: 1,
        marginLeft: 'var(--sidebar-w)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {children}
      </main>
    </div>
  )
}
