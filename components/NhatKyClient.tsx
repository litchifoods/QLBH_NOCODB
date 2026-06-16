'use client'
import { useState, useMemo } from 'react'
import { UserSession } from '@/lib/auth'

function fDate(s: string) {
  if (!s) return '—'
  try {
    const d = new Date(s)
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  } catch { return s }
}

const MAU_HD: Record<string, string> = {
  'Tạo':          '#DCFCE7',
  'Sửa':          '#FEF9C3',
  'Xóa':          '#FEE2E2',
  'Hủy':          '#FFE4E6',
  'Đối soát':     '#DBEAFE',
  'Tạm ứng':      '#F3E8FF',
  'Thưởng':       '#FEF3C7',
  'Nhập kho':     '#E0F2FE',
  'Tạo khoản thu':'#D1FAE5',
  'Tạo chi phí':  '#FEE2E2',
}
const MAU_TEXT: Record<string, string> = {
  'Tạo':          '#16A34A',
  'Sửa':          '#D97706',
  'Xóa':          '#DC2626',
  'Hủy':          '#E11D48',
  'Đối soát':     '#1E40AF',
  'Tạm ứng':      '#7C3AED',
  'Thưởng':       '#92400E',
  'Nhập kho':     '#0369A1',
  'Tạo khoản thu':'#065F46',
  'Tạo chi phí':  '#991B1B',
}

const SO_DONG = 20

