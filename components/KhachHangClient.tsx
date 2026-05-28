'use client'
// components/KhachHangClient.tsx — v6.0
// Sửa dứt điểm: Id đúng, KH mới lên đầu, validate SĐT 10 số

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { UserSession } from '@/lib/auth'
import ExcelToolbar from '@/components/ExcelToolbar'

function boDau(s: string) {
  return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()
}

function validateSdt(sdt: string): string {
  if (!sdt.trim()) return ''
  const digits = sdt.replace(/\D/g, '')
  if (digits.length !== 10) return `SĐT phải đúng 10 số (đang có ${digits.length} số)`
  if (!digits.startsWith('0')) return 'SĐT Việt Nam phải bắt đầu bằng số 0'
  return ''
}

const LOAI    = ['Tất cả','Cá nhân','Cơ quan','Công ty','Đại lý']
const SO_DONG = 10

export default function KhachHangClient({ khachHang, donHuyCanHoan, congNoMap, donHangTheoKH, user }: {
  khachHang: any[]
  donHuyCanHoan: Record<string, {tienHoan:number; tinhTrang:string}>
  congNoMap: Record<string, number>
  donHangTheoKH: Record<string, any[]>  // maKH → danh sách đơn còn nợ
  user: UserSession
}) {
  const router  = useRouter()
  const seqRef  = useRef(0)
  const nextKey = () => `k${++seqRef.current}`

  // Gán _key và _rowId cho từng KH từ server
  const [localKH, setLocalKH] = useState<any[]>(() =>
    khachHang.map(kh => ({
      ...kh,
      _key:   nextKey(),
      _rowId: Number(kh['Id'] ?? kh['id'] ?? 0), // ✅ lưu rowId ngay khi init
    }))
  )

  // Danh sách địa chỉ duy nhất để gợi ý
  const danhSachDiaChi = useMemo(() => {
    const set = new Set<string>()
    localKH.forEach(kh => { if (kh['Địa chỉ']?.trim()) set.add(kh['Địa chỉ'].trim()) })
    return Array.from(set).sort()
  }, [localKH])

  const [search,     setSearch]     = useState('')
  const [filterLoai, setFilterLoai] = useState('Tất cả')
  const [trang,      setTrang]      = useState(1)
  const [msg,        setMsg]        = useState('')
  const [msgOk,      setMsgOk]      = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [editKH,     setEditKH]     = useState<any>(null)
  const [loading,    setLoading]    = useState(false)
  const [tenKH,      setTenKH]      = useState('')
  const [sdtKH,      setSdtKH]      = useState('')
  const [sdtErr,     setSdtErr]     = useState('')
  const [diaChiKH,   setDiaChiKH]   = useState('')
  const [loaiKH,     setLoaiKH]     = useState('Cá nhân')
  const [ghiChuKH,   setGhiChuKH]   = useState('')
  const [goiYDiaChi, setGoiYDiaChi] = useState<string[]>([])
  const [showGoiY,   setShowGoiY]   = useState(false)
  const [xoaKH,      setXoaKH]      = useState<any>(null)
  const [dangXoa,    setDangXoa]    = useState(false)

  // Popup thu nợ
  const [popupNoKH,   setPopupNoKH]   = useState<any>(null) // KH đang xử lý thu nợ
  const [donNoChon,   setDonNoChon]   = useState<any>(null) // đơn được chọn
  const [tienMatThu,  setTienMatThu]  = useState(0)
  const [ckThu,       setCkThu]       = useState(0)
  const [dangThuNo,   setDangThuNo]   = useState(false)

  // Popup hoàn cọc
  const [popupHoanKH, setPopupHoanKH] = useState<any>(null) // KH đang xử lý hoàn cọc
  const [dangHoan,    setDangHoan]    = useState(false)

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

  useEffect(() => { setTrang(1) }, [search, filterLoai])

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
    setSdtKH(kh['Số điện thoại']||''); setSdtErr('')
    setDiaChiKH(kh['Địa chỉ']||'')
    setLoaiKH(kh['Đối tượng khách hàng']||'Cá nhân')
    setGhiChuKH(kh['Ghi chú']||'')
    setShowModal(true)
  }

  function urlTaoDon(kh: any) {
    const maKH = kh['Mã KH'] || ''
    if (maKH) return `/dashboard/don-hang/tao?maKH=${encodeURIComponent(maKH)}`
    return `/dashboard/don-hang/tao?tenKH=${encodeURIComponent(kh['Tên khách hàng']||'')}&sdtKH=${encodeURIComponent(kh['Số điện thoại']||'')}&diaChiKH=${encodeURIComponent(kh['Địa chỉ']||'')}`
  }

  function showMsg(text: string, ok: boolean) {
    setMsg(text); setMsgOk(ok)
    setTimeout(() => setMsg(''), 6000)
  }

  async function luuKH() {
    if (!tenKH.trim()) { showMsg('Vui lòng nhập tên khách hàng', false); return }
    const err = validateSdt(sdtKH)
    if (err) { setSdtErr(err); return }
    setLoading(true)

    try {
      if (editKH) {
        // ── SỬA ──
        const rowId = editKH['_rowId']
        if (!rowId) throw new Error('Không tìm thấy ID — vui lòng tải lại trang')

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

        setLocalKH(prev => prev.map(kh => kh['_key'] === editKH['_key']
          ? { ...kh, 'Tên khách hàng': tenKH.trim(), 'Số điện thoại': sdtKH.trim(), 'Địa chỉ': diaChiKH.trim(), 'Đối tượng khách hàng': loaiKH, 'Ghi chú': ghiChuKH.trim() }
          : kh
        ))
        showMsg('✅ Đã cập nhật: ' + tenKH.trim(), true)

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
        if (!res.ok) throw new Error(data.message || 'Lỗi thêm')

        const rec    = data.data || {}
        const rowId  = Number(rec['Id'] ?? rec['id'] ?? 0)
        const maKHMoi = data['Mã KH'] || rec['Mã KH'] || ''

        const khMoi = {
          'Id':                    rowId,
          'id':                    rowId,
          '_rowId':                rowId,   // ✅ lưu _rowId để Sửa/Xóa dùng
          '_key':                  nextKey(),
          'Mã KH':                 maKHMoi,
          'Tên khách hàng':        tenKH.trim(),
          'Số điện thoại':         sdtKH.trim(),
          'Địa chỉ':               diaChiKH.trim(),
          'Đối tượng khách hàng':  loaiKH,
          'Ghi chú':               ghiChuKH.trim(),
          'Ngày tạo':              new Date().toISOString().split('T')[0],
        }

        setLocalKH(prev => [khMoi, ...prev]) // ✅ đầu mảng
        setTrang(1)
        showMsg(`✅ Đã thêm: ${tenKH.trim()}${maKHMoi ? ` (${maKHMoi})` : ''}`, true)
      }

      resetForm(); setShowModal(false)
    } catch (err: any) {
      showMsg('❌ ' + (err.message || 'Có lỗi'), false)
    } finally {
      setLoading(false)
    }
  }

  async function xacNhanXoa() {
    if (!xoaKH) return
    const rowId = xoaKH['_rowId']
    if (!rowId) {
      showMsg('❌ Không tìm thấy ID — vui lòng tải lại trang', false)
      setXoaKH(null); return
    }
    setDangXoa(true)
    try {
      const res = await fetch(`/api/khach-hang?id=${rowId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Lỗi xóa')
      setLocalKH(prev => prev.filter(kh => kh['_key'] !== xoaKH['_key']))
      showMsg('✅ Đã xóa: ' + xoaKH['Tên khách hàng'], true)
      setXoaKH(null)
    } catch (err: any) {
      showMsg('❌ ' + (err.message || 'Lỗi xóa'), false)
    } finally { setDangXoa(false) }
  }

  // ── Thu nợ ──
  async function luuThuNo() {
    const tongThu = (tienMatThu||0) + (ckThu||0)
    if (!donNoChon || tongThu <= 0) return
    setDangThuNo(true)
    try {
      const conMoi = Math.max(0, Number(donNoChon['Còn phải thu']||0) - tongThu)
      await fetch('/api/don-hang', {
        method: 'PATCH', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ id: donNoChon['Id']||donNoChon['id'], 'Còn phải thu': conMoi }),
      })
      showMsg(`✅ Đã thu ${tongThu.toLocaleString('vi-VN')}đ từ ${popupNoKH['Tên khách hàng']}`, true)
      setPopupNoKH(null); setDonNoChon(null); setTienMatThu(0); setCkThu(0)
      // Refresh để cập nhật số liệu
      window.location.reload()
    } catch(e:any) { showMsg('❌ '+(e.message||'Lỗi'), false) }
    finally { setDangThuNo(false) }
  }

  // ── Hoàn cọc ──
  async function luuHoanCoc() {
    if (!popupHoanKH) return
    setDangHoan(true)
    const hoan = donHuyCanHoan[popupHoanKH['Mã KH']]
    // Tìm đơn hủy của KH này để lấy Id
    const donHuy = (donHangTheoKH[popupHoanKH['Mã KH']]||[])
      .find((d:any) => d['Tiền hoàn cọc']>0 && d['Tình trạng hoàn cọc']!=='Đã hoàn')
    try {
      if (donHuy) {
        await fetch('/api/don-hang', {
          method:'PATCH', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ id: donHuy['Id']||donHuy['id'], 'Tình trạng hoàn cọc':'Đã hoàn' }),
        })
      }
      showMsg(`✅ Đã hoàn ${hoan?.tienHoan.toLocaleString('vi-VN')}đ cho ${popupHoanKH['Tên khách hàng']}`, true)
      setPopupHoanKH(null)
      window.location.reload()
    } catch(e:any) { showMsg('❌ '+(e.message||'Lỗi'), false) }
    finally { setDangHoan(false) }
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
          {(trangHT-1)*SO_DONG+1}–{Math.min(trangHT*SO_DONG, filtered.length)} / {filtered.length} KH
        </span>
        <div style={{display:'flex',gap:'4px'}}>
          <Btn disabled={trangHT===1} onClick={()=>setTrang(t=>t-1)}>‹</Btn>
          {hienThi.map((p,i) => p<0
            ? <span key={`d${i}`} style={{padding:'4px 2px',color:'#9CA3AF',fontSize:'13px'}}>…</span>
            : <Btn key={p} active={p===trangHT} onClick={()=>setTrang(p)}>{p}</Btn>
          )}
          <Btn disabled={trangHT===tongTrang} onClick={()=>setTrang(t=>t+1)}>›</Btn>
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
                <th style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>Còn nợ</th>
                <th style={{textAlign:'center',fontWeight:700,whiteSpace:'nowrap'}}>Hoàn cọc</th>
                <th style={{textAlign:'center',fontWeight:700,width:'200px'}}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {danhSachTrang.length===0 ? (
                <tr><td colSpan={8} style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
                  {search||filterLoai!=='Tất cả'?'Không tìm thấy':'Chưa có khách hàng'}
                </td></tr>
              ) : danhSachTrang.map((kh:any,i:number) => {
                const c = loaiColor(kh['Đối tượng khách hàng']||'')
                return (
                  <tr key={kh['_key']} style={{background:i%2===0?'white':'#FAFBFD'}}>
                    <td style={{fontWeight:700,color:'var(--primary)',whiteSpace:'nowrap'}}>
                      {kh['Mã KH'] || <span style={{color:'#9CA3AF',fontWeight:400,fontSize:'11px'}}>—</span>}
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
                    {/* Cột Còn nợ — click để thu */}
                    <td style={{textAlign:'right',whiteSpace:'nowrap'}}>
                      {(congNoMap[kh['Mã KH']]||0) > 0 ? (
                        <button onClick={()=>{setPopupNoKH(kh);setDonNoChon(null);setSoTienThu(0)}}
                          style={{background:'none',border:'none',cursor:'pointer',color:'#DC2626',fontWeight:700,fontSize:'12px',textDecoration:'underline dotted',padding:0}}>
                          {(congNoMap[kh['Mã KH']]||0).toLocaleString('vi-VN')}đ
                        </button>
                      ) : (
                        <span style={{color:'#9CA3AF',fontSize:'12px'}}>—</span>
                      )}
                    </td>
                    {/* Cột Hoàn cọc — chỉ hiện khi Chờ hoàn */}
                    <td style={{textAlign:'center'}}>
                      {donHuyCanHoan[kh['Mã KH']] && 
                       donHuyCanHoan[kh['Mã KH']].tienHoan > 0 &&
                       donHuyCanHoan[kh['Mã KH']].tinhTrang !== 'Đã hoàn' ? (
                        <button onClick={()=>setPopupHoanKH(kh)}
                          style={{background:'#FFFBEB',border:'1px solid #FCD34D',borderRadius:'6px',cursor:'pointer',padding:'3px 8px',display:'flex',flexDirection:'column',alignItems:'center',gap:'1px'}}>
                          <span style={{fontSize:'11px',fontWeight:700,color:'#D97706'}}>⚠️ Chờ hoàn</span>
                          <span style={{fontSize:'10px',color:'#92400E'}}>{donHuyCanHoan[kh['Mã KH']].tienHoan.toLocaleString('vi-VN')}đ</span>
                        </button>
                      ) : (
                        <span style={{color:'#9CA3AF',fontSize:'12px'}}>—</span>
                      )}
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

      {/* MODAL THÊM / SỬA */}
      {showModal&&(
        <div className="ov" onClick={()=>{setShowModal(false);resetForm()}}>
          <div className="mk" onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>{editKH?'✏️ Sửa khách hàng':'+ Thêm khách hàng mới'}</h2>
              <button onClick={()=>{setShowModal(false);resetForm()}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            {editKH
              ? <div style={{fontSize:'12px',color:'#1E40AF',margin:'0 0 14px',background:'#EFF6FF',padding:'8px 12px',borderRadius:'6px'}}>📋 Mã KH: <strong>{editKH['Mã KH']}</strong></div>
              : <p style={{fontSize:'12px',color:'#1E40AF',margin:'0 0 14px',background:'#EFF6FF',padding:'8px 12px',borderRadius:'6px'}}>💡 Mã KH tự động. KH mới hiện đầu danh sách.</p>
            }
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              <div>
                <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Tên khách hàng *</label>
                <input className="input" placeholder="Nguyễn Văn A / Công ty ABC..." value={tenKH} onChange={e=>setTenKH(e.target.value)} autoFocus/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Số điện thoại</label>
                  <input className="input" placeholder="0901234567 (10 số)" value={sdtKH}
                    onChange={e=>{setSdtKH(e.target.value); setSdtErr(e.target.value.trim()?validateSdt(e.target.value):'' )}}
                    style={{borderColor:sdtErr?'#EF4444':''}}/>
                  {sdtErr && <div style={{fontSize:'11px',color:'#DC2626',marginTop:'3px'}}>⚠️ {sdtErr}</div>}
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Đối tượng</label>
                  <select className="input" value={loaiKH} onChange={e=>setLoaiKH(e.target.value)}>
                    <option>Cá nhân</option><option>Cơ quan</option><option>Công ty</option><option>Đại lý</option>
                  </select>
                </div>
              </div>
              <div style={{position:'relative'}}>
                <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Địa chỉ</label>
                <input className="input" placeholder="Số nhà, đường, phường..." value={diaChiKH}
                  onChange={e=>{
                    setDiaChiKH(e.target.value)
                    if (e.target.value.trim().length >= 1) {
                      const q = boDau(e.target.value.trim())
                      const goi = danhSachDiaChi.filter(d => boDau(d).includes(q)).slice(0,6)
                      setGoiYDiaChi(goi); setShowGoiY(goi.length > 0)
                    } else { setShowGoiY(false) }
                  }}
                  onFocus={()=>{ if(diaChiKH.trim().length>=1&&goiYDiaChi.length>0) setShowGoiY(true) }}
                  onBlur={()=>setTimeout(()=>setShowGoiY(false),200)}/>
                {showGoiY&&goiYDiaChi.length>0&&(
                  <div style={{position:'absolute',top:'calc(100% + 2px)',left:0,right:0,zIndex:100,background:'white',border:'1px solid var(--border)',borderRadius:'6px',boxShadow:'0 4px 12px rgba(0,0,0,.1)',maxHeight:'160px',overflowY:'auto'}}>
                    {goiYDiaChi.map((d,i)=>(
                      <div key={i} onMouseDown={e=>{e.preventDefault();setDiaChiKH(d);setShowGoiY(false)}}
                        style={{padding:'7px 12px',cursor:'pointer',fontSize:'12px',borderBottom:'1px solid #F3F4F6'}}
                        onMouseEnter={e=>(e.currentTarget.style.background='#F0F9FF')}
                        onMouseLeave={e=>(e.currentTarget.style.background='white')}>
                        📍 {d}
                      </div>
                    ))}
                  </div>
                )}
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

      {/* ── POPUP THU NỢ ── */}
      {popupNoKH&&(
        <div className="ov" onClick={()=>setPopupNoKH(null)}>
          <div className="mk" style={{maxWidth:'480px'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>💵 Thu nợ khách hàng</h2>
              <button onClick={()=>setPopupNoKH(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            <div style={{background:'#FEF2F2',borderRadius:'8px',padding:'10px 14px',marginBottom:'14px'}}>
              <div style={{fontWeight:700,fontSize:'14px'}}>{popupNoKH['Tên khách hàng']}</div>
              <div style={{fontSize:'12px',color:'#6B7280'}}>{popupNoKH['Số điện thoại']||''}</div>
              <div style={{fontSize:'13px',fontWeight:700,color:'#DC2626',marginTop:'4px'}}>
                Tổng còn nợ: {(congNoMap[popupNoKH['Mã KH']]||0).toLocaleString('vi-VN')}đ
              </div>
            </div>

            {/* Danh sách đơn còn nợ */}
            <div style={{marginBottom:'14px'}}>
              <label style={{fontSize:'12px',fontWeight:700,display:'block',marginBottom:'6px'}}>Chọn đơn hàng cần thu:</label>
              <div style={{display:'flex',flexDirection:'column',gap:'6px',maxHeight:'200px',overflowY:'auto'}}>
                {(donHangTheoKH[popupNoKH['Mã KH']]||[]).map((don:any,i:number)=>(
                  <div key={i} onClick={()=>{setDonNoChon(don);setSoTienThu(Number(don['Còn phải thu']||0))}}
                    style={{padding:'10px 12px',borderRadius:'8px',border:'2px solid',cursor:'pointer',
                      borderColor:donNoChon?.['Mã đơn hàng']===don['Mã đơn hàng']?'#DC2626':'#E5E7EB',
                      background:donNoChon?.['Mã đơn hàng']===don['Mã đơn hàng']?'#FEF2F2':'white'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontWeight:700,color:'var(--primary)',fontSize:'13px'}}>{don['Mã đơn hàng']}</span>
                      <span style={{fontWeight:800,color:'#DC2626',fontSize:'14px'}}>{Number(don['Còn phải thu']||0).toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div style={{fontSize:'11px',color:'#6B7280',marginTop:'2px'}}>
                      {don['Trạng thái']||''} · {don['Kênh bán']||''}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {donNoChon&&(
              <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                <div style={{background:'#EFF6FF',borderRadius:'8px',padding:'10px 14px',fontSize:'12px',color:'#1E40AF'}}>
                  📋 Đơn <strong>{donNoChon['Mã đơn hàng']}</strong> — Còn nợ: <strong>{Number(donNoChon['Còn phải thu']||0).toLocaleString('vi-VN')}đ</strong>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  <div>
                    <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>💵 Tiền mặt (đ)</label>
                    <input className="input" type="text" inputMode="numeric"
                      value={tienMatThu?tienMatThu.toLocaleString('vi-VN'):''}  placeholder="0"
                      onChange={e=>{const v=Number(e.target.value.replace(/\./g,'').replace(/,/g,''));if(!isNaN(v))setTienMatThu(v)}}/>
                  </div>
                  <div>
                    <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>🏦 Chuyển khoản (đ)</label>
                    <input className="input" type="text" inputMode="numeric"
                      value={ckThu?ckThu.toLocaleString('vi-VN'):''} placeholder="0"
                      onChange={e=>{const v=Number(e.target.value.replace(/\./g,'').replace(/,/g,''));if(!isNaN(v))setCkThu(v)}}/>
                  </div>
                </div>
                {((tienMatThu||0)+(ckThu||0))>0&&(
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 10px',background:'#F0FDF4',borderRadius:'6px',fontSize:'12px'}}>
                    <span style={{color:'#15803D',fontWeight:600}}>Tổng thu: {((tienMatThu||0)+(ckThu||0)).toLocaleString('vi-VN')}đ</span>
                    <button onClick={()=>{setTienMatThu(Number(donNoChon['Còn phải thu']||0));setCkThu(0)}}
                      style={{padding:'2px 8px',border:'1px solid #BFDBFE',borderRadius:'4px',background:'white',cursor:'pointer',fontSize:'11px',color:'#1D4ED8'}}>
                      Thu đủ TM: {Number(donNoChon['Còn phải thu']||0).toLocaleString('vi-VN')}đ
                    </button>
                  </div>
                )}
                <div style={{display:'flex',gap:'10px'}}>
                  <button onClick={luuThuNo} disabled={dangThuNo||((tienMatThu||0)+(ckThu||0))<=0}
                    style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:(dangThuNo||soTienThu<=0)?'#9CA3AF':'#16A34A',color:'white',fontWeight:700,fontSize:'14px',cursor:(dangThuNo||soTienThu<=0)?'not-allowed':'pointer'}}>
                    {dangThuNo?'⏳ Đang lưu...':'✅ Xác nhận thu tiền'}
                  </button>
                  <button onClick={()=>setPopupNoKH(null)} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px'}}>Huỷ</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── POPUP HOÀN CỌC ── */}
      {popupHoanKH&&(
        <div className="ov" onClick={()=>setPopupHoanKH(null)}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'380px'}} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:'center',marginBottom:'16px'}}>
              <div style={{fontSize:'36px',marginBottom:'8px'}}>💰</div>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:'0 0 6px'}}>Xác nhận hoàn cọc</h2>
              <p style={{fontSize:'13px',color:'#6B7280',margin:'0 0 4px'}}>Khách hàng: <strong>{popupHoanKH['Tên khách hàng']}</strong></p>
              <div style={{background:'#FFFBEB',borderRadius:'8px',padding:'10px',margin:'10px 0'}}>
                <div style={{fontSize:'20px',fontWeight:800,color:'#D97706'}}>
                  {(donHuyCanHoan[popupHoanKH['Mã KH']]?.tienHoan||0).toLocaleString('vi-VN')}đ
                </div>
                <div style={{fontSize:'12px',color:'#92400E',marginTop:'2px'}}>Số tiền cần hoàn trả cho khách</div>
              </div>
              <p style={{fontSize:'12px',color:'#6B7280',margin:0}}>Sau khi xác nhận, trạng thái sẽ đổi thành "Đã hoàn"</p>
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={luuHoanCoc} disabled={dangHoan}
                style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:dangHoan?'#9CA3AF':'#16A34A',color:'white',fontWeight:700,fontSize:'14px',cursor:dangHoan?'not-allowed':'pointer'}}>
                {dangHoan?'⏳ Đang lưu...':'✅ Đã hoàn cọc'}
              </button>
              <button onClick={()=>setPopupHoanKH(null)} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px',fontWeight:600}}>Huỷ</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA */}
      {xoaKH&&(
        <div className="ov" onClick={()=>setXoaKH(null)}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'360px'}} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:'center',marginBottom:'16px'}}>
              <div style={{fontSize:'36px',marginBottom:'8px'}}>🗑️</div>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:'0 0 6px'}}>Xác nhận xóa</h2>
              <p style={{fontSize:'13px',color:'#6B7280',margin:0}}>Xóa <strong>{xoaKH['Tên khách hàng']}</strong>?</p>
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

function Btn({ children, active, disabled, onClick }: any) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding:'4px 10px', borderRadius:'5px', border:'1px solid',
      borderColor: active?'var(--primary)':'var(--border)',
      background: active?'var(--primary)': disabled?'#F9FAFB':'white',
      color: active?'white': disabled?'#CCC':'var(--text-secondary)',
      cursor: disabled?'not-allowed':'pointer',
      fontSize:'13px', fontWeight:active?700:400, minWidth:'32px',
    }}>{children}</button>
  )
}
