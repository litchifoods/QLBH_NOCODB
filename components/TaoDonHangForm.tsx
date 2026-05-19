'use client'
// components/TaoDonHangForm.tsx
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserSession } from '@/lib/auth'

interface SanPham {
  'Mã SP': string
  'Tên sản phẩm': string
  'Đơn vị tính': string
  'Giá bán lẻ': number
  'Giá bán buôn': number
  'Tồn kho': number
  'Loại SP': string
}

interface KhachHang {
  'Mã KH': string
  'Tên khách hàng': string
  'Số điện thoại': string
  'Địa chỉ': string
  'Đối tượng khách hàng': string
}

interface NhanVien {
  'Mã NV': string
  'Họ tên': string
  'Vai trò': string
}

interface DongSanPham {
  id: string
  maSP: string
  tenSP: string
  donViTinh: string
  soLuong: number
  donGia: number
  thanhTien: number
  ghiChu: string
}

function formatVND(n: number) {
  return n.toLocaleString('vi-VN') + 'đ'
}

function boDau(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
}

function timKiem(query: string, text: string): boolean {
  if (!query.trim()) return true
  return boDau(text).includes(boDau(query.trim()))
}

export default function TaoDonHangForm({
  user, danhSachKH, danhSachSP, danhSachNV, nextMaDon
}: {
  user: UserSession
  danhSachKH: KhachHang[]
  danhSachSP: SanPham[]
  danhSachNV: NhanVien[]
  nextMaDon: string
}) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  // ── State đơn hàng ──────────────────────────────────────
  const [maDon]                         = useState(nextMaDon)
  const [ngayDat,       setNgayDat]     = useState(today)
  const [maKH,          setMaKH]        = useState('')
  const [tenKH,         setTenKH]       = useState('')
  const [sdtKH,         setSdtKH]       = useState('')
  const [diaChiKH,      setDiaChiKH]    = useState('')
  const [kenhBan,       setKenhBan]     = useState('Trực tiếp')
  const [htGiao,        setHtGiao]      = useState('Giao hàng cho khách')
  const [ngayHenGiao,   setNgayHenGiao] = useState('')
  const [xuatHoaDon,    setXuatHoaDon]  = useState('Không')
  const [ghiChu,        setGhiChu]      = useState('')

  // ── Nhân viên bán — dropdown tìm kiếm ───────────────────
  const [searchNV,   setSearchNV]   = useState(user.hoTen || '')
  const [maNV,       setMaNV]       = useState(user.maNV || '')
  const [showNV,     setShowNV]     = useState(false)

  const nvLoc = useMemo(() => {
    if (!searchNV.trim()) return danhSachNV.slice(0, 10)
    return danhSachNV.filter(nv =>
      timKiem(searchNV, nv['Họ tên'] || '') ||
      timKiem(searchNV, nv['Mã NV'] || '') ||
      timKiem(searchNV, nv['Vai trò'] || '')
    ).slice(0, 10)
  }, [searchNV, danhSachNV])

  function chonNV(nv: NhanVien) {
    setSearchNV(nv['Họ tên'])
    setMaNV(nv['Mã NV'])
    setShowNV(false)
  }

  // ── Thanh toán hỗn hợp ──────────────────────────────────
  const [tienMatCoc, setTienMatCoc] = useState(0)
  const [ckCoc,      setCkCoc]      = useState(0)
  const datCocTong = tienMatCoc + ckCoc

  // ── Tìm kiếm KH ─────────────────────────────────────────
  const [searchKH, setSearchKH] = useState('')
  const [showKH,   setShowKH]   = useState(false)

  const khachLoc = useMemo(() => {
    if (!searchKH) return danhSachKH.slice(0, 8)
    return danhSachKH.filter(kh =>
      timKiem(searchKH, kh['Tên khách hàng'] || '') ||
      (kh['Số điện thoại'] || '').includes(searchKH) ||
      timKiem(searchKH, kh['Mã KH'] || '')
    ).slice(0, 8)
  }, [searchKH, danhSachKH])

  // ── Sản phẩm ────────────────────────────────────────────
  const [dongSP, setDongSP] = useState<DongSanPham[]>([
    { id: '1', maSP:'', tenSP:'', donViTinh:'Cái', soLuong:1, donGia:0, thanhTien:0, ghiChu:'' }
  ])
  const [searchSP, setSearchSP] = useState<Record<string,string>>({})
  const [showSP,   setShowSP]   = useState<Record<string,boolean>>({})
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const tongTien   = dongSP.reduce((s, d) => s + d.thanhTien, 0)
  const conPhaiThu = tongTien - datCocTong

  // ── Chọn KH ─────────────────────────────────────────────
  function chonKH(kh: KhachHang) {
    setMaKH(kh['Mã KH'])
    setTenKH(kh['Tên khách hàng'])
    setSdtKH(kh['Số điện thoại'] || '')
    setDiaChiKH(kh['Địa chỉ'] || '')
    setSearchKH(kh['Tên khách hàng'])
    setShowKH(false)
  }

  // ── Lọc SP ──────────────────────────────────────────────
  function getSPLoc(id: string) {
    const q = searchSP[id] || ''
    if (!q) return danhSachSP.filter(sp => Number(sp['Tồn kho']) > 0 || sp['Loại SP'] === 'Theo yêu cầu').slice(0, 10)
    return danhSachSP.filter(sp =>
      timKiem(q, sp['Tên sản phẩm'] || '') || timKiem(q, sp['Mã SP'] || '')
    ).slice(0, 10)
  }

  function chonSP(dongId: string, sp: SanPham) {
    setDongSP(prev => prev.map(d => {
      if (d.id !== dongId) return d
      const donGia = sp['Giá bán lẻ'] || 0
      return { ...d, maSP:sp['Mã SP'], tenSP:sp['Tên sản phẩm'], donViTinh:sp['Đơn vị tính']||'Cái', donGia, thanhTien:d.soLuong*donGia }
    }))
    setSearchSP(prev => ({ ...prev, [dongId]: sp['Tên sản phẩm'] }))
    setShowSP(prev => ({ ...prev, [dongId]: false }))
  }

  function capNhatDong(id: string, field: 'soLuong'|'donGia'|'ghiChu'|'tenSP', value: any) {
    setDongSP(prev => prev.map(d => {
      if (d.id !== id) return d
      const updated = { ...d, [field]: value }
      if (field === 'soLuong' || field === 'donGia') {
        const sl = field === 'soLuong' ? Number(value) : d.soLuong
        const dg = field === 'donGia'  ? Number(value) : d.donGia
        updated.thanhTien = sl * dg
      }
      return updated
    }))
  }

  function themDong() {
    const id = Date.now().toString()
    setDongSP(prev => [...prev, { id, maSP:'', tenSP:'', donViTinh:'Cái', soLuong:1, donGia:0, thanhTien:0, ghiChu:'' }])
    setSearchSP(prev => ({ ...prev, [id]:'' }))
  }

  function xoaDong(id: string) {
    setDongSP(prev => prev.filter(d => d.id !== id))
  }

  // ── Lưu đơn ─────────────────────────────────────────────
  async function luuDon(trangThai: string) {
    if (!maKH && !searchKH) { setError('Vui lòng chọn khách hàng'); return }
    if (dongSP.every(d => !d.maSP && !d.tenSP)) { setError('Vui lòng thêm ít nhất 1 sản phẩm'); return }
    if (!searchNV.trim()) { setError('Vui lòng chọn nhân viên bán'); return }

    setLoading(true); setError('')
    try {
      let htCoc = ''
      if (tienMatCoc > 0 && ckCoc > 0) htCoc = `TM ${tienMatCoc.toLocaleString('vi-VN')}đ + CK ${ckCoc.toLocaleString('vi-VN')}đ`
      else if (tienMatCoc > 0) htCoc = 'Tiền mặt'
      else if (ckCoc > 0) htCoc = 'Chuyển khoản'

      const resDon = await fetch('/api/don-hang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'Mã đơn hàng':         maDon,
          'Ngày bán':            ngayDat,
          'Ngày đặt':            ngayDat,
          'Mã KH':               maKH,
          'Tên khách hàng':      tenKH || searchKH,
          'Kênh bán':            kenhBan,
          'Hình thức giao hàng': htGiao,
          'Ngày hẹn giao':       ngayHenGiao || null,
          'Địa chỉ giao':        diaChiKH,
          'Tổng tiền đơn':       tongTien,
          'Đặt cọc':             datCocTong,
          'Hình thức cọc':       htCoc,
          'Còn phải thu':        conPhaiThu,
          'Trạng thái':          trangThai,
          'Mã NV':               maNV || '',
          'Nhân viên bán':       searchNV,
          'Xuất hóa đơn':        xuatHoaDon,
          'Ghi chú':             ghiChu,
        }),
      })
      if (!resDon.ok) throw new Error('Lỗi tạo đơn hàng')

      const dongCoSP = dongSP.filter(d => d.maSP || d.tenSP)
      for (let i = 0; i < dongCoSP.length; i++) {
        const d = dongCoSP[i]
        await fetch('/api/chi-tiet-don', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            'Mã chi tiết':        `CT-${maDon}-${i+1}`,
            'Mã đơn hàng':        maDon,
            'Mã SP':              d.maSP,
            'Tên SP (ghi nhanh)': d.tenSP,
            'Số lượng':           d.soLuong,
            'Đơn giá':            d.donGia,
            'Thành tiền':         d.thanhTien,
            'Ghi chú SP':         d.ghiChu,
          }),
        })
      }
      router.push(`/dashboard/don-hang?success=${maDon}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  // ── Giao diện ───────────────────────────────────────────
  return (
    <div style={{ padding:'18px 24px', maxWidth:'1100px' }}>
      <style>{`
        .dropdown-item{padding:8px 12px;cursor:pointer;border-bottom:1px solid #F3F4F6;transition:background .1s;}
        .dropdown-item:hover{background:#F0F9FF;}
        .dropdown-item:last-child{border-bottom:none;}
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'18px' }}>
        <div>
          <h1 style={{ fontFamily:'Playfair Display,serif', fontSize:'21px', fontWeight:700, margin:0 }}>
            ➕ Tạo đơn hàng mới
          </h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'12px', margin:'2px 0 0' }}>
            Mã đơn: <strong style={{ color:'var(--primary)' }}>{maDon}</strong>
          </p>
        </div>
        <button onClick={() => router.back()} className="btn btn-ghost btn-sm">← Quay lại</button>
      </div>

      {error && (
        <div style={{ background:'#FEE2E2', color:'#DC2626', padding:'10px 14px', borderRadius:'8px', marginBottom:'14px', fontSize:'13px' }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>

        {/* ── Cột trái ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>

          {/* Thông tin đơn */}
          <div className="card" style={{ padding:'14px' }}>
            <h3 style={{ fontSize:'11px', fontWeight:700, marginBottom:'12px', color:'var(--primary)', textTransform:'uppercase', letterSpacing:'.05em' }}>
              📋 Thông tin đơn hàng
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
              <div>
                <label style={{ fontSize:'11px', fontWeight:600, color:'#374151', display:'block', marginBottom:'3px' }}>Ngày đặt *</label>
                <input className="input" type="date" value={ngayDat} onChange={e => setNgayDat(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize:'11px', fontWeight:600, color:'#374151', display:'block', marginBottom:'3px' }}>Kênh bán *</label>
                <select className="input" value={kenhBan} onChange={e => setKenhBan(e.target.value)}>
                  {['Trực tiếp','Zalo','Facebook','Điện thoại','Online'].map(k => <option key={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:'11px', fontWeight:600, color:'#374151', display:'block', marginBottom:'3px' }}>Hình thức giao *</label>
                <select className="input" value={htGiao} onChange={e => setHtGiao(e.target.value)}>
                  <option>Giao hàng cho khách</option>
                  <option>Khách mang hàng về</option>
                </select>
              </div>
              {htGiao === 'Giao hàng cho khách' && (
                <div>
                  <label style={{ fontSize:'11px', fontWeight:600, color:'#374151', display:'block', marginBottom:'3px' }}>Ngày hẹn giao</label>
                  <input className="input" type="datetime-local" value={ngayHenGiao} onChange={e => setNgayHenGiao(e.target.value)} />
                </div>
              )}

              {/* Nhân viên bán — dropdown tìm kiếm */}
              <div style={{ gridColumn:'1 / -1' }}>
                <label style={{ fontSize:'11px', fontWeight:600, color:'#374151', display:'block', marginBottom:'3px' }}>
                  👤 Nhân viên bán *
                </label>
                <div style={{ position:'relative' }}>
                  <input
                    className="input"
                    placeholder="Gõ tên hoặc chọn nhân viên..."
                    value={searchNV}
                    onChange={e => { setSearchNV(e.target.value); setMaNV(''); setShowNV(true) }}
                    onFocus={() => setShowNV(true)}
                    onBlur={() => setTimeout(() => setShowNV(false), 200)}
                    style={{ paddingRight:'32px' }}
                  />
                  {/* Icon search */}
                  <span style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', color:'#9CA3AF', pointerEvents:'none', fontSize:'14px' }}>🔍</span>

                  {showNV && (
                    <div style={{
                      position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:60,
                      background:'white', border:'1px solid var(--border)',
                      borderRadius:'8px', boxShadow:'0 4px 16px rgba(0,0,0,0.12)',
                      maxHeight:'220px', overflowY:'auto',
                    }}>
                      {/* Gợi ý gõ tự do nếu không chọn từ list */}
                      {searchNV && !danhSachNV.find(nv => nv['Họ tên'] === searchNV) && (
                        <div
                          className="dropdown-item"
                          onClick={() => { setShowNV(false) }}
                          style={{ background:'#FEF9C3', fontSize:'12px', color:'#92400E' }}
                        >
                          ✏️ Dùng tên: <strong>"{searchNV}"</strong>
                        </div>
                      )}
                      {nvLoc.length === 0 ? (
                        <div style={{ padding:'12px', fontSize:'12px', color:'#6B7280', textAlign:'center' }}>
                          Không tìm thấy nhân viên
                        </div>
                      ) : nvLoc.map(nv => (
                        <div key={nv['Mã NV']} className="dropdown-item" onClick={() => chonNV(nv)}>
                          <div style={{ fontSize:'13px', fontWeight:600 }}>{nv['Họ tên']}</div>
                          <div style={{ fontSize:'11px', color:'var(--text-secondary)' }}>
                            {nv['Mã NV']} · {nv['Vai trò'] || 'Nhân viên'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Badge xác nhận đã chọn */}
                {maNV && (
                  <div style={{ marginTop:'4px', fontSize:'11px', color:'var(--success)', fontWeight:600 }}>
                    ✅ {searchNV} ({maNV})
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Khách hàng */}
          <div className="card" style={{ padding:'14px' }}>
            <h3 style={{ fontSize:'11px', fontWeight:700, marginBottom:'12px', color:'var(--primary)', textTransform:'uppercase', letterSpacing:'.05em' }}>
              👥 Khách hàng
            </h3>
            <div style={{ position:'relative' }}>
              <input className="input"
                placeholder="Tìm theo tên, SĐT hoặc mã KH..."
                value={searchKH}
                onChange={e => { setSearchKH(e.target.value); setMaKH(''); setShowKH(true) }}
                onFocus={() => setShowKH(true)}
                onBlur={() => setTimeout(() => setShowKH(false), 200)}
              />
              {showKH && khachLoc.length > 0 && (
                <div style={{
                  position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:50,
                  background:'white', border:'1px solid var(--border)',
                  borderRadius:'8px', boxShadow:'0 4px 16px rgba(0,0,0,0.12)',
                  maxHeight:'200px', overflowY:'auto',
                }}>
                  {khachLoc.map(kh => (
                    <div key={kh['Mã KH']} className="dropdown-item" onClick={() => chonKH(kh)}>
                      <div style={{ fontSize:'13px', fontWeight:600 }}>{kh['Tên khách hàng']}</div>
                      <div style={{ fontSize:'11px', color:'var(--text-secondary)' }}>{kh['Mã KH']} · {kh['Số điện thoại']}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {maKH && (
              <div style={{ marginTop:'8px', background:'var(--primary-pale)', borderRadius:'6px', padding:'8px 12px', fontSize:'12px' }}>
                <div style={{ fontWeight:700, color:'var(--primary)' }}>✅ {tenKH}</div>
                <div style={{ color:'var(--text-secondary)', marginTop:'2px' }}>📞 {sdtKH}</div>
                {diaChiKH && <div style={{ color:'var(--text-secondary)' }}>📍 {diaChiKH}</div>}
              </div>
            )}
          </div>

          {/* Thanh toán */}
          <div className="card" style={{ padding:'14px' }}>
            <h3 style={{ fontSize:'11px', fontWeight:700, marginBottom:'12px', color:'var(--primary)', textTransform:'uppercase', letterSpacing:'.05em' }}>
              💰 Đặt cọc
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
              <div>
                <label style={{ fontSize:'11px', fontWeight:600, color:'#374151', display:'block', marginBottom:'3px' }}>💵 Tiền mặt (VNĐ)</label>
                <input className="input" type="number" min="0" value={tienMatCoc||''} placeholder="0"
                  onChange={e => setTienMatCoc(Number(e.target.value))} />
              </div>
              <div>
                <label style={{ fontSize:'11px', fontWeight:600, color:'#374151', display:'block', marginBottom:'3px' }}>🏦 Chuyển khoản (VNĐ)</label>
                <input className="input" type="number" min="0" value={ckCoc||''} placeholder="0"
                  onChange={e => setCkCoc(Number(e.target.value))} />
              </div>
            </div>
            {datCocTong > 0 && (
              <div style={{ marginTop:'6px', fontSize:'12px', color:'var(--success)', fontWeight:600 }}>
                Tổng cọc: {formatVND(datCocTong)}
                {tienMatCoc > 0 && ckCoc > 0 && ` (TM: ${formatVND(tienMatCoc)} + CK: ${formatVND(ckCoc)})`}
              </div>
            )}
            <div style={{ marginTop:'10px' }}>
              <label style={{ fontSize:'11px', fontWeight:600, color:'#374151', display:'block', marginBottom:'3px' }}>Xuất hoá đơn VAT</label>
              <select className="input" value={xuatHoaDon} onChange={e => setXuatHoaDon(e.target.value)}>
                <option>Không</option>
                <option>Có</option>
              </select>
            </div>
          </div>

          {/* Ghi chú */}
          <div className="card" style={{ padding:'14px' }}>
            <label style={{ fontSize:'11px', fontWeight:600, color:'#374151', display:'block', marginBottom:'4px' }}>📝 Ghi chú</label>
            <textarea className="input" rows={2} value={ghiChu}
              placeholder="Ghi chú thêm..." onChange={e => setGhiChu(e.target.value)}
              style={{ resize:'vertical' }} />
          </div>
        </div>

        {/* ── Cột phải: Sản phẩm ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
          <div className="card" style={{ padding:'14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
              <h3 style={{ fontSize:'11px', fontWeight:700, color:'var(--primary)', textTransform:'uppercase', letterSpacing:'.05em', margin:0 }}>
                🪑 Sản phẩm trong đơn
              </h3>
              <button onClick={themDong} className="btn btn-outline btn-sm" style={{ fontSize:'12px' }}>+ Thêm SP</button>
            </div>

            {/* Header bảng */}
            <div style={{ display:'grid', gridTemplateColumns:'2fr 52px 84px 72px 20px', gap:'6px', padding:'4px 6px', fontSize:'11px', fontWeight:700, color:'var(--text-secondary)' }}>
              <span>Sản phẩm</span>
              <span style={{ textAlign:'center' }}>SL</span>
              <span style={{ textAlign:'right' }}>Đơn giá</span>
              <span style={{ textAlign:'right' }}>T.Tiền</span>
              <span></span>
            </div>

            {/* Danh sách SP */}
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              {dongSP.map((dong, idx) => {
                const spLoc   = getSPLoc(dong.id)
                const isShow  = showSP[dong.id]
                const searchV = searchSP[dong.id] !== undefined ? searchSP[dong.id] : dong.tenSP
                return (
                  <div key={dong.id} style={{ border:'1px solid var(--border)', borderRadius:'8px', padding:'8px 10px', background:'#FAFBFD' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'2fr 52px 84px 72px 20px', gap:'6px', alignItems:'center' }}>
                      {/* Tìm SP */}
                      <div style={{ position:'relative' }}>
                        <input className="input"
                          placeholder={`SP #${idx+1} — gõ tên...`}
                          value={searchV}
                          style={{ fontSize:'12px', padding:'5px 8px' }}
                          onChange={e => {
                            setSearchSP(prev => ({ ...prev, [dong.id]: e.target.value }))
                            setShowSP(prev => ({ ...prev, [dong.id]: true }))
                            setDongSP(prev => prev.map(d => d.id===dong.id ? { ...d, maSP:'', tenSP:e.target.value } : d))
                          }}
                          onFocus={() => setShowSP(prev => ({ ...prev, [dong.id]: true }))}
                          onBlur={() => setTimeout(() => setShowSP(prev => ({ ...prev, [dong.id]: false })), 200)}
                        />
                        {isShow && spLoc.length > 0 && (
                          <div style={{
                            position:'absolute', top:'100%', left:0, right:0, zIndex:60,
                            background:'white', border:'1px solid var(--border)',
                            borderRadius:'6px', boxShadow:'0 4px 16px rgba(0,0,0,0.12)',
                            maxHeight:'180px', overflowY:'auto',
                          }}>
                            {spLoc.map(sp => (
                              <div key={sp['Mã SP']} className="dropdown-item"
                                style={{ fontSize:'12px' }}
                                onClick={() => chonSP(dong.id, sp)}>
                                <div style={{ fontWeight:600 }}>{sp['Tên sản phẩm']}</div>
                                <div style={{ color:'var(--text-secondary)', fontSize:'11px' }}>
                                  {sp['Mã SP']} · {Number(sp['Giá bán lẻ']).toLocaleString('vi-VN')}đ
                                  {Number(sp['Tồn kho'])===0
                                    ? <span style={{ color:'#DC2626', marginLeft:'6px' }}>⚠️ Hết</span>
                                    : <span style={{ color:'#16A34A', marginLeft:'6px' }}>Kho: {sp['Tồn kho']}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* SL */}
                      <input className="input" type="number" min="1" value={dong.soLuong}
                        style={{ fontSize:'12px', padding:'5px 4px', textAlign:'center' }}
                        onChange={e => capNhatDong(dong.id, 'soLuong', e.target.value)} />
                      {/* Đơn giá */}
                      <input className="input" type="number" min="0" value={dong.donGia||''}
                        placeholder="0" style={{ fontSize:'12px', padding:'5px 4px', textAlign:'right' }}
                        onChange={e => capNhatDong(dong.id, 'donGia', e.target.value)} />
                      {/* Thành tiền */}
                      <div style={{ fontSize:'12px', fontWeight:700, color:'var(--success)', textAlign:'right' }}>
                        {dong.thanhTien > 0 ? dong.thanhTien.toLocaleString('vi-VN') : '0'}đ
                      </div>
                      {/* Xóa */}
                      {dongSP.length > 1
                        ? <button onClick={() => xoaDong(dong.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#DC2626', fontSize:'14px', padding:'0' }}>✕</button>
                        : <span></span>}
                    </div>
                    {/* Ghi chú SP */}
                    <input className="input" placeholder="Ghi chú: màu, size... (bỏ trống nếu không cần)"
                      value={dong.ghiChu} onChange={e => capNhatDong(dong.id, 'ghiChu', e.target.value)}
                      style={{ marginTop:'6px', fontSize:'11px', padding:'4px 8px', color:'#6B7280' }} />
                  </div>
                )
              })}
            </div>

            {/* Tổng */}
            <div style={{ marginTop:'12px', padding:'12px', borderRadius:'8px', background:'var(--primary-pale)', border:'1px solid rgba(27,58,107,0.15)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', marginBottom:'4px' }}>
                <span style={{ color:'var(--text-secondary)' }}>Tổng tiền đơn:</span>
                <span style={{ fontWeight:700 }}>{formatVND(tongTien)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', marginBottom:'4px' }}>
                <span style={{ color:'var(--text-secondary)' }}>Đã đặt cọc:</span>
                <span style={{ color:'var(--success)', fontWeight:600 }}>- {formatVND(datCocTong)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'15px', fontWeight:800, borderTop:'1px solid rgba(27,58,107,0.2)', paddingTop:'8px', marginTop:'4px' }}>
                <span style={{ color:'var(--primary)' }}>Còn phải thu:</span>
                <span style={{ color: conPhaiThu > 0 ? '#DC2626' : '#16A34A' }}>{formatVND(conPhaiThu)}</span>
              </div>
            </div>
          </div>

          {/* Nút lưu */}
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            <button onClick={() => luuDon('Chờ giao')} className="btn btn-primary btn-lg"
              disabled={loading} style={{ width:'100%', justifyContent:'center' }}>
              {loading ? '⏳ Đang lưu...' : '✅ Lưu đơn hàng'}
            </button>
            <button onClick={() => luuDon('Đang giao')} disabled={loading}
              style={{ width:'100%', padding:'12px', borderRadius:'8px', border:'none', background:'#C8860A', color:'white', fontWeight:700, fontSize:'15px', cursor:'pointer' }}>
              🚚 Lưu & Giao hàng ngay
            </button>
            <button onClick={() => router.back()} className="btn btn-ghost"
              style={{ width:'100%', justifyContent:'center' }}>
              Huỷ bỏ
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