export default function NhatKyClient({ logs, user }: { logs: any[], user: UserSession }) {
  const [search, setSearch]         = useState('')
  const [filterHD, setFilterHD]     = useState('Tất cả')
  const [filterBang, setFilterBang] = useState('Tất cả')
  const [filterNV, setFilterNV]     = useState('Tất cả')
  const [tuNgay, setTuNgay]         = useState('')
  const [denNgay, setDenNgay]       = useState('')
  const [trang, setTrang]           = useState(1)
  const [expandId, setExpandId]     = useState<string|null>(null)

  // Danh sách filter options
  const dsHD   = useMemo(()=>['Tất cả',...Array.from(new Set(logs.map(l=>l['Hành động']||'').filter(Boolean)))],[logs])
  const dsBang = useMemo(()=>['Tất cả',...Array.from(new Set(logs.map(l=>l['Bảng']||'').filter(Boolean)))],[logs])
  const dsNV   = useMemo(()=>['Tất cả',...Array.from(new Set(logs.map(l=>l['Tên NV']||'').filter(Boolean)))],[logs])

  const filtered = useMemo(()=>{
    return logs.filter(l=>{
      if (filterHD!=='Tất cả'&&l['Hành động']!==filterHD) return false
      if (filterBang!=='Tất cả'&&l['Bảng']!==filterBang) return false
      if (filterNV!=='Tất cả'&&l['Tên NV']!==filterNV) return false
      const _ngay=(l['Thời gian']||'').replace('T',' ').substring(0,10)
      if (tuNgay&&_ngay<tuNgay) return false
      if (denNgay&&_ngay>denNgay) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (l['Mô tả']||'').toLowerCase().includes(q)
          || (l['Mã bản ghi']||'').toLowerCase().includes(q)
          || (l['Tên NV']||'').toLowerCase().includes(q)
          || (l['Mã NV']||'').toLowerCase().includes(q)
      }
      return true
    })
  },[logs,filterHD,filterBang,filterNV,tuNgay,denNgay,search])

  const tongTrang = Math.max(1, Math.ceil(filtered.length/SO_DONG))
  const trangHT   = Math.min(trang, tongTrang)
  const danhSach  = filtered.slice((trangHT-1)*SO_DONG, trangHT*SO_DONG)

  function resetFilter() {
    setSearch('');setFilterHD('Tất cả');setFilterBang('Tất cả')
    setFilterNV('Tất cả');setTuNgay('');setDenNgay('');setTrang(1)
  }

  return (
    <div style={{padding:'20px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px',flexWrap:'wrap',gap:'10px'}}>
        <div>
          <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>📋 Nhật ký thao tác</h1>
          <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'4px 0 0'}}>Lịch sử thao tác của nhân viên trên hệ thống</p>
        </div>
        <div style={{fontSize:'13px',color:'var(--text-secondary)'}}>
          Tổng: <strong>{filtered.length}</strong> bản ghi
        </div>
      </div>

      {/* Bộ lọc */}
      <div className="card" style={{padding:'12px 16px',marginBottom:'16px'}}>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center'}}>
          <input className="input" placeholder="🔍 Tìm mô tả, mã, tên NV..." value={search}
            onChange={e=>{setSearch(e.target.value);setTrang(1)}}
            style={{flex:1,minWidth:'200px',maxWidth:'280px'}}/>
          <select className="input" value={filterHD} onChange={e=>{setFilterHD(e.target.value);setTrang(1)}} style={{width:'140px'}}>
            {dsHD.map(h=><option key={h}>{h}</option>)}
          </select>
          <select className="input" value={filterBang} onChange={e=>{setFilterBang(e.target.value);setTrang(1)}} style={{width:'150px'}}>
            {dsBang.map(b=><option key={b}>{b}</option>)}
          </select>
          <select className="input" value={filterNV} onChange={e=>{setFilterNV(e.target.value);setTrang(1)}} style={{width:'150px'}}>
            {dsNV.map(n=><option key={n}>{n}</option>)}
          </select>
          <input className="input" type="date" value={tuNgay} onChange={e=>{setTuNgay(e.target.value);setTrang(1)}} style={{width:'140px'}}/>
          <input className="input" type="date" value={denNgay} onChange={e=>{setDenNgay(e.target.value);setTrang(1)}} style={{width:'140px'}}/>
          {(search||filterHD!=='Tất cả'||filterBang!=='Tất cả'||filterNV!=='Tất cả'||tuNgay||denNgay)&&
            <button onClick={resetFilter} style={{padding:'7px 12px',borderRadius:'6px',border:'1px solid var(--border)',background:'white',fontSize:'12px',cursor:'pointer'}}>
              ✕ Xóa lọc
            </button>}
        </div>
      </div>

      {/* Bảng */}
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'var(--bg-secondary)',borderBottom:'2px solid var(--border)'}}>
                <th style={{padding:'10px 12px',textAlign:'left',fontSize:'11px',fontWeight:700,color:'var(--text-secondary)',whiteSpace:'nowrap'}}>THỜI GIAN</th>
                <th style={{padding:'10px 12px',textAlign:'left',fontSize:'11px',fontWeight:700,color:'var(--text-secondary)'}}>NHÂN VIÊN</th>
                <th style={{padding:'10px 12px',textAlign:'center',fontSize:'11px',fontWeight:700,color:'var(--text-secondary)'}}>HÀNH ĐỘNG</th>
                <th style={{padding:'10px 12px',textAlign:'left',fontSize:'11px',fontWeight:700,color:'var(--text-secondary)'}}>BẢNG</th>
                <th style={{padding:'10px 12px',textAlign:'left',fontSize:'11px',fontWeight:700,color:'var(--text-secondary)'}}>MÃ BẢN GHI</th>
                <th style={{padding:'10px 12px',textAlign:'left',fontSize:'11px',fontWeight:700,color:'var(--text-secondary)'}}>MÔ TẢ</th>
                <th style={{padding:'10px 12px',textAlign:'center',fontSize:'11px',fontWeight:700,color:'var(--text-secondary)'}}>CHI TIẾT</th>
              </tr>
            </thead>
            <tbody>
              {danhSach.length===0&&(
                <tr><td colSpan={7} style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>
                  Không có bản ghi nào
                </td></tr>
              )}
              {danhSach.map((log,i)=>{
                const hd = log['Hành động']||''
                const isExpanded = expandId===log['Mã log']
                const hasDiff = log['Dữ liệu cũ']||log['Dữ liệu mới']
                return (
                  <>
                    <tr key={log['Mã log']||i} style={{borderBottom:'1px solid var(--border)',background:i%2===0?'white':'var(--bg-secondary)'}}>
                      <td style={{padding:'10px 12px',fontSize:'12px',color:'var(--text-secondary)',whiteSpace:'nowrap'}}>{fDate(log['Thời gian'])}</td>
                      <td style={{padding:'10px 12px'}}>
                        <div style={{fontSize:'13px',fontWeight:600}}>{log['Tên NV']||'—'}</div>
                        <div style={{fontSize:'11px',color:'var(--text-muted)'}}>{log['Mã NV']||''}</div>
                      </td>
                      <td style={{padding:'10px 12px',textAlign:'center'}}>
                        <span style={{padding:'3px 10px',borderRadius:'12px',fontSize:'11px',fontWeight:700,
                          background:MAU_HD[hd]||'#F3F4F6',color:MAU_TEXT[hd]||'#374151'}}>
                          {hd}
                        </span>
                      </td>
                      <td style={{padding:'10px 12px',fontSize:'12px',color:'#374151'}}>{log['Bảng']||'—'}</td>
                      <td style={{padding:'10px 12px',fontSize:'12px',fontWeight:600,color:'var(--primary)',fontFamily:'monospace'}}>{log['Mã bản ghi']||'—'}</td>
                      <td style={{padding:'10px 12px',fontSize:'12px',color:'var(--text-secondary)',maxWidth:'300px'}}>{log['Mô tả']||'—'}</td>
                      <td style={{padding:'10px 12px',textAlign:'center'}}>
                        {hasDiff&&<button onClick={()=>setExpandId(isExpanded?null:log['Mã log'])}
                          style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid var(--border)',
                            background:isExpanded?'var(--primary)':'white',
                            color:isExpanded?'white':'var(--text-secondary)',
                            fontSize:'11px',cursor:'pointer'}}>
                          {isExpanded?'▲ Ẩn':'▼ Xem'}
                        </button>}
                      </td>
                    </tr>
                    {isExpanded&&(
                      <tr key={log['Mã log']+'_exp'} style={{background:'#F8FAFC',borderBottom:'1px solid var(--border)'}}>
                        <td colSpan={7} style={{padding:'12px 20px'}}>
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                            {log['Dữ liệu cũ']&&<div>
                              <div style={{fontSize:'11px',fontWeight:700,color:'#DC2626',marginBottom:'6px'}}>DỮ LIỆU CŨ</div>
                              <pre style={{fontSize:'11px',background:'#FEF2F2',padding:'10px',borderRadius:'6px',
                                overflowX:'auto',margin:0,color:'#374151',lineHeight:1.6}}>
                                {JSON.stringify(JSON.parse(log['Dữ liệu cũ']),null,2)}
                              </pre>
                            </div>}
                            {log['Dữ liệu mới']&&<div>
                              <div style={{fontSize:'11px',fontWeight:700,color:'#16A34A',marginBottom:'6px'}}>DỮ LIỆU MỚI</div>
                              <pre style={{fontSize:'11px',background:'#F0FDF4',padding:'10px',borderRadius:'6px',
                                overflowX:'auto',margin:0,color:'#374151',lineHeight:1.6}}>
                                {JSON.stringify(JSON.parse(log['Dữ liệu mới']),null,2)}
                              </pre>
                            </div>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        {tongTrang>1&&(
          <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:'6px',padding:'12px',borderTop:'1px solid var(--border)'}}>
            <button onClick={()=>setTrang(1)} disabled={trangHT===1}
              style={{padding:'5px 10px',borderRadius:'6px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'12px',opacity:trangHT===1?0.4:1}}>«</button>
            <button onClick={()=>setTrang(t=>Math.max(1,t-1))} disabled={trangHT===1}
              style={{padding:'5px 10px',borderRadius:'6px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'12px',opacity:trangHT===1?0.4:1}}>‹</button>
            <span style={{fontSize:'13px',color:'var(--text-secondary)',padding:'0 8px'}}>
              Trang {trangHT} / {tongTrang} — {filtered.length} bản ghi
            </span>
            <button onClick={()=>setTrang(t=>Math.min(tongTrang,t+1))} disabled={trangHT===tongTrang}
              style={{padding:'5px 10px',borderRadius:'6px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'12px',opacity:trangHT===tongTrang?0.4:1}}>›</button>
            <button onClick={()=>setTrang(tongTrang)} disabled={trangHT===tongTrang}
              style={{padding:'5px 10px',borderRadius:'6px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'12px',opacity:trangHT===tongTrang?0.4:1}}>»</button>
          </div>
        )}
      </div>
    </div>
  )
}
