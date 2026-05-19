'use client'
// components/KhachHangClient.tsx
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { UserSession } from '@/lib/auth'
import ExcelToolbar from '@/components/ExcelToolbar'

function boDau(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()
}
const DOI_TUONG = ['Cá nhân','Cơ quan','Công ty','Đại lý']

export default function KhachHangClient({ danhSachKH, tongSo, user }:
  { danhSachKH: any[], tongSo: number, user: UserSession }) {

  const router = useRouter()
  const [search, setSearch]     = useState('')
  const [doiTuong, setDoiTuong] = useState('Tất cả')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [msg, setMsg]           = useState('')
  const [msgType, setMsgType]   = useState<'ok'|'err'>('ok')
  const [form, setForm]         = useState({tenKH:'',sdt:'',diaChi:'',doiTuongKH:'Cá nhân',ghiChu:''})

  const khHopLe = useMemo(() =>
    danhSachKH.filter(kh => kh['Tên khách hàng']?.toString().trim())
  ,[danhSachKH])

  const nextMaKH = useMemo(() => {
    const max = khHopLe.reduce((m,kh)=>Math.max(m,parseInt((kh['Mã KH']||'').replace(/\D/g,''))||0),0)
    return `KH-${String(max+1).padStart(3,'0')}`
  },[khHopLe])

  const filtered = useMemo(() => khHopLe.filter(kh => {
    if (doiTuong !== 'Tất cả' && kh['Đối tượng khách hàng'] !== doiTuong) return false
    if (search) {
      const q = boDau(search)
      return boDau(kh['Tên khách hàng']||'').includes(q) ||
        (kh['Số điện thoại']||'').includes(search) ||
        boDau(kh['Mã KH']||'').includes(q) ||
        boDau(kh['Địa chỉ']||'').includes(q)
    }
    return true
  }),[khHopLe,search,doiTuong])

  function setF(k: string, v: string) { setForm(p=>({...p,[k]:v})) }

  async function luuKH() {
    if (!form.tenKH.trim()) { setMsg('Vui lòng nhập tên'); setMsgType('err'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/khach-hang',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({'Mã KH':nextMaKH,'Tên khách hàng':form.tenKH.trim(),
          'Số điện thoại':form.sdt.trim(),'Địa chỉ':form.diaChi.trim(),
          'Đối tượng khách hàng':form.doiTuongKH,'Ghi chú':form.ghiChu.trim(),
          'Ngày tạo':new Date().toISOString().split('T')[0]}),
      })
      if (!res.ok) throw new Error('Lỗi')
      setMsg(`✅ Đã thêm: ${form.tenKH} (${nextMaKH})`); setMsgType('ok')
      setForm({tenKH:'',sdt:'',diaChi:'',doiTuongKH:'Cá nhân',ghiChu:''})
      setShowForm(false); router.refresh()
    } catch { setMsg('❌ Lỗi, thử lại'); setMsgType('err') }
    finally { setLoading(false); setTimeout(()=>setMsg(''),4000) }
  }

  async function handleNhapKH(rows: Record<string,string>[]) {
    const res = await fetch('/api/import/khach-hang',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({rows}),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message||'Lỗi nhập')
    router.refresh()
  }

  return (
    <div style={{padding:'20px'}}>
      <style>{`
        .kh-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:12px;flex-wrap:wrap;}
        .btn-them{background:var(--primary);color:white;border:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;white-space:nowrap;flex-shrink:0;cursor:pointer;display:inline-flex;align-items:center;gap:6px;}
        .btn-them:hover{opacity:0.9;}
        .kh-table th,.kh-table td{padding:9px 12px;}
        .kh-table tbody tr:hover td{background:#F0F4FF!important;}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;}
        .modal{background:white;border-radius:12px;padding:24px;width:100%;max-width:440px;max-height:90vh;overflow-y:auto;}
        @media(max-width:700px){.col-dia,.col-dt{display:none;}}
      `}</style>

      {/* Header */}
      <div className="kh-header">
        <div>
          <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>👥 Khách hàng</h1>
          <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'2px 0 8px'}}>
            {filtered.length} khách hàng
          </p>
          <ExcelToolbar
            loai="KHACH_HANG"
            danhSach={filtered}
            tenFile="khach-hang"
            layGiaTri={kh=>[
              kh['Mã KH']||'', kh['Tên khách hàng']||'',
              kh['Số điện thoại']||'', kh['Địa chỉ']||'',
              kh['Đối tượng khách hàng']||'', kh['Ghi chú']||'',
            ]}
            onNhap={handleNhapKH}
          />
        </div>
        <button className="btn-them" onClick={()=>setShowForm(true)}>➕ Thêm khách hàng</button>
      </div>

      {msg&&(
        <div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'14px',fontSize:'13px',
          background:msgType==='ok'?'#D1FAE5':'#FEE2E2',color:msgType==='ok'?'#065F46':'#991B1B'}}>
          {msg}
        </div>
      )}

      {/* Filter */}
      <div className="card" style={{padding:'12px 14px',marginBottom:'14px'}}>
        <div style={{display:'flex',gap:'10px',flexWrap:'wrap',alignItems:'center'}}>
          <input className="input" placeholder="🔍 Tìm tên, SĐT, địa chỉ..."
            value={search} onChange={e=>setSearch(e.target.value)}
            style={{flex:'1',minWidth:'180px',maxWidth:'300px'}}/>
          <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
            {['Tất cả',...DOI_TUONG].map(dt=>(
              <button key={dt} onClick={()=>setDoiTuong(dt)} style={{
                padding:'5px 11px',borderRadius:'20px',border:'1px solid',
                borderColor:doiTuong===dt?'var(--primary)':'var(--border)',
                background:doiTuong===dt?'var(--primary)':'white',
                color:doiTuong===dt?'white':'var(--text-secondary)',
                fontWeight:doiTuong===dt?700:400,fontSize:'12px',cursor:'pointer',
              }}>{dt}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Bảng */}
      <div className="card">
        <div style={{overflowX:'auto'}}>
          <table className="kh-table" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead>
              <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                <th style={{textAlign:'left',fontWeight:700}}>Mã KH</th>
                <th style={{textAlign:'left',fontWeight:700}}>Tên khách hàng</th>
                <th style={{textAlign:'left',fontWeight:700}}>Số điện thoại</th>
                <th className="col-dia" style={{textAlign:'left',fontWeight:700}}>Địa chỉ</th>
                <th className="col-dt" style={{textAlign:'left',fontWeight:700}}>Loại</th>
                <th style={{width:'130px'}}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length===0?(
                <tr><td colSpan={6} style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>Không tìm thấy khách hàng nào</td></tr>
              ):filtered.map((kh:any,i:number)=>(
                <tr key={i} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                  <td style={{fontWeight:600,color:'var(--primary)',whiteSpace:'nowrap'}}>{kh['Mã KH']}</td>
                  <td style={{fontWeight:700}}>{kh['Tên khách hàng']}</td>
                  <td>
                    {kh['Số điện thoại']
                      ?<a href={`tel:${kh['Số điện thoại']}`} style={{color:'var(--primary)',textDecoration:'none',fontWeight:600}}>📞 {kh['Số điện thoại']}</a>
                      :<span style={{color:'var(--text-muted)'}}>—</span>}
                  </td>
                  <td className="col-dia" style={{color:'var(--text-secondary)',fontSize:'12px',maxWidth:'200px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{kh['Địa chỉ']||'—'}</td>
                  <td className="col-dt">
                    {kh['Đối tượng khách hàng']&&(
                      <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'20px',background:'var(--primary-pale)',color:'var(--primary)',fontWeight:600}}>{kh['Đối tượng khách hàng']}</span>
                    )}
                  </td>
                  <td>
                    <div style={{display:'flex',gap:'4px'}}>
                      <Link href={`/dashboard/don-hang/tao?maKH=${kh['Mã KH']}`}
                        style={{padding:'4px 8px',borderRadius:'6px',background:'var(--primary)',color:'white',textDecoration:'none',fontSize:'11px',fontWeight:600,whiteSpace:'nowrap'}}>
                        ➕ Tạo đơn
                      </Link>
                      <Link href={`/dashboard/don-hang?q=${kh['Mã KH']}`}
                        style={{padding:'4px 8px',borderRadius:'6px',border:'1px solid var(--border)',color:'var(--text-secondary)',textDecoration:'none',fontSize:'11px',whiteSpace:'nowrap'}}>
                        📋 Đơn
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal thêm KH */}
      {showForm&&(
        <div className="overlay" onClick={()=>setShowForm(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>➕ Thêm khách hàng mới</h2>
              <button onClick={()=>setShowForm(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'var(--text-secondary)'}}>✕</button>
            </div>
            <div style={{fontSize:'12px',color:'var(--text-secondary)',marginBottom:'12px'}}>
              Mã KH tự động: <strong style={{color:'var(--primary)'}}>{nextMaKH}</strong>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'11px'}}>
              {[['Tên khách hàng *','tenKH','text','Nhập tên...'],['Số điện thoại','sdt','tel','0912 345 678'],['Địa chỉ','diaChi','text','Số nhà, đường, phường...']].map(([lb,k,type,ph])=>(
                <div key={k}>
                  <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'3px'}}>{lb}</label>
                  <input className="input" type={type} placeholder={ph} value={(form as any)[k]} onChange={e=>setF(k,e.target.value)}/>
                </div>
              ))}
              <div>
                <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'3px'}}>Đối tượng</label>
                <select className="input" value={form.doiTuongKH} onChange={e=>setF('doiTuongKH',e.target.value)}>
                  {DOI_TUONG.map(dt=><option key={dt}>{dt}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'3px'}}>Ghi chú</label>
                <textarea className="input" rows={2} placeholder="Ghi chú..." value={form.ghiChu}
                  onChange={e=>setF('ghiChu',e.target.value)} style={{resize:'vertical'}}/>
              </div>
              <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
                <button onClick={luuKH} disabled={loading} style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:'var(--primary)',color:'white',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>
                  {loading?'⏳ Đang lưu...':'✅ Lưu khách hàng'}
                </button>
                <button onClick={()=>setShowForm(false)} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px'}}>Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
