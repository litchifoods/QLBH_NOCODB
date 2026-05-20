'use client'
// components/KhachHangClient.tsx -- v2.1
// Nút "Tạo đơn" truyền maKH vào URL → form tự điền thông tin KH
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { UserSession } from '@/lib/auth'
import ExcelToolbar from '@/components/ExcelToolbar'

function boDau(s: string) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()
}

const LOAI_KH = ['Tất cả','Cá nhân','Cơ quan','Công ty','Đại lý']

export default function KhachHangClient({
  khachHang, user,
}: {
  khachHang: any[]
  user: UserSession
}) {
  const router = useRouter()
  const [search,    setSearch]    = useState('')
  const [filterLoai,setFilterLoai]= useState('Tất cả')
  const [showModal, setShowModal] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [msg,       setMsg]       = useState('')
  const [msgOk,     setMsgOk]     = useState(true)

  // Form thêm KH mới
  const [tenKH,    setTenKH]    = useState('')
  const [sdtKH,    setSdtKH]    = useState('')
  const [diaChiKH, setDiaChiKH] = useState('')
  const [loaiKH,   setLoaiKH]   = useState('Cá nhân')
  const [ghiChuKH, setGhiChuKH] = useState('')

  // Danh sách cục bộ (cập nhật khi thêm mới)
  const [localKH, setLocalKH] = useState(khachHang)

  const filtered = useMemo(() => {
    return localKH.filter((kh: any) => {
      if (filterLoai !== 'Tất cả' && kh['Đối tượng khách hàng'] !== filterLoai) return false
      if (!search.trim()) return true
      const q = boDau(search)
      return (
        boDau(kh['Tên khách hàng'] || '').includes(q) ||
        (kh['Số điện thoại'] || '').includes(search) ||
        boDau(kh['Mã KH'] || '').includes(q) ||
        boDau(kh['Địa chỉ'] || '').includes(q)
      )
    })
  }, [localKH, search, filterLoai])

  function resetForm() {
    setTenKH(''); setSdtKH(''); setDiaChiKH(''); setLoaiKH('Cá nhân'); setGhiChuKH('')
  }

  async function luuKH() {
    if (!tenKH.trim()) { setMsg('Vui lòng nhập tên khách hàng'); setMsgOk(false); return }
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
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Lỗi')
      const khMoi = {
        'Mã KH':               data['Mã KH'] || data.data?.['Mã KH'] || '',
        'Tên khách hàng':      tenKH.trim(),
        'Số điện thoại':       sdtKH.trim(),
        'Địa chỉ':             diaChiKH.trim(),
        'Đối tượng khách hàng': loaiKH,
        'Ghi chú':             ghiChuKH.trim(),
      }
      setLocalKH(prev => [khMoi, ...prev])
      setMsg('✅ Đã thêm khách hàng thành công'); setMsgOk(true)
      resetForm(); setShowModal(false)
      router.refresh()
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

  // Màu loại KH
  function loaiColor(loai: string) {
    const map: Record<string,{bg:string;c:string}> = {
      'Cá nhân': { bg:'#DBEAFE', c:'#1E40AF' },
      'Cơ quan': { bg:'#FEF3C7', c:'#92400E' },
      'Công ty': { bg:'#D1FAE5', c:'#065F46' },
      'Đại lý':  { bg:'#EDE9FE', c:'#6D28D9' },
    }
    return map[loai] || { bg:'#F3F4F6', c:'#374151' }
  }

  return (
    <div style={{ padding:'20px' }}>
      <style>{`
        .kh-hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:12px;flex-wrap:wrap;}
        .btn-them{background:var(--primary);color:white;border:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;white-space:nowrap;cursor:pointer;display:inline-flex;align-items:center;gap:6px;}
        .kh-t th,.kh-t td{padding:9px 12px;}
        .kh-t tbody tr:hover td{background:#F0F4FF!important;}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;}
        .modal-kh{background:white;border-radius:12px;padding:24px;width:100%;max-width:460px;}
        .lbl{font-size:11px;font-weight:600;color:#374151;display:block;margin-bottom:3px;}
        @media(max-width:900px){.col-dia,.col-ghi{display:none;}}
      `}</style>

      {/* Header */}
      <div className="kh-hdr">
        <div>
          <h1 style={{ fontFamily:'Playfair Display,serif', fontSize:'20px', fontWeight:700, margin:0 }}>👥 Khách hàng</h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'13px', margin:'2px 0 8px' }}>
            {filtered.length} khách hàng
          </p>
          <ExcelToolbar
            loai="KHACH_HANG" danhSach={filtered} tenFile="khach-hang"
            layGiaTri={kh => [
              kh['Mã KH']||'', kh['Tên khách hàng']||'', kh['Số điện thoại']||'',
              kh['Địa chỉ']||'', kh['Đối tượng khách hàng']||'', kh['Ghi chú']||'',
            ]}
            onNhap={handleNhap}
          />
        </div>
        <button className="btn-them" onClick={() => setShowModal(true)}>+ Thêm khách hàng</button>
      </div>

      {msg && (
        <div style={{ padding:'10px 14px', borderRadius:'8px', marginBottom:'14px', fontSize:'13px',
          background:msgOk?'#D1FAE5':'#FEE2E2', color:msgOk?'#065F46':'#991B1B' }}>
          {msg}
        </div>
      )}

      {/* Filter */}
      <div className="card" style={{ padding:'12px 14px', marginBottom:'14px' }}>
        <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center' }}>
          <input className="input" placeholder="🔍 Tìm tên, SĐT, địa chỉ..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex:'1', minWidth:'180px', maxWidth:'300px' }} />
          <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
            {LOAI_KH.map(l => {
              const c = l !== 'Tất cả' ? loaiColor(l) : null
              const isA = filterLoai === l
              return (
                <button key={l} onClick={() => setFilterLoai(l)} style={{
                  padding:'5px 12px', borderRadius:'20px', border:'1px solid',
                  borderColor: isA ? (c?.c||'var(--primary)') : 'var(--border)',
                  background:  isA ? (c?.bg||'var(--primary-pale)') : 'white',
                  color:       isA ? (c?.c||'var(--primary)') : 'var(--text-secondary)',
                  fontWeight:  isA ? 700 : 400, fontSize:'12px', cursor:'pointer',
                }}>{l}</button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bảng */}
      <div className="card">
        <div style={{ overflowX:'auto' }}>
          <table className="kh-t" style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
            <thead>
              <tr style={{ background:'#F0F4FF', borderBottom:'2px solid var(--border)' }}>
                <th style={{ textAlign:'left', fontWeight:700, whiteSpace:'nowrap' }}>Mã KH</th>
                <th style={{ textAlign:'left', fontWeight:700 }}>Tên khách hàng</th>
                <th style={{ textAlign:'left', fontWeight:700, whiteSpace:'nowrap' }}>Số điện thoại</th>
                <th className="col-dia" style={{ textAlign:'left', fontWeight:700 }}>Địa chỉ</th>
                <th style={{ textAlign:'center', fontWeight:700 }}>Loại</th>
                <th style={{ width:'160px', textAlign:'center', fontWeight:700 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign:'center', padding:'48px', color:'var(--text-muted)' }}>
                    Không tìm thấy khách hàng nào
                  </td>
                </tr>
              ) : filtered.map((kh: any, i: number) => {
                const c = loaiColor(kh['Đối tượng khách hàng'] || '')
                return (
                  <tr key={i} style={{ borderBottom:'1px solid #F0F0F0', background:i%2===0?'white':'#FAFBFD' }}>
                    <td style={{ fontWeight:700, color:'var(--primary)', whiteSpace:'nowrap' }}>
                      {kh['Mã KH']}
                    </td>
                    <td style={{ fontWeight:600 }}>{kh['Tên khách hàng']}</td>
                    <td style={{ whiteSpace:'nowrap' }}>
                      {kh['Số điện thoại']
                        ? <a href={`tel:${kh['Số điện thoại']}`} style={{ color:'var(--primary)', textDecoration:'none' }}>
                            📞 {kh['Số điện thoại']}
                          </a>
                        : '—'}
                    </td>
                    <td className="col-dia" style={{ fontSize:'12px', color:'var(--text-secondary)', maxWidth:'200px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {kh['Địa chỉ'] || '—'}
                    </td>
                    <td style={{ textAlign:'center' }}>
                      <span style={{ padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:700, background:c.bg, color:c.c, whiteSpace:'nowrap' }}>
                        {kh['Đối tượng khách hàng'] || '—'}
                      </span>
                    </td>
                    <td style={{ textAlign:'center' }}>
                      <div style={{ display:'flex', gap:'6px', justifyContent:'center' }}>
                        {/* Nút Tạo đơn — truyền maKH vào URL để form tự điền */}
                        <Link
                          href={`/dashboard/don-hang/tao?maKH=${kh['Mã KH']}`}
                          style={{
                            padding:'5px 12px', borderRadius:'6px', border:'none',
                            background:'var(--primary)', color:'white',
                            fontSize:'12px', fontWeight:700, textDecoration:'none',
                            display:'inline-flex', alignItems:'center', gap:'4px',
                            whiteSpace:'nowrap',
                          }}>
                          + Tạo đơn
                        </Link>
                        {/* Nút xem đơn hàng của KH này */}
                        <Link
                          href={`/dashboard/don-hang?q=${kh['Mã KH']}`}
                          className="btn btn-ghost btn-sm"
                          style={{ padding:'5px 10px', fontSize:'12px', whiteSpace:'nowrap' }}
                          title="Xem đơn hàng">
                          📋 Đơn
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal thêm KH mới */}
      {showModal && (
        <div className="overlay" onClick={() => { setShowModal(false); resetForm() }}>
          <div className="modal-kh" onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
              <h2 style={{ fontSize:'16px', fontWeight:700, margin:0 }}>+ Thêm khách hàng mới</h2>
              <button onClick={() => { setShowModal(false); resetForm() }}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:'20px', color:'#6B7280' }}>✕</button>
            </div>
            <p style={{ fontSize:'12px', color:'#1E40AF', margin:'0 0 14px', background:'#EFF6FF', padding:'8px 12px', borderRadius:'6px' }}>
              💡 Mã khách hàng sẽ được NocoDB tự động tạo.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              <div>
                <label className="lbl">Tên khách hàng *</label>
                <input className="input" placeholder="Nguyễn Văn A / Công ty TNHH..."
                  value={tenKH} onChange={e => setTenKH(e.target.value)} autoFocus />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <div>
                  <label className="lbl">Số điện thoại</label>
                  <input className="input" placeholder="0901 234 567"
                    value={sdtKH} onChange={e => setSdtKH(e.target.value)} />
                </div>
                <div>
                  <label className="lbl">Đối tượng</label>
                  <select className="input" value={loaiKH} onChange={e => setLoaiKH(e.target.value)}>
                    <option>Cá nhân</option><option>Cơ quan</option><option>Công ty</option><option>Đại lý</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="lbl">Địa chỉ</label>
                <input className="input" placeholder="Số nhà, đường, quận, tỉnh/thành..."
                  value={diaChiKH} onChange={e => setDiaChiKH(e.target.value)} />
              </div>
              <div>
                <label className="lbl">Ghi chú</label>
                <input className="input" placeholder="Ghi chú thêm..."
                  value={ghiChuKH} onChange={e => setGhiChuKH(e.target.value)} />
              </div>
              <div style={{ display:'flex', gap:'10px', marginTop:'4px' }}>
                <button onClick={luuKH} disabled={loading}
                  style={{ flex:1, padding:'11px', borderRadius:'8px', border:'none', background:'var(--primary)', color:'white', fontWeight:700, fontSize:'14px', cursor:'pointer' }}>
                  {loading ? '⏳ Đang lưu...' : '✅ Lưu khách hàng'}
                </button>
                <button onClick={() => { setShowModal(false); resetForm() }}
                  style={{ padding:'11px 16px', borderRadius:'8px', border:'1px solid var(--border)', background:'white', cursor:'pointer', fontSize:'14px' }}>
                  Huỷ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
