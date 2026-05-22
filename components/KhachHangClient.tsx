'use client'
// components/KhachHangClient.tsx — v5.0
// Sửa: Id đúng cho Sửa/Xóa, KH mới luôn đầu, validate SĐT 10 số

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserSession } from '@/lib/auth'
import ExcelToolbar from '@/components/ExcelToolbar'

function boDau(s: string) {
  return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()
}

// Validate SĐT Việt Nam: đúng 10 số, bắt đầu bằng 0
function validateSdt(sdt: string): string {
  if (!sdt.trim()) return '' // SĐT không bắt buộc
  const digits = sdt.replace(/\D/g, '') // chỉ giữ số
  if (digits.length !== 10) return `SĐT phải đúng 10 số (hiện có ${digits.length} số)`
  if (!digits.startsWith('0')) return 'SĐT Việt Nam phải bắt đầu bằng số 0'
  return ''
}

const LOAI    = ['Tất cả','Cá nhân','Cơ quan','Công ty','Đại lý']
const SO_DONG = 10

// ── Tạo key duy nhất cho mỗi KH để React render đúng thứ tự ──
let _seq = Date.now()
function nextKey() { return String(++_seq) }

export default function KhachHangClient({ khachHang, user }: { khachHang: any[]; user: UserSession }) {
  const router = useRouter()

  // ── Gán _key cho mỗi KH từ server để React giữ đúng thứ tự ──
  const [localKH,    setLocalKH]    = useState<any[]>(() =>
    khachHang.map(kh => ({ ...kh, _key: nextKey() }))
  )
  const [search,     setSearch]     = useState('')
  const [filterLoai, setFilterLoai] = useState('Tất cả')
  const [trang,      setTrang]      = useState(1)
  const [msg,        setMsg]        = useState('')
  const [msgOk,      setMsgOk]      = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [editKH,    setEditKH]    = useState<any>(null)
  const [loading,   setLoading]   = useState(false)

  const [tenKH,    setTenKH]    = useState('')
  const [sdtKH,    setSdtKH]    = useState('')
  const [sdtErr,   setSdtErr]   = useState('')
  const [diaChiKH, setDiaChiKH] = useState('')
  const [loaiKH,   setLoaiKH]   = useState('Cá nhân')
  const [ghiChuKH, setGhiChuKH] = useState('')

  const [xoaKH,   setXoaKH]   = useState<any>(null)
  const [dangXoa, setDangXoa] = useState(false)

  // Lọc
  const filtered = useMemo(() => localKH.filter((kh:any) => {
    if (filterLoai !== 'Tất cả' && kh['Đối tượng khách hàng'] !== filterLoai) return false
    if (!search.trim()) return true
    const q = boDau(search)
    return (
      boDau(kh['Tên khách hàng']||'').includes(q) ||
      (kh['Số điện thoại']||'').includes(search) ||
      boDau(kh['Mã KH']||'').includes(q) ||
      boDau(kh['Địa chỉ']||'').includes(q)
    )
  }), [localKH, search, filterLoai])

  // Reset trang khi filter thay đổi
  useEffect(() => { setTrang(1) }, [search, filterLoai])

  // Phân trang
  const tongTrang     = Math.max(1, Math.ceil(filtered.length / SO_DONG))
  const trangHT       = Math.min(trang, tongTrang)
  const danhSachTrang = filtered.slice((trangHT-1)*SO_DONG, trangHT*SO_DONG)

  function resetForm() {
    setTenKH(''); setSdtKH(''); setSdtErr(''); setDiaChiKH('')
    setLoaiKH('Cá nhân'); setGhiChuKH(''); setEditKH(null)
  }

  function moModalThem() { resetForm(); setShowModal(true) }

  function moModalSua(kh: any) {
    setEditKH(kh)
    setTenKH(kh['Tên khách hàng']||'')
    setSdtKH(kh['Số điện thoại']||'')
    setSdtErr('')
    setDiaChiKH(kh['Địa chỉ']||'')
    setLoaiKH(kh['Đối tượng khách hàng']||'Cá nhân')
    setGhiChuKH(kh['Ghi chú']||'')
    setShowModal(true)
  }

  function handleSdtChange(val: string) {
    setSdtKH(val)
    if (val.trim()) setSdtErr(validateSdt(val))
    else setSdtErr('')
  }

  function urlTaoDon(kh: any) {
    const maKH = kh['Mã KH'] || ''
    if (maKH) return `/dashboard/don-hang/tao?maKH=${encodeURIComponent(maKH)}`
    const ten    = encodeURIComponent(kh['Tên khách hàng'] || '')
    const sdt    = encodeURIComponent(kh['Số điện thoại']  || '')
    const diaChi = encodeURIComponent(kh['Địa chỉ']        || '')
    return `/dashboard/don-hang/tao?tenKH=${ten}&sdtKH=${sdt}&diaChiKH=${diaChi}`
  }

  // Lấy rowId từ KH object — NocoDB có thể trả Id hoặc id
  function getRowId(kh: any): number | null {
    const v = kh['Id'] ?? kh['id'] ?? kh['ID'] ?? null
    return v !== null ? Number(v) : null
  }

  async function luuKH() {
    if (!tenKH.trim()) { setMsg('Vui lòng nhập tên khách hàng'); setMsgOk(false); return }
    const sdtErrMsg = validateSdt(sdtKH)
    if (sdtErrMsg) { setSdtErr(sdtErrMsg); return }
    setLoading(true); setMsg('')

    try {
      if (editKH) {
        // ── SỬA ──
        const rowId = getRowId(editKH)
        if (!rowId) throw new Error('Không tìm thấy ID khách hàng để cập nhật')

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

        // Cập nhật localKH giữ nguyên vị trí
        setLocalKH(prev => prev.map(kh =>
          kh['_key'] === editKH['_key']
            ? { ...kh, 'Tên khách hàng': tenKH.trim(), 'Số điện thoại': sdtKH.trim(), 'Địa chỉ': diaChiKH.trim(), 'Đối tượng khách hàng': loaiKH, 'Ghi chú': ghiChuKH.trim() }
            : kh
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
        if (!res.ok) throw new Error(data.message || 'Lỗi thêm khách hàng')

        // Lấy dữ liệu đầy đủ từ server (có cả Id thực)
        const khData = data.data || {}
        const maKHMoi = data['Mã KH'] || khData['Mã KH'] || ''

        const khMoi: any = {
          // ✅ Lưu đủ Id để Sửa/Xóa hoạt động
          'Id':                    khData['Id'] ?? khData['id'] ?? '',
          'id':                    khData['id'] ?? khData['Id'] ?? '',
          'Mã KH':                 maKHMoi,
          'Tên khách hàng':        tenKH.trim(),
          'Số điện thoại':         sdtKH.trim(),
          'Địa chỉ':               diaChiKH.trim(),
          'Đối tượng khách hàng':  loaiKH,
          'Ghi chú':               ghiChuKH.trim(),
          'Ngày tạo':              new Date().toISOString(),
          '_key':                  nextKey(), // key duy nhất để React render đúng
        }

        // ✅ Thêm vào ĐẦU mảng — KH mới nhất luôn vị trí 1
        setLocalKH(prev => [khMoi, ...prev])
        setTrang(1)
        setMsg('✅ Đã thêm: ' + tenKH.trim() + (maKHMoi ? ` (${maKHMoi})` : '')); setMsgOk(true)
      }

      resetForm(); setShowModal(false)
    } catch (err: any) {
      setMsg('❌ ' + (err.message || 'Có lỗi xảy ra')); setMsgOk(false)
    } finally {
      setLoading(false)
      setTimeout(() => setMsg(''), 6000)
    }
  }

  // ── XÓA ──
  async function xacNhanXoa() {
    if (!xoaKH) return
    const rowId = getRowId(xoaKH)
    if (!rowId) { setMsg('❌ Không tìm thấy ID để xóa'); setMsgOk(false); setXoaKH(null); return }

    setDangXoa(true)
    try {
      const res = await fetch(`/api/khach-hang?id=${rowId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Lỗi xóa')

      setLocalKH(prev => prev.filter(kh => kh['_key'] !== xoaKH['_key']))
      setMsg('✅ Đã xóa: ' + xoaKH['Tên khách hàng']); setMsgOk(true)
      setXoaKH(null)
    } catch (err: any) {
      setMsg('❌ ' + (err.message || 'Lỗi xóa')); setMsgOk(false)
    } finally {
      setDangXoa(false)
      setTimeout(() => setMsg(''), 6000)
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

  function PhanTrang() {
    if (tongTrang <= 1) return null
    const pages = Array.from({length: tongTrang}, (_,i) => i+1)
    let hienThi: number[]
    if (tongTrang <= 7) hienThi = pages
    else if (trangHT <= 4) hienThi = [...pages.slice(0,5), -1, tongTrang]
    else if (trangHT >= tongTrang-3) hienThi = [1, -1, ...pages.slice(tongTrang-5)]
    else hienThi = [1, -1, trangHT-1, trangHT, trangHT+1, -2, tongTrang]

    return (
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderTop:'1px solid #F0F0F0',flexWrap:'wrap',gap:'8px'}}>
        <span style={{fontSize:'12px',color:'var(--text-secondary)'}}>
          {(trangHT-1)*SO_DONG+1}–{Math.min(trangHT*SO_DONG,filtered.length)} / {filtered.length} KH
        </span>
        <div style={{display:'flex',gap:'4px'}}>
          <BtnPage disabled={trangHT===1} onClick={()=>setTrang(t=>t-1)}>‹</BtnPage>
          {hienThi.map((p,i) => p<0
            ? <span key={`d${i}`} style={{padding:'4px 2px',color:'#9CA3AF'}}>…</span>
            : <BtnPage key={p} active={p===trangHT} onClick={()=>setTrang(p)}>{p}</BtnPage>
          )}
          <BtnPage disabled={trangHT===tongTrang} onClick={()=>setTrang(t=>t+1)}>›</BtnPage>
        </div>
      </div>
    )
  }

  return (
    <div style={{padding:'20px'}}>
      <style>{`
        .kh-hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:12px;flex-wrap:wrap;}
        .btn-them{background:var(--primary);color:white;border:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer;}
        .kh-t td{padding:8px 10px;border-bottom:1px solid #F0F0F0;}
        .kh-t th{padding:9px 10px;}
        .kh-t tbody tr:hover td{background:#F0F4FF!important;}
        .ov{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;}
        .mk{background:white;border-radius:12px;padding:24px;width:100%;max-width:460px;max-height:90vh;overflow-y:auto;}
        @media(max-width:900px){.col-dia{display:none;}}
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

      {msg && <div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'14px',fontSize:'13px',background:msgOk?'#D1FAE5':'#FEE2E2',color:msgOk?'#065F46':'#991B1B'}}>{msg}</div>}

      {/* Filter */}
      <div className="card" style={{padding:'12px 14px',marginBottom:'14px'}}>
        <div style={{display:'flex',gap:'10px',flexWrap:'wrap',alignItems:'center'}}>
          <input className="input" placeholder="🔍 Tìm tên, SĐT, địa chỉ, mã KH..."
            value={search} onChange={e=>setSearch(e.target.value)} style={{flex:'1',minWidth:'180px',maxWidth:'300px'}}/>
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
                <th style={{textAlign:'center',fontWeight:700,width:'200px'}}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {danhSachTrang.length===0 ? (
                <tr><td colSpan={6} style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
                  {search||filterLoai!=='Tất cả'?'Không tìm thấy':'Chưa có khách hàng'}
                </td></tr>
              ) : danhSachTrang.map((kh:any,i:number)=>{
                const c=loaiColor(kh['Đối tượng khách hàng']||'')
                return (
                  <tr key={kh['_key']||i} style={{background:i%2===0?'white':'#FAFBFD'}}>
                    <td style={{fontWeight:700,color:'var(--primary)',whiteSpace:'nowrap'}}>
                      {kh['Mã KH']||<span style={{color:'#9CA3AF',fontWeight:400,fontSize:'11px'}}>—</span>}
                    </td>
                    <td style={{fontWeight:600}}>{kh['Tên khách hàng']}</td>
                    <td style={{whiteSpace:'nowrap'}}>
                      {kh['Số điện thoại']
                        ?<a href={`tel:${kh['Số điện thoại']}`} style={{color:'var(--primary)',textDecoration:'none'}}>📞 {kh['Số điện thoại']}</a>
                        :'—'}
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
                      <div style={{display:'flex',gap:'4px',justifyContent:'center'}}>
                        <a href={urlTaoDon(kh)} style={{padding:'4px 10px',borderRadius:'5px',background:'var(--primary)',color:'white',fontSize:'11px',fontWeight:700,textDecoration:'none',whiteSpace:'nowrap'}}>+ Đơn</a>
                        <a href={`/dashboard/don-hang?q=${encodeURIComponent(kh['Mã KH']||kh['Tên khách hàng']||'')}`} style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid var(--border)',color:'var(--text-secondary)',fontSize:'11px',textDecoration:'none'}}>📋</a>
                        <button onClick={()=>moModalSua(kh)} style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid #FCD34D',background:'#FFFBEB',color:'#92400E',fontSize:'11px',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>✏️ Sửa</button>
                        <button onClick={()=>setXoaKH(kh)} style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',fontWeight:600,cursor:'pointer'}}>🗑️</button>
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
      {showModal&&(
        <div className="ov" onClick={()=>{setShowModal(false);resetForm()}}>
          <div className="mk" onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>{editKH?'✏️ Sửa khách hàng':'+ Thêm khách hàng mới'}</h2>
              <button onClick={()=>{setShowModal(false);resetForm()}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            {editKH&&<div style={{fontSize:'12px',color:'#1E40AF',margin:'0 0 14px',background:'#EFF6FF',padding:'8px 12px',borderRadius:'6px'}}>📋 Mã KH: <strong>{editKH['Mã KH']}</strong></div>}
            {!editKH&&<p style={{fontSize:'12px',color:'#1E40AF',margin:'0 0 14px',background:'#EFF6FF',padding:'8px 12px',borderRadius:'6px'}}>💡 Mã KH tự động. KH mới hiện đầu danh sách.</p>}
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              <div>
                <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Tên khách hàng *</label>
                <input className="input" placeholder="Nguyễn Văn A / Công ty ABC..." value={tenKH} onChange={e=>setTenKH(e.target.value)} autoFocus/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Số điện thoại</label>
                  <input className="input" placeholder="0901234567" value={sdtKH}
                    onChange={e=>handleSdtChange(e.target.value)}
                    style={{borderColor:sdtErr?'#EF4444':'',outline:sdtErr?'1px solid #EF4444':''}}/>
                  {sdtErr&&<div style={{fontSize:'11px',color:'#DC2626',marginTop:'3px'}}>⚠️ {sdtErr}</div>}
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
                <input className="input" placeholder="Số nhà, đường, quận..." value={diaChiKH} onChange={e=>setDiaChiKH(e.target.value)}/>
              </div>
              <div>
                <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Ghi chú</label>
                <input className="input" placeholder="Ghi chú thêm..." value={ghiChuKH} onChange={e=>setGhiChuKH(e.target.value)}/>
              </div>
              <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
                <button onClick={luuKH} disabled={loading||!!sdtErr}
                  style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:(loading||!!sdtErr)?'#9CA3AF':'var(--primary)',color:'white',fontWeight:700,fontSize:'14px',cursor:(loading||!!sdtErr)?'not-allowed':'pointer'}}>
                  {loading?'⏳ Đang lưu...':editKH?'✅ Cập nhật':'✅ Lưu khách hàng'}
                </button>
                <button onClick={()=>{setShowModal(false);resetForm()}} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px'}}>Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL XÁC NHẬN XÓA ── */}
      {xoaKH&&(
        <div className="ov" onClick={()=>setXoaKH(null)}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'360px'}} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:'center',marginBottom:'16px'}}>
              <div style={{fontSize:'36px',marginBottom:'8px'}}>🗑️</div>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:'0 0 6px'}}>Xác nhận xóa</h2>
              <p style={{fontSize:'13px',color:'#6B7280',margin:0}}>Xóa <strong>{xoaKH['Tên khách hàng']}</strong> ({xoaKH['Mã KH']})?</p>
              <p style={{fontSize:'12px',color:'#DC2626',margin:'8px 0 0',background:'#FEF2F2',padding:'6px 10px',borderRadius:'6px'}}>⚠️ Không thể hoàn tác!</p>
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={xacNhanXoa} disabled={dangXoa} style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:dangXoa?'#9CA3AF':'#DC2626',color:'white',fontWeight:700,fontSize:'14px',cursor:dangXoa?'not-allowed':'pointer'}}>
                {dangXoa?'⏳ Đang xóa...':'🗑️ Xóa'}
              </button>
              <button onClick={()=>setXoaKH(null)} style={{flex:1,padding:'11px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px',fontWeight:600}}>Huỷ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Nút phân trang ──
function BtnPage({ children, active, disabled, onClick }: { children:any; active?:boolean; disabled?:boolean; onClick:()=>void }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding:'4px 10px', borderRadius:'5px', border:'1px solid',
      borderColor: active ? 'var(--primary)' : 'var(--border)',
      background:  active ? 'var(--primary)' : disabled ? '#F9FAFB' : 'white',
      color:       active ? 'white' : disabled ? '#CCC' : 'var(--text-secondary)',
      cursor:      disabled ? 'not-allowed' : 'pointer',
      fontSize:'13px', fontWeight: active ? 700 : 400, minWidth:'32px',
    }}>
      {children}
    </button>
  )
}
