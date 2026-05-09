'use client'
// components/DashboardClient.tsx
import { UserSession } from '@/lib/auth'
import Link from 'next/link'

function formatVND(num: number) {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + ' tỷ'
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + ' tr'
  if (num >= 1_000) return (num / 1_000).toFixed(0) + 'k'
  return num.toLocaleString('vi-VN')
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

function getTrangThaiBadge(tt: string) {
  const map: Record<string, string> = {
    'Chờ giao':   'badge-warning',
    'Đang giao':  'badge-info',
    'Hoàn thành': 'badge-success',
    'Huỷ':        'badge-danger',
    'Mới':        'badge-neutral',
  }
  return map[tt] || 'badge-neutral'
}

function StatCard({
  icon, label, value, sub, color, href
}: {
  icon: string, label: string, value: string,
  sub?: string, color: string, href?: string
}) {
  const content = (
    <div className="card" style={{
      padding: '20px', display: 'flex',
      alignItems: 'flex-start', gap: '14px',
      transition: 'transform 0.15s, box-shadow 0.15s',
      cursor: href ? 'pointer' : 'default',
    }}
    onMouseEnter={e => {
      if (href) {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)'
      }
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
      ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)'
    }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '12px',
        background: color, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: '22px', flexShrink: 0,
      }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>
          {label}
        </div>
        <div className="stat-value" style={{
          fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1
        }}>{value}</div>
        {sub && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{sub}</div>}
      </div>
    </div>
  )
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{content}</Link> : content
}

function AlertBadge({ count, label, color, href }: {
  count: number, label: string, color: string, href: string
}) {
  if (count === 0) return null
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderRadius: '8px',
        background: color, marginBottom: '8px',
        transition: 'opacity 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = '0.85'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = '1'}>
        <span style={{ fontSize: '13px', fontWeight: 600 }}>{label}</span>
        <span style={{
          background: 'rgba(0,0,0,0.15)', color: 'inherit',
          borderRadius: '999px', padding: '2px 10px',
          fontSize: '13px', fontWeight: 800,
        }}>{count}</span>
      </div>
    </Link>
  )
}

