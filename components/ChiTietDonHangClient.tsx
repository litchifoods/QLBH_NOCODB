'use client'
// components/ChiTietDonHangClient.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserSession } from '@/lib/auth'

function formatVND(n: number | string) {
  return Number(n || 0).toLocaleString('vi-VN') + 'đ'
}
function formatDate(s: string) {
  if (!s) return '—'
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}
function formatDateTime(s: string) {
  if (!s) return '—'
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

const TRANG_THAI_LIST = ['Chờ giao', 'Đang giao', 'Hoàn thành', 'Huỷ']
const TRANG_THAI_COLOR: Record<string, { bg: string; color: string }> = {
  'Chờ giao':   { bg: '#FEF3C7', color: '#92400E' },
  'Đang giao':  { bg: '#DBEAFE', color: '#1E40AF' },
  'Hoàn thành': { bg: '#D1FAE5', color: '#065F46' },
  'Huỷ':        { bg: '#FEE2E2', color: '#991B1B' },
}

export default function ChiTietDonHangClient({
  donHang, chiTiet, khachHang, giaoHang, user,
}: {
  donHang: any
  chiTiet: any[]
  khachHang: any
  giaoHang: any[]
  user: UserSession
}) {
  const router = useRouter()
  const [trangThai, setTrangThai] = useState(donHang['Trạng thái'] || 'Chờ giao')
  const [loading, setLoading]     = useState(false)
  const [msg, setMsg]             = useState('')

  const maDon     = donHang['Mã đơn hàng']
  const tongTien  = Number(donHang['Tổng tiền đơn'] || 0)
  const datCoc    = Number(donHang['Đặt cọc'] || 0)
  const conLai    = Number(donHang['Còn phải thu'] || tongTien - datCoc)
  const tt        = TRANG_THAI_COLOR[trangThai] || { bg: '#F3F4F6', color: '#374151' }

  async function capNhatTrangThai(newTT: string) {
    setLoading(true)
    setMsg('')
    try {
      const res = await fetch(`/api/don-hang/${maDon}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'Trạng thái': newTT }),
      })
      if (!res.ok) throw new Error('Lỗi cập nhật')
      setTrangThai(newTT)
      setMsg('✅ Đã cập nhật trạng thái')
      setTimeout(() => setMsg(''), 3000)
    } catch {
      setMsg('❌ Lỗi cập nhật, thử lại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1000px' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'24px' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'4px' }}>
            <h1 style={{ fontFamily:'Playfair Display,serif', fontSize:'22px', fontWeight:700 }}>
              📋 {maDon}
            </h1>
            <span style={{
              padding:'4px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:700,
              background: tt.bg, color: tt.color,
            }}>{trangThai}</span>
          </div>
          <p style={{ color:'var(--text-secondary)', fontSize:'13px' }}>
            Ngày đặt: {formatDate(donHang['Ngày bán'] || donHang['Ngày đặt'])} &nbsp;·&nbsp;
            NV: {donHang['Nhân viên bán'] || '—'} &nbsp;·&nbsp;
            Kênh: {donHang['Kênh bán'] || '—'}
          </p>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <Link href={`/dashboard/don-hang/${maDon}/in`}
            className="btn btn-outline btn-sm">🖨️ In hoá đơn</Link>
          <button onClick={() => router.back()} className="btn btn-ghost btn-sm">← Quay lại</button>
        </div>
      </div>

      {msg && (
        <div style={{
          background: msg.startsWith('✅') ? '#D1FAE5' : '#FEE2E2',
          color: msg.startsWith('✅') ? '#065F46' : '#991B1B',
          padding:'10px 16px', borderRadius:'8px', marginBottom:'16px', fontSize:'13px',
        }}>{msg}</div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>

        {/* Cột trái */}
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

          {/* Khách hàng */}
          <div className="card" style={{ padding:'20px' }}>
            <h3 style={{ fontSize:'13px', fontWeight:700, color:'var(--primary)', marginBottom:'12px' }}>
              👥 Khách hàng
            </h3>
            {khachHang ? (
              <div style={{ display:'flex', flexDirection:'column', gap:'6px', fontSize:'13px' }}>
                <div style={{ fontWeight:700, fontSize:'15px' }}>{khachHang['Tên khách hàng']}</div>
                <div style={{ color:'var(--text-secondary)' }}>📞 {khachHang['Số điện thoại'] || '—'}</div>
                <div style={{ color:'var(--text-secondary)' }}>📍 {khachHang['Địa chỉ'] || '—'}</div>
                <div style={{ color:'var(--text-secondary)' }}>
                  Loại: {khachHang['Đối tượng khách hàng'] || '—'}
                </div>
              </div>
            ) : (
              <div style={{ color:'var(--text-secondary)', fontSize:'13px' }}>
                Mã KH: {donHang['Mã KH'] || '—'}
              </div>
            )}
          </div>

          {/* Thông tin giao hàng */}
          <div className="card" style={{ padding:'20px' }}>
            <h3 style={{ fontSize:'13px', fontWeight:700, color:'var(--primary)', marginBottom:'12px' }}>
              🚚 Giao hàng
            </h3>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px', fontSize:'13px' }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'var(--text-secondary)' }}>Hình thức:</span>
                <span style={{ fontWeight:600 }}>{donHang['Hình thức giao hàng'] || '—'}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'var(--text-secondary)' }}>Ngày hẹn giao:</span>
                <span style={{ fontWeight:600 }}>{formatDateTime(donHang['Ngày hẹn giao'])}</span>
              </div>
              {giaoHang.length > 0 && (
                <div style={{ marginTop:'8px', borderTop:'1px solid var(--border)', paddingTop:'8px' }}>
                  <div style={{ fontWeight:700, marginBottom:'6px', fontSize:'12px', color:'var(--text-secondary)' }}>
                    CÁC CHUYẾN GIAO
                  </div>
                  {giaoHang.map((g: any, i: number) => (
                    <div key={i} style={{
                      background:'#F8FAFC', borderRadius:'6px', padding:'8px 10px',
                      marginBottom:'6px', fontSize:'12px',
                    }}>
                      <div style={{ fontWeight:600 }}>Chuyến {i+1}: {g['Người giao'] || '—'}</div>
                      <div style={{ color:'var(--text-secondary)' }}>
                        {formatDateTime(g['Ngày giao'])} · {g['Tình trạng đối soát'] || 'Chưa đối soát'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Thanh toán */}
          <div className="card" style={{ padding:'20px' }}>
            <h3 style={{ fontSize:'13px', fontWeight:700, color:'var(--primary)', marginBottom:'12px' }}>
              💰 Thanh toán
            </h3>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px' }}>
                <span style={{ color:'var(--text-secondary)' }}>Tổng tiền đơn:</span>
                <span style={{ fontWeight:700 }}>{formatVND(tongTien)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px' }}>
                <span style={{ color:'var(--text-secondary)' }}>Đặt cọc ({donHang['Hình thức cọc'] || '—'}):</span>
                <span style={{ color:'var(--success)', fontWeight:600 }}>{formatVND(datCoc)}</span>
              </div>
              <div style={{
                display:'flex', justifyContent:'space-between', fontSize:'15px', fontWeight:800,
                borderTop:'1px solid var(--border)', paddingTop:'8px', marginTop:'4px',
              }}>
                <span>Còn phải thu:</span>
                <span style={{ color: conLai > 0 ? '#DC2626' : '#16A34A' }}>{formatVND(conLai)}</span>
              </div>
              {donHang['Xuất hóa đơn'] === 'Có' && (
                <div style={{
                  background:'#FEF3C7', color:'#92400E', padding:'6px 10px',
                  borderRadius:'6px', fontSize:'12px', fontWeight:600, marginTop:'4px',
                }}>🧾 Xuất hoá đơn VAT</div>
              )}
            </div>
          </div>

          {/* Ghi chú */}
          {donHang['Ghi chú'] && (
            <div className="card" style={{ padding:'20px' }}>
              <h3 style={{ fontSize:'13px', fontWeight:700, color:'var(--primary)', marginBottom:'8px' }}>
                📝 Ghi chú
              </h3>
              <p style={{ fontSize:'13px', color:'var(--text-secondary)', lineHeight:1.6 }}>
                {donHang['Ghi chú']}
              </p>
            </div>
          )}
        </div>

        {/* Cột phải */}
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

          {/* Sản phẩm */}
          <div className="card" style={{ padding:'20px' }}>
            <h3 style={{ fontSize:'13px', fontWeight:700, color:'var(--primary)', marginBottom:'12px' }}>
              🪑 Sản phẩm trong đơn ({chiTiet.length})
            </h3>
            {chiTiet.length === 0 ? (
              <p style={{ color:'var(--text-muted)', fontSize:'13px' }}>Chưa có sản phẩm</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {chiTiet.map((ct: any, i: number) => (
                  <div key={i} style={{
                    border:'1px solid var(--border)', borderRadius:'8px',
                    padding:'12px', background:'#FAFBFD',
                  }}>
                    <div style={{ fontWeight:700, fontSize:'13px', marginBottom:'4px' }}>
                      {ct['Tên SP (ghi nhanh)'] || ct['Mã SP'] || `SP ${i+1}`}
                    </div>
                    <div style={{ display:'flex', gap:'16px', fontSize:'12px', color:'var(--text-secondary)' }}>
                      <span>SL: <strong style={{ color:'#1F2937' }}>{ct['Số lượng']}</strong></span>
                      <span>Đơn giá: <strong style={{ color:'#1F2937' }}>{formatVND(ct['Đơn giá'])}</strong></span>
                      <span>Thành tiền: <strong style={{ color:'var(--success)' }}>{formatVND(ct['Thành tiền'])}</strong></span>
                    </div>
                    {ct['Ghi chú SP'] && (
                      <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'4px', fontStyle:'italic' }}>
                        {ct['Ghi chú SP']}
                      </div>
                    )}
                  </div>
                ))}
                {/* Tổng */}
                <div style={{
                  background:'var(--primary-pale)', borderRadius:'8px', padding:'12px',
                  display:'flex', justifyContent:'space-between', fontWeight:800, fontSize:'15px',
                }}>
                  <span style={{ color:'var(--primary)' }}>Tổng cộng:</span>
                  <span>{formatVND(tongTien)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Cập nhật trạng thái — chỉ chủ cửa hàng */}
          {user.vaiTro === 'Chủ cửa hàng' && (
            <div className="card" style={{ padding:'20px' }}>
              <h3 style={{ fontSize:'13px', fontWeight:700, color:'var(--primary)', marginBottom:'12px' }}>
                🔄 Cập nhật trạng thái
              </h3>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                {TRANG_THAI_LIST.map(tt => {
                  const colors = TRANG_THAI_COLOR[tt]
                  const isActive = trangThai === tt
                  return (
                    <button key={tt}
                      onClick={() => capNhatTrangThai(tt)}
                      disabled={loading || isActive}
                      style={{
                        padding:'10px', borderRadius:'8px', border:'2px solid',
                        borderColor: isActive ? colors.color : 'var(--border)',
                        background: isActive ? colors.bg : 'white',
                        color: isActive ? colors.color : 'var(--text-secondary)',
                        fontWeight: isActive ? 700 : 500,
                        cursor: isActive ? 'default' : 'pointer',
                        fontSize:'13px', transition:'all 0.15s',
                      }}>
                      {tt}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            <Link href={`/dashboard/don-hang/${maDon}/in`}
              className="btn btn-primary btn-lg"
              style={{ textAlign:'center', justifyContent:'center' }}>
              🖨️ In hoá đơn
            </Link>
            <Link href="/dashboard/don-hang"
              className="btn btn-ghost"
              style={{ textAlign:'center', justifyContent:'center' }}>
              ← Về danh sách đơn hàng
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
