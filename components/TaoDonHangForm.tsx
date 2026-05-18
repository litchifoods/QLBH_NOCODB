'use client'
// components/TaoDonHangForm.tsx
import { useState, useMemo } from 'react'
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

function Input({ label, required, children, note }: {
  label: string, required?: boolean, children: React.ReactNode, note?: string
}) {
  return (
    <div>
      <label style={{
        display: 'block', marginBottom: '6px',
        fontSize: '13px', fontWeight: 600, color: '#374151',
      }}>
        {label} {required && <span style={{ color: '#DC2626' }}>*</span>}
      </label>
      {children}
      {note && <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>{note}</p>}
    </div>
  )
}

export default function TaoDonHangForm({
  user, danhSachKH, danhSachSP, nextMaDon
}: {
  user: UserSession
  danhSachKH: KhachHang[]
  danhSachSP: SanPham[]
  nextMaDon: string
}) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  // ── State đơn hàng ──────────────────────────────────────
  const [maDon,       setMaDon]       = useState(nextMaDon)
  const [ngayDat,     setNgayDat]     = useState(today)
  const [maKH,        setMaKH]        = useState('')
  const [tenKH,       setTenKH]       = useState('')
  const [sdtKH,       setSdtKH]       = useState('')
  const [diaChiKH,    setDiaChiKH]    = useState('')
  const [kenhBan,     setKenhBan]     = useState('Trực tiếp')
  const [htGiao,      setHtGiao]      = useState('Giao hàng cho khách')
  const [ngayHenGiao, setNgayHenGiao] = useState('')
  const [datCoc,      setDatCoc]      = useState(0)
  const [htCoc,       setHtCoc]       = useState('Tiền mặt')
  const [xuatHoaDon,  setXuatHoaDon]  = useState('Không')
  const [ghiChu,      setGhiChu]      = useState('')
  const [maNV]                        = useState(user.maNV || '')
  const [tenNV]                       = useState(user.hoTen || '')

  // ── State sản phẩm ──────────────────────────────────────
  const [dongSP, setDongSP] = useState<DongSanPham[]>([
    { id: '1', maSP: '', tenSP: '', donViTinh: 'Cái', soLuong: 1, donGia: 0, thanhTien: 0, ghiChu: '' }
  ])

  // ── Tìm kiếm ────────────────────────────────────────────
  const [searchKH, setSearchKH] = useState('')
  const [showKH,   setShowKH]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  // Lọc khách hàng
  const khachLoc = useMemo(() => {
    if (!searchKH) return danhSachKH.slice(0, 8)
    return danhSachKH.filter(kh =>
      (kh['Tên khách hàng'] || '').toLowerCase().includes(searchKH.toLowerCase()) ||
      (kh['Số điện thoại'] || '').includes(searchKH) ||
      (kh['Mã KH'] || '').toLowerCase().includes(searchKH.toLowerCase())
    ).slice(0, 8)
  }, [searchKH, danhSachKH])

  // Tổng tiền
  const tongTien = dongSP.reduce((s, d) => s + d.thanhTien, 0)
  const conPhaiThu = tongTien - datCoc

  // ── Chọn khách hàng ─────────────────────────────────────
  function chonKH(kh: KhachHang) {
    setMaKH(kh['Mã KH'])
    setTenKH(kh['Tên khách hàng'])
    setSdtKH(kh['Số điện thoại'] || '')
    setDiaChiKH(kh['Địa chỉ'] || '')
    setSearchKH(kh['Tên khách hàng'])
    setShowKH(false)
  }

  // ── Cập nhật sản phẩm ───────────────────────────────────
  function capNhatDong(id: string, field: string, value: any) {
    setDongSP(prev => prev.map(d => {
      if (d.id !== id) return d
      const updated = { ...d, [field]: value }
      // Nếu chọn sản phẩm
      if (field === 'maSP') {
        const sp = danhSachSP.find(s => s['Mã SP'] === value)
        if (sp) {
          updated.tenSP    = sp['Tên sản phẩm']
          updated.donViTinh = sp['Đơn vị tính'] || 'Cái'
          updated.donGia   = sp['Giá bán lẻ'] || 0
        }
      }
      // Tính thành tiền
      const sl = field === 'soLuong' ? Number(value) : updated.soLuong
      const dg = field === 'donGia'  ? Number(value) : updated.donGia
      updated.thanhTien = sl * dg
      return updated
    }))
  }

  function themDong() {
    setDongSP(prev => [...prev, {
      id: Date.now().toString(),
      maSP: '', tenSP: '', donViTinh: 'Cái',
      soLuong: 1, donGia: 0, thanhTien: 0, ghiChu: ''
    }])
  }

  function xoaDong(id: string) {
    setDongSP(prev => prev.filter(d => d.id !== id))
  }

  // ── Lưu đơn hàng ────────────────────────────────────────
  async function luuDon(trangThai: string) {
    if (!maKH && !tenKH) { setError('Vui lòng chọn hoặc nhập tên khách hàng'); return }
    if (dongSP.every(d => !d.maSP && !d.tenSP)) { setError('Vui lòng thêm ít nhất 1 sản phẩm'); return }

    setLoading(true)
    setError('')

    try {
      // 1. Tạo đơn hàng
      const resDon = await fetch('/api/don-hang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'Mã đơn hàng':      maDon,
          'Ngày bán':         ngayDat,
          'Mã KH':            maKH,
          'Kênh bán':         kenhBan,
          'Hình thức giao hàng': htGiao,
          'Ngày hẹn giao':    ngayHenGiao || null,
          'Tổng tiền đơn':    tongTien,
          'Đặt cọc':          datCoc,
          'Hình thức cọc':    htCoc,
          'Còn phải thu':     conPhaiThu,
          'Trạng thái':       trangThai,
          'Mã NV':            maNV,
          'Nhân viên bán':    tenNV,
          'Xuất hóa đơn':     xuatHoaDon,
          'Ghi chú':          ghiChu,
        }),
      })

      if (!resDon.ok) throw new Error('Lỗi tạo đơn hàng')

      // 2. Tạo chi tiết đơn hàng
      const dongCoSP = dongSP.filter(d => d.maSP || d.tenSP)
      for (let i = 0; i < dongCoSP.length; i++) {
        const d = dongCoSP[i]
        await fetch('/api/chi-tiet-don', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            'Mã chi tiết':          `CT-${maDon}-${i + 1}`,
            'Mã đơn hàng':          maDon,
            'Mã SP':                d.maSP,
            'Tên SP (ghi nhanh)':   d.tenSP,
            'Số lượng':             d.soLuong,
            'Đơn giá':              d.donGia,
            'Thành tiền':           d.thanhTien,
            'Ghi chú SP':           d.ghiChu,
          }),
        })
      }

      router.push(`/dashboard/don-hang?success=${maDon}`)
      router.refresh()

    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setLoading(false)
    }
  }

  // ── Giao diện ───────────────────────────────────────────
  return (
    <div style={{ padding: '24px 32px', maxWidth: '1100px' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
        <div>
          <h1 style={{ fontFamily:'Playfair Display,serif', fontSize:'24px', fontWeight:700 }}>
            ➕ Tạo đơn hàng mới
          </h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'13px', marginTop:'2px' }}>
            Mã đơn: <strong style={{ color:'var(--primary)' }}>{maDon}</strong>
          </p>
        </div>
        <button onClick={() => router.back()} className="btn btn-ghost">
          ← Quay lại
        </button>
      </div>

      {error && (
        <div style={{
          background:'#FEE2E2', color:'#DC2626', padding:'12px 16px',
          borderRadius:'8px', marginBottom:'16px', fontSize:'14px',
        }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>

        {/* ── Cột trái ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

          {/* Thông tin đơn hàng */}
          <div className="card" style={{ padding:'20px' }}>
            <h3 style={{ fontSize:'14px', fontWeight:700, marginBottom:'16px', color:'var(--primary)' }}>
              📋 Thông tin đơn hàng
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <Input label="Ngày đặt" required>
                <input className="input" type="date" value={ngayDat}
                  onChange={e => setNgayDat(e.target.value)} />
              </Input>
              <Input label="Kênh bán" required>
                <select className="input" value={kenhBan} onChange={e => setKenhBan(e.target.value)}>
                  {['Trực tiếp','Zalo','Facebook','Điện thoại'].map(k =>
                    <option key={k}>{k}</option>)}
                </select>
              </Input>
              <Input label="Hình thức giao hàng" required>
                <select className="input" value={htGiao} onChange={e => setHtGiao(e.target.value)}>
                  <option>Giao hàng cho khách</option>
                  <option>Khách mang hàng về</option>
                </select>
              </Input>
              {htGiao === 'Giao hàng cho khách' && (
                <Input label="Ngày hẹn giao">
                  <input className="input" type="datetime-local" value={ngayHenGiao}
                    onChange={e => setNgayHenGiao(e.target.value)} />
                </Input>
              )}
            </div>
          </div>

          {/* Thông tin khách hàng */}
          <div className="card" style={{ padding:'20px' }}>
            <h3 style={{ fontSize:'14px', fontWeight:700, marginBottom:'16px', color:'var(--primary)' }}>
              👥 Khách hàng
            </h3>
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              {/* Tìm kiếm KH */}
              <Input label="Tìm khách hàng" required note="Tìm theo tên, SĐT hoặc mã KH">
                <div style={{ position:'relative' }}>
                  <input
                    className="input"
                    placeholder="Nhập tên hoặc SĐT khách hàng..."
                    value={searchKH}
                    onChange={e => { setSearchKH(e.target.value); setShowKH(true) }}
                    onFocus={() => setShowKH(true)}
                    onBlur={() => setTimeout(() => setShowKH(false), 200)}
                  />
                  {showKH && khachLoc.length > 0 && (
                    <div style={{
                      position:'absolute', top:'100%', left:0, right:0, zIndex:50,
                      background:'white', border:'1px solid var(--border)',
                      borderRadius:'8px', boxShadow:'var(--shadow-md)', maxHeight:'200px', overflowY:'auto',
                    }}>
                      {khachLoc.map(kh => (
                        <div key={kh['Mã KH']}
                          onClick={() => chonKH(kh)}
                          style={{
                            padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid var(--border)',
                            transition:'background 0.1s',
                          }}
                          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC'}
                          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'white'}
                        >
                          <div style={{ fontSize:'13px', fontWeight:600 }}>{kh['Tên khách hàng']}</div>
                          <div style={{ fontSize:'12px', color:'var(--text-secondary)' }}>
                            {kh['Mã KH']} · {kh['Số điện thoại']}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Input>

              {/* Hiện thông tin KH đã chọn */}
              {maKH && (
                <div style={{
                  background:'var(--primary-pale)', borderRadius:'8px', padding:'12px',
                  fontSize:'13px', display:'flex', flexDirection:'column', gap:'4px',
                }}>
                  <div style={{ fontWeight:700, color:'var(--primary)' }}>✅ {tenKH}</div>
                  <div style={{ color:'var(--text-secondary)' }}>📞 {sdtKH}</div>
                  <div style={{ color:'var(--text-secondary)' }}>📍 {diaChiKH}</div>
                </div>
              )}

              {/* Nếu KH mới - nhập tay */}
              {!maKH && searchKH && (
                <div style={{
                  background:'#FEF3C7', borderRadius:'8px', padding:'10px',
                  fontSize:'12px', color:'#92400E',
                }}>
                  ⚠️ Không tìm thấy khách — sẽ lưu tên vừa nhập
                </div>
              )}
            </div>
          </div>

          {/* Thanh toán */}
          <div className="card" style={{ padding:'20px' }}>
            <h3 style={{ fontSize:'14px', fontWeight:700, marginBottom:'16px', color:'var(--primary)' }}>
              💰 Thanh toán
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <Input label="Đặt cọc (VNĐ)">
                <input className="input" type="number" min="0" value={datCoc || ''}
                  placeholder="0"
                  onChange={e => setDatCoc(Number(e.target.value))} />
              </Input>
              <Input label="Hình thức cọc">
                <select className="input" value={htCoc} onChange={e => setHtCoc(e.target.value)}>
                  <option>Tiền mặt</option>
                  <option>Chuyển khoản</option>
                </select>
              </Input>
              <Input label="Xuất hoá đơn VAT">
                <select className="input" value={xuatHoaDon} onChange={e => setXuatHoaDon(e.target.value)}>
                  <option>Không</option>
                  <option>Có</option>
                </select>
              </Input>
            </div>
          </div>

          {/* Ghi chú */}
          <div className="card" style={{ padding:'20px' }}>
            <Input label="Ghi chú đơn hàng">
              <textarea className="input" rows={3} value={ghiChu}
                placeholder="Ghi chú thêm về đơn hàng..."
                onChange={e => setGhiChu(e.target.value)}
                style={{ resize:'vertical' }} />
            </Input>
          </div>
        </div>

        {/* ── Cột phải: Sản phẩm ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          <div className="card" style={{ padding:'20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
              <h3 style={{ fontSize:'14px', fontWeight:700, color:'var(--primary)' }}>
                🪑 Sản phẩm trong đơn
              </h3>
              <button onClick={themDong} className="btn btn-outline btn-sm">
                + Thêm sản phẩm
              </button>
            </div>

            {/* Danh sách sản phẩm */}
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              {dongSP.map((dong, idx) => (
                <div key={dong.id} style={{
                  border:'1px solid var(--border)', borderRadius:'10px',
                  padding:'14px', background:'#FAFBFD',
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                    <span style={{ fontSize:'12px', fontWeight:700, color:'var(--text-secondary)' }}>
                      Sản phẩm #{idx + 1}
                    </span>
                    {dongSP.length > 1 && (
                      <button onClick={() => xoaDong(dong.id)}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'#DC2626', fontSize:'16px' }}>
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Chọn sản phẩm */}
                  <div style={{ marginBottom:'8px' }}>
                    <select
                      className="input"
                      value={dong.maSP}
                      onChange={e => capNhatDong(dong.id, 'maSP', e.target.value)}
                      style={{ marginBottom:'6px' }}
                    >
                      <option value="">-- Chọn sản phẩm --</option>
                      {danhSachSP.map(sp => (
                        <option key={sp['Mã SP']} value={sp['Mã SP']}>
                          {sp['Tên sản phẩm']} ({sp['Đơn vị tính']}) — {Number(sp['Giá bán lẻ']).toLocaleString('vi-VN')}đ
                          {Number(sp['Tồn kho']) === 0 ? ' ⚠️ Hết' : ` | Kho: ${sp['Tồn kho']}`}
                        </option>
                      ))}
                    </select>

                    {/* Nếu SP theo yêu cầu - nhập tên thủ công */}
                    {(!dong.maSP || danhSachSP.find(s => s['Mã SP'] === dong.maSP)?.['Loại SP'] === 'Theo yêu cầu') && (
                      <input
                        className="input"
                        placeholder="Tên sản phẩm (theo yêu cầu)..."
                        value={dong.tenSP}
                        onChange={e => capNhatDong(dong.id, 'tenSP', e.target.value)}
                      />
                    )}
                  </div>

                  {/* Số lượng, Đơn giá */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
                    <div>
                      <label style={{ fontSize:'11px', fontWeight:600, color:'#6B7280' }}>Số lượng</label>
                      <input className="input" type="number" min="1" value={dong.soLuong}
                        onChange={e => capNhatDong(dong.id, 'soLuong', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize:'11px', fontWeight:600, color:'#6B7280' }}>Đơn giá (VNĐ)</label>
                      <input className="input" type="number" min="0" value={dong.donGia || ''}
                        placeholder="0"
                        onChange={e => capNhatDong(dong.id, 'donGia', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize:'11px', fontWeight:600, color:'#6B7280' }}>Thành tiền</label>
                      <input className="input" value={formatVND(dong.thanhTien)} readOnly
                        style={{ background:'#F0FDF4', fontWeight:700, color:'#166534' }} />
                    </div>
                  </div>

                  {/* Ghi chú SP */}
                  <input className="input" placeholder="Ghi chú: màu sắc, kích thước đặc biệt..."
                    value={dong.ghiChu}
                    onChange={e => capNhatDong(dong.id, 'ghiChu', e.target.value)}
                    style={{ marginTop:'8px', fontSize:'12px' }} />
                </div>
              ))}
            </div>

            {/* Tổng tiền */}
            <div style={{
              marginTop:'16px', padding:'14px', borderRadius:'10px',
              background:'var(--primary-pale)', border:'1px solid rgba(27,58,107,0.2)',
            }}>
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px' }}>
                  <span style={{ color:'var(--text-secondary)' }}>Tổng tiền đơn:</span>
                  <span style={{ fontWeight:700 }}>{formatVND(tongTien)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px' }}>
                  <span style={{ color:'var(--text-secondary)' }}>Đã đặt cọc:</span>
                  <span style={{ color:'var(--success)', fontWeight:600 }}>- {formatVND(datCoc)}</span>
                </div>
                <div style={{
                  display:'flex', justifyContent:'space-between',
                  fontSize:'15px', fontWeight:800,
                  borderTop:'1px solid rgba(27,58,107,0.2)',
                  paddingTop:'8px', marginTop:'2px',
                }}>
                  <span style={{ color:'var(--primary)' }}>Còn phải thu:</span>
                  <span style={{ color: conPhaiThu > 0 ? '#DC2626' : '#16A34A' }}>
                    {formatVND(conPhaiThu)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Nút lưu */}
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            <button
              onClick={() => luuDon('Chờ giao')}
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width:'100%', justifyContent:'center' }}
            >
              {loading ? '⏳ Đang lưu...' : '✅ Lưu đơn hàng'}
            </button>
            <button
              onClick={() => luuDon('Đang giao')}
              className="btn btn-accent btn-lg"
              disabled={loading}
              style={{ width:'100%', justifyContent:'center' }}
            >
              🚚 Lưu & Giao hàng ngay
            </button>
            <button
              onClick={() => router.back()}
              className="btn btn-ghost"
              style={{ width:'100%', justifyContent:'center' }}
            >
              Huỷ bỏ
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