export default function DashboardClient({
  user, data
}: {
  user: UserSession
  data: {
    doanhThuHomNay: number
    doanhThuThang: number
    daThuthuThang: number
    tongDon: number
    donMoi: number
    donChoGiao: number
    donDangGiao: number
    donHoanThanh: number
    donHuy: number
    donSapGiao: any[]
    donGanNhat: any[]
    spHetHang: number
    spSapHet: number
    giaoChuaDoiSoat: number
    khachMoi: number
    tongKhach: number
  }
}) {
  const now = new Date()
  const thoiGian = now.getHours() < 12 ? 'buổi sáng' :
                   now.getHours() < 18 ? 'buổi chiều' : 'buổi tối'

  return (
    <div style={{ padding: '28px 32px', maxWidth: '1400px' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: '28px',
      }}>
        <div>
          <h1 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: '26px', fontWeight: 700,
            color: 'var(--text-primary)',
          }}>
            Chào {thoiGian}, {user.hoTen.split(' ').pop()} 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            {new Date().toLocaleDateString('vi-VN', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/dashboard/don-hang/tao" className="btn btn-primary">
            ➕ Tạo đơn mới
          </Link>
          <Link href="/dashboard/don-hang" className="btn btn-outline">
            📋 Xem tất cả đơn
          </Link>
        </div>
      </div>

      {/* Stats chính */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px', marginBottom: '24px',
      }}>
        <StatCard
          icon="💰" label="Doanh thu hôm nay"
          value={formatVND(data.doanhThuHomNay) + 'đ'}
          color="linear-gradient(135deg, #DCFCE7, #86EFAC)"
        />
        <StatCard
          icon="📅" label="Doanh thu tháng này"
          value={formatVND(data.doanhThuThang) + 'đ'}
          sub={`Đã thu: ${formatVND(data.daThuthuThang)}đ`}
          color="linear-gradient(135deg, #DBEAFE, #93C5FD)"
        />
        <StatCard
          icon="📋" label="Tổng đơn hàng"
          value={String(data.tongDon)}
          sub={`Tháng này: ${data.donChoGiao + data.donDangGiao + data.donHoanThanh} đơn`}
          color="linear-gradient(135deg, #FEF3C7, #FCD34D)"
          href="/dashboard/don-hang"
        />
        <StatCard
          icon="👥" label="Khách hàng"
          value={String(data.tongKhach)}
          color="linear-gradient(135deg, #F3E8FF, #C4B5FD)"
          href="/dashboard/khach-hang"
        />
      </div>

      {/* Main content grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 320px',
        gap: '20px',
      }}>

        {/* Cột trái */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Trạng thái đơn hàng */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{
              fontSize: '15px', fontWeight: 700,
              marginBottom: '16px', color: 'var(--text-primary)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              📊 Trạng thái đơn hàng
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '12px',
            }}>
              {[
                { label: 'Chờ giao', count: data.donChoGiao,   color: '#FEF3C7', text: '#D97706', icon: '⏳' },
                { label: 'Đang giao', count: data.donDangGiao,  color: '#E0F2FE', text: '#0284C7', icon: '🚚' },
                { label: 'Hoàn thành',count: data.donHoanThanh, color: '#DCFCE7', text: '#16A34A', icon: '✅' },
                { label: 'Đã huỷ',   count: data.donHuy,       color: '#FEE2E2', text: '#DC2626', icon: '❌' },
              ].map(item => (
                <Link key={item.label} href={`/dashboard/don-hang?trang_thai=${encodeURIComponent(item.label)}`}
                  style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: item.color, borderRadius: '10px',
                    padding: '14px', textAlign: 'center',
                    transition: 'transform 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.03)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'}>
                    <div style={{ fontSize: '20px', marginBottom: '6px' }}>{item.icon}</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: item.text }}>{item.count}</div>
                    <div style={{ fontSize: '12px', color: item.text, fontWeight: 600 }}>{item.label}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Bảng đơn hàng gần nhất */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: '16px',
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                🕐 Đơn hàng gần nhất
              </h3>
              <Link href="/dashboard/don-hang" className="btn btn-ghost btn-sm">
                Xem tất cả →
              </Link>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Ngày đặt</th>
                    <th>Mã KH</th>
                    <th>Kênh</th>
                    <th>Tổng tiền</th>
                    <th>Trạng thái</th>
                    <th>Ngày giao</th>
                  </tr>
                </thead>
                <tbody>
                  {data.donGanNhat.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                      Chưa có đơn hàng nào
                    </td></tr>
                  ) : data.donGanNhat.map((don: any, i: number) => (
                    <tr key={i}>
                      <td>
                        <Link href={`/dashboard/don-hang/${don['Mã đơn hàng']}`}
                          style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                          {don['Mã đơn hàng']}
                        </Link>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{formatDate(don['Ngày đặt'])}</td>
                      <td style={{ fontSize: '13px' }}>{don['Mã KH'] || '—'}</td>
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {don['Kênh bán'] || '—'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {Number(don['Tổng tiền đơn']).toLocaleString('vi-VN')}đ
                      </td>
                      <td>
                        <span className={`badge ${getTrangThaiBadge(don['Trạng thái'])}`}>
                          {don['Trạng thái'] || 'Mới'}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {formatDate(don['Ngày hẹn giao'])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Cột phải - Cảnh báo & Thông tin nhanh */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Cảnh báo quan trọng */}
          <div className="card" style={{ padding: '18px' }}>
            <h3 style={{
              fontSize: '14px', fontWeight: 700,
              marginBottom: '12px', color: 'var(--text-primary)',
            }}>
              🔔 Cảnh báo cần xử lý
            </h3>
            {data.donSapGiao.length === 0 && data.spHetHang === 0 &&
             data.spSapHet === 0 && data.giaoChuaDoiSoat === 0 ? (
              <div style={{
                textAlign: 'center', padding: '20px',
                color: 'var(--text-muted)', fontSize: '13px',
              }}>
                ✨ Không có cảnh báo nào
              </div>
            ) : (
              <>
                <AlertBadge
                  count={data.donSapGiao.length}
                  label="⚡ Đơn cần giao trong 3 ngày"
                  color="var(--warning-pale)"
                  href="/dashboard/don-hang?trang_thai=Ch%E1%BB%9D+giao"
                />
                <AlertBadge
                  count={data.giaoChuaDoiSoat}
                  label="💰 Chuyến chưa đối soát"
                  color="var(--info-pale)"
                  href="/dashboard/doi-soat"
                />
                <AlertBadge
                  count={data.spHetHang}
                  label="❌ Sản phẩm hết hàng"
                  color="var(--danger-pale)"
                  href="/dashboard/san-pham?canh_bao=Het+hang"
                />
                <AlertBadge
                  count={data.spSapHet}
                  label="⚠️ Sản phẩm sắp hết"
                  color="var(--warning-pale)"
                  href="/dashboard/san-pham?canh_bao=Sap+het"
                />
              </>
            )}
          </div>

          {/* Giao hàng sắp tới */}
          {data.donSapGiao.length > 0 && (
            <div className="card" style={{ padding: '18px' }}>
              <h3 style={{
                fontSize: '14px', fontWeight: 700,
                marginBottom: '12px', color: 'var(--text-primary)',
              }}>
                🚚 Giao hàng trong 3 ngày tới
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.donSapGiao.slice(0, 5).map((don: any, i: number) => {
                  const ngayGiao = new Date(don['Ngày hẹn giao'])
                  const homNay = new Date()
                  const diff = Math.ceil((ngayGiao.getTime() - homNay.getTime()) / 86400000)
                  return (
                    <Link key={i} href={`/dashboard/don-hang/${don['Mã đơn hàng']}`}
                      style={{ textDecoration: 'none' }}>
                      <div style={{
                        padding: '10px 12px', borderRadius: '8px',
                        background: diff === 0 ? 'var(--danger-pale)' : 'var(--warning-pale)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        transition: 'opacity 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = '0.8'}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = '1'}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {don['Mã đơn hàng']}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {don['Mã KH']} • {Number(don['Còn phải thu']).toLocaleString('vi-VN')}đ
                          </div>
                        </div>
                        <div style={{
                          fontSize: '11px', fontWeight: 700,
                          color: diff === 0 ? 'var(--danger)' : 'var(--warning)',
                          whiteSpace: 'nowrap',
                        }}>
                          {diff === 0 ? '⚡ Hôm nay' : `Còn ${diff} ngày`}
                        </div>
                      </div>
                    </Link>
                  )
                })}
                {data.donSapGiao.length > 5 && (
                  <Link href="/dashboard/don-hang" style={{
                    textAlign: 'center', fontSize: '12px',
                    color: 'var(--primary)', textDecoration: 'none', fontWeight: 600,
                  }}>
                    + {data.donSapGiao.length - 5} đơn khác →
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Truy cập nhanh */}
          <div className="card" style={{ padding: '18px' }}>
            <h3 style={{
              fontSize: '14px', fontWeight: 700,
              marginBottom: '12px', color: 'var(--text-primary)',
            }}>
              ⚡ Truy cập nhanh
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { icon: '➕', label: 'Tạo đơn', href: '/dashboard/don-hang/tao', color: '#DBEAFE' },
                { icon: '📦', label: 'Nhập kho', href: '/dashboard/nhap-kho/tao', color: '#DCFCE7' },
                { icon: '🔍', label: 'Kiểm kho', href: '/dashboard/kiem-kho', color: '#FEF3C7' },
                { icon: '📊', label: 'Báo cáo', href: '/dashboard/bao-cao', color: '#F3E8FF' },
              ].map(item => (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: item.color, borderRadius: '8px',
                    padding: '12px 8px', textAlign: 'center',
                    transition: 'transform 0.15s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.04)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{item.icon}</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {item.label}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
