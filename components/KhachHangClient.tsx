'use client'
// components/KhachHangClient.tsx — v3.0
// Sửa: Mã KH tự động, phân trang 10/trang, KH mới luôn lên đầu

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { UserSession } from '@/lib/auth'
import ExcelToolbar from '@/components/ExcelToolbar'

function boDau(s: string) {
  return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()
}
const LOAI = ['Tất cả','Cá nhân','Cơ quan','Công ty','Đại lý']
const SO_TRANG = 10  // số KH mỗi trang

export default function KhachHangClient({ khachHang, user }: { khachHang: any[]; user: UserSession }) {
  const router = useRouter()
  const [search,     setSearch]     = useState('')
  const [filterLoai, setFilterLoai] = useState('Tất cả')
  const [showModal,  setShowModal]  = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [msg,        setMsg]        = useState('')
  const [msgOk,      setMsgOk]      = useState(true)
  const [localKH,    setLocalKH]    = useState(khachHang)
  const [trang,      setTrang]      = useState(1)  // trang hiện tại

  // Form thêm KH
  const [tenKH,    setTenKH]    = useState('')
  const [sdtKH,    setSdtKH]    = useState('')
  const [diaChiKH, setDiaChiKH] = useState('')
  const [loaiKH,   setLoaiKH]   = useState('Cá nhân')
  const [ghiChuKH, setGhiChuKH] = useState('')

  // Lọc
  const filtered = useMemo(() => {
    setTrang(1) // reset về trang 1 khi filter thay đổi
    return localKH.filter((kh:any) => {
      if (filterLoai !== 'Tất cả' && kh['Đối tượng khách hàng'] !== filterLoai) return false
      if (!search.trim()) return true
      const q = boDau(search)
      return (
        boDau(kh['Tên khách hàng']||'').includes(q) ||
        (kh['Số điện thoại']||'').includes(search) ||
        boDau(kh['Mã KH']||'').includes(q) ||
        boDau(kh['Địa chỉ']||'').includes(q)
      )
    })
  }, [localKH, search, filterLoai])

  // Phân trang
  const tongTrang  = Math.max(1, Math.ceil(filtered.length / SO_TRANG))
  const trangHienTai = Math.min(trang, tongTrang)
  const danhSachTrang = filtered.slice((trangHienTai-1)*SO_TRANG, trangHienTai*SO_TRANG)

  function resetForm() {
    setTenKH(''); setSdtKH(''); setDiaChiKH(''); setLoaiKH('Cá nhân'); setGhiChuKH('')
  }

  function urlTaoDon(kh: any) {
    const maKH = kh['Mã KH'] || ''
    if (maKH) return `/dashboard/don-hang/tao?maKH=${encodeURIComponent(maKH)}`
    const ten    = encodeURIComponent(kh['Tên khách hàng'] || '')
    const sdt    = encodeURIComponent(kh['Số điện thoại']  || '')
    const diaChi = encodeURIComponent(kh['Địa chỉ']        || '')
    return `/dashboard/don-hang/tao?tenKH=${ten}&sdtKH=${sdt}&diaChiKH=${diaChi}`
  }

  async function luuKH() {
    if (!tenKH.trim()) { setMsg('Vui lòng nhập tên KH'); setMsgOk(false); return }
    setLoading(true); setMsg('')
    try {
      const res = await fetch('/api/khach-hang', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'Tên khách hàng':       tenKH.trim(),
          'Số điện thoại':        sdtKH.trim(),
          'Địa chỉ':              diaChiKH.trim(),
          'Đối tượng khách hàng': loaiKH,
          'Ghi chú':              ghiChuKH.trim(),
          'Ngày tạo':             new Date().toISOString().split('T')[0],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Lỗi')

      // ✅ Lấy Mã KH từ API (đã tự tạo sẵn)
      const maKHMoi = data['Mã KH'] || data.data?.['Mã KH'] || ''
      const khMoi = {
        'Mã KH':                maKHMoi,
        'Tên khách hàng':       tenKH.trim(),
        'Số điện thoại':        sdtKH.trim(),
        'Địa chỉ':              diaChiKH.trim(),
        'Đối tượng khách hàng': loaiKH,
        'Ghi chú':              ghiChuKH.trim(),
        'Ngày tạo':             new Date().toISOString(),
      }
      // ✅ Đẩy lên đầu danh sách + về trang 1
      setLocalKH(prev => [khMoi, ...prev])
      setTrang(1)
      setMsg('✅ Đã thêm: ' + tenKH.trim() + (maKHMoi ? ` (${maKHMoi})` : '')); setMsgOk(true)
      resetForm(); setShowModal(false)
    } catch (err: any) {
      setMsg('❌ ' + (err.message || 'Lỗi')); setMsgOk(false)
    } finally {
      setLoading(false); setTimeout(() => setMsg(''), 5000)
    }
  }

  async function handleNhap(rows: Record<string,string>[]) {
    const res = await fetch('/api/import/khach-hang', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Lỗi nhập')
    router.refresh()
  }

  function loaiColor(loai: string) {
    const m: Record<string,{bg:string;c:string}> = {
      'Cá nhân': {bg:'#DBEAFE',c:'#1E40AF'}, 'Cơ quan': {bg:'#FEF3C7',c:'#92400E'},
      'Công ty':  {bg:'#D1FAE5',c:'#065F46'}, 'Đại lý':  {bg:'#EDE9FE',c:'#6D28D9'},
    }
    return m[loai] || {bg:'#F3F4F6',c:'#374151'}
  }

  // Component phân trang dùng chung
  function PhanTrang() {
    if (tongTrang <= 1) return null
    const pages = []
    for (let i=1; i<=tongTrang; i++) pages.push(i)
    // Hiện tối đa 7 nút trang
    let hienThi = pages
    if (tongTrang > 7) {
      if (trangHienTai <= 4) hienThi = [...pages.slice(0,5), -1, tongTrang]
      else if (trangHienTai >= tongTrang - 3) hienThi = [1, -1, ...pages.slice(tongTrang-5)]
      else hienThi = [1, -1, trangHienTai-1, trangHienTai, trangHienTai+1, -2, tongTrang]
    }
    return (
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderTop:'1px solid #F0F0F0',flexWrap:'wrap',gap:'8px'}}>
        <div style={{fontSize:'12px',color:'var(--text-secondary)'}}>
          Hiển thị {(trangHienTai-1)*SO_TRANG+1}–{Math.min(trangHienTai*SO_TRANG, filtered.length)} / {filtered.length} khách hàng
        </div>
        <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
          <button onClick={()=>setTrang(t=>Math.max(1,t-1))} disabled={trangHienTai===1}
            style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid var(--border)',background:trangHienTai===1?'#F9FAFB':'white',color:trangHienTai===1?'#CCC':'var(--primary)',cursor:trangHienTai===1?'not-allowed':'pointer',fontSize:'13px',fontWeight:600}}>
            ‹
          </button>
          {hienThi.map((p,idx) =>
            p < 0 ? (
              <span key={`dot${idx}`} style={{padding:'4px 2px',color:'#9CA3AF',fontSize:'13px'}}>…</span>
            ) : (
              <button key={p} onClick={()=>setTrang(p)}
                style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid',borderColor:p===trangHienTai?'var(--primary)':'var(--border)',background:p===trangHienTai?'var(--primary)':'white',color:p===trangHienTai?'white':'var(--text-secondary)',cursor:'pointer',fontSize:'13px',fontWeight:p===trangHienTai?700:400,minWidth:'32px'}}>
                {p}
              </button>
            )
          )}
          <button onClick={()=>setTrang(t=>Math.min(tongTrang,t+1))} disabled={trangHienTai===tongTrang}
            style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid var(--border)',background:trangHienTai===tongTrang?'#F9FAFB':'white',color:trangHienTai===tongTrang?'#CCC':'var(--primary)',cursor:trangHienTai===tongTrang?'not-allowed':'pointer',fontSize:'13px',fontWeight:600}}>
            ›
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{padding:'20px'}}>
      <style>{`
        .kh-hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:12px;flex-wrap:wrap;}
        .btn-them{background:var(--primary);color:white;border:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;white-space:nowrap;cursor:pointer;}
        .kh-t th,.kh-t td{padding:9px 12px;}
        .kh-t tbody tr:hover td{background:#F0F4FF!important;}
        .ov{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;}
        .mk{background:white;border-radius:12px;padding:24px;width:100%;max-width:460px;}
        @media(max-width:900px){.col-dia{display:none;}}
      `}</style>

      <div className="kh-hdr">
        <div>
          <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>👥 Khách hàng</h1>
          <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'2px 0 8px'}}>{filtered.length} khách hàng</p>
          <ExcelToolbar loai="KHACH_HANG" danhSach={filtered} tenFile="khach-hang"
            layGiaTri={kh=>[kh['Mã KH']||'',kh['Tên khách hàng']||'',kh['Số điện thoại']||'',kh['Địa chỉ']||'',kh['Đối tượng khách hàng']||'',kh['Ghi chú']||'']}
            onNhap={handleNhap}/>
        </div>
        <button className="btn-them" onClick={()=>setShowModal(true)}>+ Thêm khách hàng</button>
      </div>

      {msg&&<div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'14px',fontSize:'13px',background:msgOk?'#D1FAE5':'#FEE2E2',color:msgOk?'#065F46':'#991B1B'}}>{msg}</div>}

      {/* Filter */}
      <div className="card" style={{padding:'12px 14px',marginBottom:'14px'}}>
        <div style={{display:'flex',gap:'10px',flexWrap:'wrap',alignItems:'center'}}>
          <input className="input" placeholder="🔍 Tìm tên, SĐT, địa chỉ, mã KH..." value={search}
            onChange={e=>setSearch(e.target.value)} style={{flex:'1',minWidth:'180px',maxWidth:'300px'}}/>
          <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
            {LOAI.map(l=>{
              const c=l!=='Tất cả'?loaiColor(l):null; const isA=filterLoai===l
              return <button key={l} onClick={()=>setFilterLoai(l)} style={{padding:'5px 12px',borderRadius:'20px',border:'1px solid',borderColor:isA?(c?.c||'var(--primary)'):'var(--border)',background:isA?(c?.bg||'var(--primary-pale)'):'white',color:isA?(c?.c||'var(--primary)'):'var(--text-secondary)',fontWeight:isA?700:400,fontSize:'12px',cursor:'pointer'}}>{l}</button>
            })}
          </div>
        </div>
      </div>

      {/* Bảng */}
      <div className="card" style={{overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table className="kh-t" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead>
              <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Mã KH</th>
                <th style={{textAlign:'left',fontWeight:700}}>Tên khách hàng</th>
                <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Số điện thoại</th>
                <th className="col-dia" style={{textAlign:'left',fontWeight:700}}>Địa chỉ</th>
                <th style={{textAlign:'center',fontWeight:700}}>Loại</th>
                <th style={{width:'180px',textAlign:'center',fontWeight:700}}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {danhSachTrang.length===0?(
                <tr><td colSpan={6} style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
                  {search||filterLoai!=='Tất cả' ? 'Không tìm thấy khách hàng nào' : 'Chưa có khách hàng'}
                </td></tr>
              ):danhSachTrang.map((kh:any,i:number)=>{
                const c=loaiColor(kh['Đối tượng khách hàng']||'')
                return (
                  <tr key={kh['Mã KH']||i} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                    <td style={{fontWeight:700,color:'var(--primary)',whiteSpace:'nowrap'}}>
                      {kh['Mã KH'] || <span style={{color:'#9CA3AF',fontSize:'11px',fontWeight:400}}>—</span>}
                    </td>
                    <td style={{fontWeight:600}}>{kh['Tên khách hàng']}</td>
                    <td style={{whiteSpace:'nowrap'}}>
                      {kh['Số điện thoại']
                        ?<a href={`tel:${kh['Số điện thoại']}`} style={{color:'var(--primary)',textDecoration:'none'}}>📞 {kh['Số điện thoại']}</a>
                        :'—'}
                    </td>
                    <td className="col-dia" style={{fontSize:'12px',color:'var(--text-secondary)',maxWidth:'200px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{kh['Địa chỉ']||'—'}</td>
                    <td style={{textAlign:'center'}}>
                      <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:700,background:c.bg,color:c.c,whiteSpace:'nowrap'}}>
                        {kh['Đối tượng khách hàng']||'—'}
                      </span>
                    </td>
                    <td style={{textAlign:'center'}}>
                      <div style={{display:'flex',gap:'6px',justifyContent:'center'}}>
                        <a href={urlTaoDon(kh)} style={{padding:'5px 12px',borderRadius:'6px',border:'none',background:'var(--primary)',color:'white',fontSize:'12px',fontWeight:700,textDecoration:'none',display:'inline-flex',alignItems:'center',gap:'4px',whiteSpace:'nowrap'}}>
                          + Tạo đơn
                        </a>
                        <a href={`/dashboard/don-hang?q=${encodeURIComponent(kh['Mã KH']||kh['Tên khách hàng']||'')}`}
                          style={{padding:'5px 10px',borderRadius:'6px',border:'1px solid var(--border)',color:'var(--text-secondary)',fontSize:'12px',textDecoration:'none',whiteSpace:'nowrap'}}>
                          📋 Đơn
                        </a>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <PhanTrang/>
      </div>

      {/* Modal thêm KH */}
      {showModal&&(
        <div className="ov" onClick={()=>{setShowModal(false);resetForm()}}>
          <div className="mk" onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>+ Thêm khách hàng mới</h2>
              <button onClick={()=>{setShowModal(false);resetForm()}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            <p style={{fontSize:'12px',color:'#1E40AF',margin:'0 0 14px',background:'#EFF6FF',padding:'8px 12px',borderRadius:'6px'}}>
              💡 Mã KH được tạo tự động. Khách hàng mới hiện đầu danh sách.
            </p>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              <div><label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Tên khách hàng *</label>
                <input className="input" placeholder="Nguyễn Văn A / Công ty..." value={tenKH} onChange={e=>setTenKH(e.target.value)} autoFocus/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div><label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Số điện thoại</label>
                  <input className="input" placeholder="0901 234 567" value={sdtKH} onChange={e=>setSdtKH(e.target.value)}/></div>
                <div><label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Đối tượng</label>
                  <select className="input" value={loaiKH} onChange={e=>setLoaiKH(e.target.value)}>
                    <option>Cá nhân</option><option>Cơ quan</option><option>Công ty</option><option>Đại lý</option>
                  </select></div>
              </div>
              <div><label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Địa chỉ</label>
                <input className="input" placeholder="Số nhà, đường, quận..." value={diaChiKH} onChange={e=>setDiaChiKH(e.target.value)}/></div>
              <div><label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Ghi chú</label>
                <input className="input" placeholder="Ghi chú thêm..." value={ghiChuKH} onChange={e=>setGhiChuKH(e.target.value)}/></div>
              <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
                <button onClick={luuKH} disabled={loading}
                  style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:'var(--primary)',color:'white',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>
                  {loading?'⏳ Đang lưu...':'✅ Lưu khách hàng'}
                </button>
                <button onClick={()=>{setShowModal(false);resetForm()}}
                  style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px'}}>Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
