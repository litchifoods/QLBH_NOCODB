'use client'
// components/KhachHangClient.tsx — v4.0
// Sửa: KH mới lên đầu đúng, thêm nút Sửa + Xóa, phân trang 10/trang

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserSession } from '@/lib/auth'
import ExcelToolbar from '@/components/ExcelToolbar'

function boDau(s: string) {
  return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()
}
const LOAI    = ['Tất cả','Cá nhân','Cơ quan','Công ty','Đại lý']
const SO_DONG = 10

export default function KhachHangClient({ khachHang, user }: { khachHang: any[]; user: UserSession }) {
  const router = useRouter()

  // ── State chính ──
  const [localKH,    setLocalKH]    = useState<any[]>([])
  const [search,     setSearch]     = useState('')
  const [filterLoai, setFilterLoai] = useState('Tất cả')
  const [trang,      setTrang]      = useState(1)
  const [msg,        setMsg]        = useState('')
  const [msgOk,      setMsgOk]      = useState(true)

  // ── Modal thêm/sửa ──
  const [showModal,  setShowModal]  = useState(false)
  const [editKH,     setEditKH]     = useState<any>(null)  // null = thêm mới, object = đang sửa
  const [loading,    setLoading]    = useState(false)

  // ── Form ──
  const [tenKH,    setTenKH]    = useState('')
  const [sdtKH,    setSdtKH]    = useState('')
  const [diaChiKH, setDiaChiKH] = useState('')
  const [loaiKH,   setLoaiKH]   = useState('Cá nhân')
  const [ghiChuKH, setGhiChuKH] = useState('')

  // ── Modal xác nhận xóa ──
  const [xoaKH,    setXoaKH]    = useState<any>(null)
  const [dangXoa,  setDangXoa]  = useState(false)

  // ── Load danh sách ban đầu — giữ thứ tự mới nhất lên đầu ──
  useEffect(() => {
    setLocalKH([...khachHang])
  }, [khachHang])

  // ── Lọc (không gọi setTrang trong useMemo) ──
  const filtered = useMemo(() => {
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

  // Reset trang khi filter thay đổi — dùng useEffect thay vì trong useMemo
  useEffect(() => { setTrang(1) }, [search, filterLoai])

  // ── Phân trang ──
  const tongTrang     = Math.max(1, Math.ceil(filtered.length / SO_DONG))
  const trangHT       = Math.min(trang, tongTrang)
  const danhSachTrang = filtered.slice((trangHT-1)*SO_DONG, trangHT*SO_DONG)

  function resetForm() {
    setTenKH(''); setSdtKH(''); setDiaChiKH(''); setLoaiKH('Cá nhân'); setGhiChuKH('')
    setEditKH(null)
  }

  function moModalThem() {
    resetForm()
    setShowModal(true)
  }

  function moModalSua(kh: any) {
    setEditKH(kh)
    setTenKH(kh['Tên khách hàng']||'')
    setSdtKH(kh['Số điện thoại']||'')
    setDiaChiKH(kh['Địa chỉ']||'')
    setLoaiKH(kh['Đối tượng khách hàng']||'Cá nhân')
    setGhiChuKH(kh['Ghi chú']||'')
    setShowModal(true)
  }

  function urlTaoDon(kh: any) {
    const maKH = kh['Mã KH'] || ''
    if (maKH) return `/dashboard/don-hang/tao?maKH=${encodeURIComponent(maKH)}`
    const ten    = encodeURIComponent(kh['Tên khách hàng'] || '')
    const sdt    = encodeURIComponent(kh['Số điện thoại']  || '')
    const diaChi = encodeURIComponent(kh['Địa chỉ']        || '')
    return `/dashboard/don-hang/tao?tenKH=${ten}&sdtKH=${sdt}&diaChiKH=${diaChi}`
  }

  // ── Lưu KH (thêm mới hoặc sửa) ──
  async function luuKH() {
    if (!tenKH.trim()) { setMsg('Vui lòng nhập tên khách hàng'); setMsgOk(false); return }
    setLoading(true); setMsg('')
    try {
      if (editKH) {
        // ── SỬA: gọi PATCH ──
        const rowId = editKH['Id'] || editKH['id']
        const res = await fetch('/api/khach-hang', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: rowId,
            'Tên khách hàng':       tenKH.trim(),
            'Số điện thoại':        sdtKH.trim(),
            'Địa chỉ':              diaChiKH.trim(),
            'Đối tượng khách hàng': loaiKH,
            'Ghi chú':              ghiChuKH.trim(),
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'Lỗi cập nhật')

        // Cập nhật localKH — giữ nguyên vị trí
        setLocalKH(prev => prev.map(kh =>
          (kh['Mã KH'] === editKH['Mã KH']) ? {
            ...kh,
            'Tên khách hàng':       tenKH.trim(),
            'Số điện thoại':        sdtKH.trim(),
            'Địa chỉ':              diaChiKH.trim(),
            'Đối tượng khách hàng': loaiKH,
            'Ghi chú':              ghiChuKH.trim(),
          } : kh
        ))
        setMsg('✅ Đã cập nhật: ' + tenKH.trim()); setMsgOk(true)

      } else {
        // ── THÊM MỚI ──
        const res = await fetch('/api/khach-hang', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        if (!res.ok) throw new Error(data.message || 'Lỗi thêm KH')

        const maKHMoi = data['Mã KH'] || data.data?.['Mã KH'] || ''
        const khMoi = {
          'Id':                    data.data?.['Id'] || data.data?.['id'] || '',
          'Mã KH':                 maKHMoi,
          'Tên khách hàng':        tenKH.trim(),
          'Số điện thoại':         sdtKH.trim(),
          'Địa chỉ':               diaChiKH.trim(),
          'Đối tượng khách hàng':  loaiKH,
          'Ghi chú':               ghiChuKH.trim(),
          'Ngày tạo':              new Date().toISOString(),
        }
        // ✅ Thêm vào ĐẦU mảng → KH mới nhất luôn lên đầu
        setLocalKH(prev => [khMoi, ...prev])
        setTrang(1)  // nhảy về trang 1 để thấy KH mới
        setMsg('✅ Đã thêm: ' + tenKH.trim() + (maKHMoi ? ` (${maKHMoi})` : '')); setMsgOk(true)
      }

      resetForm(); setShowModal(false)
    } catch (err: any) {
      setMsg('❌ ' + (err.message || 'Lỗi')); setMsgOk(false)
    } finally {
      setLoading(false)
      setTimeout(() => setMsg(''), 5000)
    }
  }

  // ── Xóa KH ──
  async function xacNhanXoa() {
    if (!xoaKH) return
    setDangXoa(true)
    try {
      const rowId = xoaKH['Id'] || xoaKH['id']
      const res = await fetch(`/api/khach-hang?id=${rowId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Lỗi xóa')

      setLocalKH(prev => prev.filter(kh => kh['Mã KH'] !== xoaKH['Mã KH']))
      setMsg('✅ Đã xóa: ' + xoaKH['Tên khách hàng']); setMsgOk(true)
      setXoaKH(null)
    } catch (err: any) {
      setMsg('❌ ' + (err.message || 'Lỗi xóa')); setMsgOk(false)
    } finally {
      setDangXoa(false)
      setTimeout(() => setMsg(''), 5000)
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
      'Cá nhân': {bg:'#DBEAFE',c:'#1E40AF'},
      'Cơ quan':  {bg:'#FEF3C7',c:'#92400E'},
      'Công ty':  {bg:'#D1FAE5',c:'#065F46'},
      'Đại lý':   {bg:'#EDE9FE',c:'#6D28D9'},
    }
    return m[loai] || {bg:'#F3F4F6',c:'#374151'}
  }

  // ── Component phân trang ──
  function PhanTrang() {
    if (tongTrang <= 1) return null
    const pages = Array.from({length: tongTrang}, (_,i) => i+1)
    let hienThi: number[]
    if (tongTrang <= 7) hienThi = pages
    else if (trangHT <= 4) hienThi = [...pages.slice(0,5), -1, tongTrang]
    else if (trangHT >= tongTrang-3) hienThi = [1, -1, ...pages.slice(tongTrang-5)]
    else hienThi = [1, -1, trangHT-1, trangHT, trangHT+1, -2, tongTrang]

    const btnStyle = (p: number) => ({
      padding:'4px 10px', borderRadius:'5px', border:'1px solid',
      borderColor: p===trangHT ? 'var(--primary)' : 'var(--border)',
      background:  p===trangHT ? 'var(--primary)' : 'white',
      color:       p===trangHT ? 'white' : 'var(--text-secondary)',
      cursor:'pointer', fontSize:'13px',
      fontWeight:  p===trangHT ? 700 : 400,
      minWidth:'32px',
    })

    return (
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderTop:'1px solid #F0F0F0',flexWrap:'wrap',gap:'8px'}}>
        <div style={{fontSize:'12px',color:'var(--text-secondary)'}}>
          Hiển thị {(trangHT-1)*SO_DONG+1}–{Math.min(trangHT*SO_DONG, filtered.length)} / {filtered.length} khách hàng
        </div>
        <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
          <button onClick={()=>setTrang(t=>Math.max(1,t-1))} disabled={trangHT===1}
            style={{...btnStyle(0), color:trangHT===1?'#CCC':'var(--primary)', background:trangHT===1?'#F9FAFB':'white', cursor:trangHT===1?'not-allowed':'pointer', fontWeight:600}}>‹</button>
          {hienThi.map((p,idx) =>
            p < 0
              ? <span key={`d${idx}`} style={{padding:'4px 2px',color:'#9CA3AF',fontSize:'13px'}}>…</span>
              : <button key={p} onClick={()=>setTrang(p)} style={btnStyle(p)}>{p}</button>
          )}
          <button onClick={()=>setTrang(t=>Math.min(tongTrang,t+1))} disabled={trangHT===tongTrang}
            style={{...btnStyle(0), color:trangHT===tongTrang?'#CCC':'var(--primary)', background:trangHT===tongTrang?'#F9FAFB':'white', cursor:trangHT===tongTrang?'not-allowed':'pointer', fontWeight:600}}>›</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{padding:'20px'}}>
      <style>{`
        .kh-hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:12px;flex-wrap:wrap;}
        .btn-them{background:var(--primary);color:white;border:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;white-space:nowrap;cursor:pointer;}
        .kh-t th,.kh-t td{padding:8px 10px;}
        .kh-t tbody tr:hover td{background:#F0F4FF!important;}
        .ov{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;}
        .mk{background:white;border-radius:12px;padding:24px;width:100%;max-width:460px;max-height:90vh;overflow-y:auto;}
        @media(max-width:900px){.col-dia,.col-ghichu{display:none;}}
      `}</style>

      {/* Header */}
      <div className="kh-hdr">
        <div>
          <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>👥 Khách hàng</h1>
          <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'2px 0 8px'}}>{filtered.length} khách hàng</p>
          <ExcelToolbar loai="KHACH_HANG" danhSach={filtered} tenFile="khach-hang"
            layGiaTri={kh=>[kh['Mã KH']||'',kh['Tên khách hàng']||'',kh['Số điện thoại']||'',kh['Địa chỉ']||'',kh['Đối tượng khách hàng']||'',kh['Ghi chú']||'']}
            onNhap={handleNhap}/>
        </div>
        <button className="btn-them" onClick={moModalThem}>+ Thêm khách hàng</button>
      </div>

      {msg && (
        <div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'14px',fontSize:'13px',background:msgOk?'#D1FAE5':'#FEE2E2',color:msgOk?'#065F46':'#991B1B'}}>
          {msg}
        </div>
      )}

      {/* Filter */}
      <div className="card" style={{padding:'12px 14px',marginBottom:'14px'}}>
        <div style={{display:'flex',gap:'10px',flexWrap:'wrap',alignItems:'center'}}>
          <input className="input" placeholder="🔍 Tìm tên, SĐT, địa chỉ, mã KH..."
            value={search} onChange={e=>setSearch(e.target.value)}
            style={{flex:'1',minWidth:'180px',maxWidth:'300px'}}/>
          <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
            {LOAI.map(l => {
              const c   = l!=='Tất cả' ? loaiColor(l) : null
              const isA = filterLoai === l
              return (
                <button key={l} onClick={()=>setFilterLoai(l)} style={{
                  padding:'5px 12px',borderRadius:'20px',border:'1px solid',
                  borderColor: isA?(c?.c||'var(--primary)'):'var(--border)',
                  background:  isA?(c?.bg||'var(--primary-pale)'):'white',
                  color:       isA?(c?.c||'var(--primary)'):'var(--text-secondary)',
                  fontWeight:  isA?700:400, fontSize:'12px', cursor:'pointer',
                }}>{l}</button>
              )
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
                <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap',padding:'9px 10px'}}>Mã KH</th>
                <th style={{textAlign:'left',fontWeight:700,padding:'9px 10px'}}>Tên khách hàng</th>
                <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap',padding:'9px 10px'}}>Số điện thoại</th>
                <th className="col-dia" style={{textAlign:'left',fontWeight:700,padding:'9px 10px'}}>Địa chỉ</th>
                <th style={{textAlign:'center',fontWeight:700,padding:'9px 10px'}}>Loại</th>
                <th style={{textAlign:'center',fontWeight:700,padding:'9px 10px',width:'220px'}}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {danhSachTrang.length===0 ? (
                <tr><td colSpan={6} style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
                  {search||filterLoai!=='Tất cả' ? 'Không tìm thấy khách hàng nào' : 'Chưa có khách hàng'}
                </td></tr>
              ) : danhSachTrang.map((kh:any, i:number) => {
                const c = loaiColor(kh['Đối tượng khách hàng']||'')
                return (
                  <tr key={kh['Mã KH']||i} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                    <td style={{fontWeight:700,color:'var(--primary)',whiteSpace:'nowrap'}}>
                      {kh['Mã KH'] || <span style={{color:'#9CA3AF',fontSize:'11px',fontWeight:400}}>—</span>}
                    </td>
                    <td style={{fontWeight:600}}>{kh['Tên khách hàng']}</td>
                    <td style={{whiteSpace:'nowrap'}}>
                      {kh['Số điện thoại']
                        ? <a href={`tel:${kh['Số điện thoại']}`} style={{color:'var(--primary)',textDecoration:'none'}}>📞 {kh['Số điện thoại']}</a>
                        : '—'}
                    </td>
                    <td className="col-dia" style={{fontSize:'12px',color:'var(--text-secondary)',maxWidth:'180px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {kh['Địa chỉ']||'—'}
                    </td>
                    <td style={{textAlign:'center'}}>
                      <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:700,background:c.bg,color:c.c,whiteSpace:'nowrap'}}>
                        {kh['Đối tượng khách hàng']||'—'}
                      </span>
                    </td>
                    <td style={{textAlign:'center'}}>
                      <div style={{display:'flex',gap:'4px',justifyContent:'center',flexWrap:'wrap'}}>
                        {/* Tạo đơn */}
                        <a href={urlTaoDon(kh)} style={{padding:'4px 10px',borderRadius:'5px',background:'var(--primary)',color:'white',fontSize:'11px',fontWeight:700,textDecoration:'none',whiteSpace:'nowrap'}}>
                          + Đơn
                        </a>
                        {/* Xem đơn */}
                        <a href={`/dashboard/don-hang?q=${encodeURIComponent(kh['Mã KH']||kh['Tên khách hàng']||'')}`}
                          style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid var(--border)',color:'var(--text-secondary)',fontSize:'11px',textDecoration:'none',whiteSpace:'nowrap'}}>
                          📋
                        </a>
                        {/* Sửa */}
                        <button onClick={()=>moModalSua(kh)}
                          style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid #FCD34D',background:'#FFFBEB',color:'#92400E',fontSize:'11px',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
                          ✏️ Sửa
                        </button>
                        {/* Xóa */}
                        <button onClick={()=>setXoaKH(kh)}
                          style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
                          🗑️
                        </button>
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

      {/* ── MODAL THÊM / SỬA ── */}
      {showModal && (
        <div className="ov" onClick={()=>{setShowModal(false);resetForm()}}>
          <div className="mk" onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>
                {editKH ? '✏️ Sửa thông tin khách hàng' : '+ Thêm khách hàng mới'}
              </h2>
              <button onClick={()=>{setShowModal(false);resetForm()}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>

            {editKH && (
              <div style={{fontSize:'12px',color:'#1E40AF',margin:'0 0 14px',background:'#EFF6FF',padding:'8px 12px',borderRadius:'6px'}}>
                📋 Mã KH: <strong>{editKH['Mã KH']}</strong>
              </div>
            )}
            {!editKH && (
              <p style={{fontSize:'12px',color:'#1E40AF',margin:'0 0 14px',background:'#EFF6FF',padding:'8px 12px',borderRadius:'6px'}}>
                💡 Mã KH được tạo tự động. Khách hàng mới hiện đầu danh sách.
              </p>
            )}

            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              <div>
                <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Tên khách hàng *</label>
                <input className="input" placeholder="Nguyễn Văn A / Công ty ABC..."
                  value={tenKH} onChange={e=>setTenKH(e.target.value)} autoFocus/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Số điện thoại</label>
                  <input className="input" placeholder="0901 234 567" value={sdtKH} onChange={e=>setSdtKH(e.target.value)}/>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Đối tượng</label>
                  <select className="input" value={loaiKH} onChange={e=>setLoaiKH(e.target.value)}>
                    <option>Cá nhân</option><option>Cơ quan</option><option>Công ty</option><option>Đại lý</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Địa chỉ</label>
                <input className="input" placeholder="Số nhà, đường, quận, tỉnh..." value={diaChiKH} onChange={e=>setDiaChiKH(e.target.value)}/>
              </div>
              <div>
                <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Ghi chú</label>
                <input className="input" placeholder="Ghi chú thêm..." value={ghiChuKH} onChange={e=>setGhiChuKH(e.target.value)}/>
              </div>
              <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
                <button onClick={luuKH} disabled={loading}
                  style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:'var(--primary)',color:'white',fontWeight:700,fontSize:'14px',cursor:loading?'not-allowed':'pointer'}}>
                  {loading ? '⏳ Đang lưu...' : editKH ? '✅ Cập nhật' : '✅ Lưu khách hàng'}
                </button>
                <button onClick={()=>{setShowModal(false);resetForm()}}
                  style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px'}}>
                  Huỷ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL XÁC NHẬN XÓA ── */}
      {xoaKH && (
        <div className="ov" onClick={()=>setXoaKH(null)}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'380px'}} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:'center',marginBottom:'16px'}}>
              <div style={{fontSize:'40px',marginBottom:'8px'}}>🗑️</div>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:'0 0 6px'}}>Xác nhận xóa khách hàng</h2>
              <p style={{fontSize:'13px',color:'#6B7280',margin:0}}>
                Bạn có chắc muốn xóa <strong>{xoaKH['Tên khách hàng']}</strong> ({xoaKH['Mã KH']})?
              </p>
              <p style={{fontSize:'12px',color:'#DC2626',margin:'8px 0 0',background:'#FEF2F2',padding:'6px 10px',borderRadius:'6px'}}>
                ⚠️ Hành động này không thể hoàn tác!
              </p>
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={xacNhanXoa} disabled={dangXoa}
                style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:dangXoa?'#9CA3AF':'#DC2626',color:'white',fontWeight:700,fontSize:'14px',cursor:dangXoa?'not-allowed':'pointer'}}>
                {dangXoa ? '⏳ Đang xóa...' : '🗑️ Xóa'}
              </button>
              <button onClick={()=>setXoaKH(null)}
                style={{flex:1,padding:'11px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px',fontWeight:600}}>
                Huỷ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
