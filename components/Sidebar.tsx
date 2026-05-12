'use client'
// components/Sidebar.tsx
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { UserSession } from '@/lib/auth'

// Menu theo đúng thứ tự file Word của chủ cửa hàng
const MENU = [
  {
    group: 'BÁN HÀNG',
    items: [
      { href: '/dashboard/don-hang/tao', icon: '➕', label: 'Tạo đơn hàng mới' },
      { href: '/dashboard/khach-hang',   icon: '👥', label: 'Khách hàng' },
    ],
  },
  {
    group: 'GIAO HÀNG',
    items: [
      { href: '/dashboard/giao-hang', icon: '🚚', label: 'Giao hàng' },
      { href: '/dashboard/doi-soat',  icon: '💰', label: 'Đối soát' },
    ],
  },
  {
    group: 'KHO & HÀNG HÓA',
    items: [
      { href: '/dashboard/san-pham',      icon: '🪑', label: 'Sản phẩm' },
      { href: '/dashboard/dat-hang-ncc',  icon: '🛒', label: 'Đặt hàng NCC' },
      { href: '/dashboard/nhap-kho',      icon: '📦', label: 'Nhập kho' },
      { href: '/dashboard/kiem-kho',      icon: '🔍', label: 'Kiểm kho' },
    ],
  },
  {
    group: 'NHÀ CUNG CẤP',
    items: [
      { href: '/dashboard/nha-cung-cap',   icon: '🏭', label: 'Nhà cung cấp' },
      { href: '/dashboard/thanh-toan-ncc', icon: '💳', label: 'Thanh toán NCC' },
    ],
  },
  {
    group: 'NHÂN SỰ',
    items: [
      { href: '/dashboard/nhan-vien',  icon: '👤', label: 'Nhân viên' },
      { href: '/dashboard/chi-tra-nv', icon: '💵', label: 'Chi trả NV' },
    ],
  },
  {
    group: 'TÀI CHÍNH',
    items: [
      { href: '/dashboard/chi-phi', icon: '📉', label: 'Chi phí' },
      { href: '/dashboard/bao-cao', icon: '📈', label: 'Báo cáo' },
    ],
  },
]

// Chỉ chủ cửa hàng mới thấy
const QUAN_TRI = [
  { href: '/dashboard/tai-khoan', icon: '⚙️', label: 'Tài khoản' },
]

export default function Sidebar({ user }: { user: UserSession }) {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, bottom: 0,
      width: 'var(--sidebar-w)',
      background: 'linear-gradient(180deg, #0F172A 0%, #1B3A6B 100%)',
      display: 'flex', flexDirection: 'column',
      zIndex: 100, overflowY: 'auto',
    }}>

      {/* Logo + tên cửa hàng */}
      <Link href="/dashboard" style={{ textDecoration: 'none' }}>
        <div style={{
          padding: '18px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', gap: '10px',
          cursor: 'pointer',
        }}>
          <div style={{
            width: '40px', height: '40px',
            background: 'linear-gradient(135deg, #C8860A, #F5A623)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '20px', flexShrink: 0,
          }}>🏠</div>
          <div>
            <div style={{
              fontFamily: 'Playfair Display, serif',
              color: 'white', fontWeight: 700, fontSize: '13px', lineHeight: 1.2,
            }}>
              Nội Thất<br />Tính Tuyết
            </div>
          </div>
        </div>
      </Link>

      {/* Thông tin người dùng */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <div style={{
          width: '34px', height: '34px',
          background: user.vaiTro === 'Chủ cửa hàng'
            ? 'linear-gradient(135deg, #C8860A, #F5A623)'
            : 'rgba(255,255,255,0.15)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '16px', flexShrink: 0,
        }}>
          {user.vaiTro === 'Chủ cửa hàng' ? '👑' : '👤'}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            color: 'white', fontSize: '13px', fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {user.hoTen}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>
            {user.vaiTro}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '8px 10px', overflowY: 'auto' }}>

        {/* Dashboard - luôn hiện */}
        <Link
          href="/dashboard"
          className={`sidebar-link ${pathname === '/dashboard' ? 'active' : ''}`}
          style={{ marginBottom: '4px' }}
        >
          <span style={{ fontSize: '15px' }}>📊</span>
          <span style={{ fontSize: '13.5px' }}>Dashboard</span>
        </Link>

        {/* Các nhóm menu chính */}
        {MENU.map(group => (
          <div key={group.group} style={{ marginTop: '8px' }}>
            <div style={{
              padding: '8px 8px 4px',
              fontSize: '10px', fontWeight: 700,
              color: 'rgba(255,255,255,0.35)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              {group.group}
            </div>
            {group.items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive(item.href) ? 'active' : ''}`}
              >
                <span style={{ fontSize: '15px', flexShrink: 0 }}>{item.icon}</span>
                <span style={{ fontSize: '13.5px' }}>{item.label}</span>
                {isActive(item.href) && (
                  <div style={{
                    marginLeft: 'auto', width: '4px', height: '4px',
                    background: '#F5A623', borderRadius: '50%',
                  }} />
                )}
              </Link>
            ))}
          </div>
        ))}

        {/* Quản trị - chỉ chủ cửa hàng */}
        {user.vaiTro === 'Chủ cửa hàng' && (
          <div style={{ marginTop: '8px' }}>
            <div style={{
              padding: '8px 8px 4px',
              fontSize: '10px', fontWeight: 700,
              color: 'rgba(255,255,255,0.35)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              QUẢN TRỊ
            </div>
            {QUAN_TRI.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive(item.href) ? 'active' : ''}`}
              >
                <span style={{ fontSize: '15px' }}>{item.icon}</span>
                <span style={{ fontSize: '13.5px' }}>{item.label}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Đăng xuất */}
      <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={handleLogout}
          className="sidebar-link"
          style={{ width: '100%', background: 'rgba(220,38,38,0.15)' }}
        >
          <span style={{ fontSize: '15px' }}>🚪</span>
          <span style={{ fontSize: '13.5px' }}>Đăng xuất</span>
        </button>
      </div>
    </aside>
  )
}
