'use client'
// components/Sidebar.tsx
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { UserSession } from '@/lib/auth'

const MENU_ITEMS = [
  {
    group: 'Tổng quan',
    items: [
      { href: '/dashboard',          icon: '📊', label: 'Dashboard' },
    ]
  },
  {
    group: 'Bán hàng',
    items: [
      { href: '/dashboard/don-hang',        icon: '📋', label: 'Đơn hàng' },
      { href: '/dashboard/don-hang/tao',    icon: '➕', label: 'Tạo đơn mới' },
      { href: '/dashboard/khach-hang',      icon: '👥', label: 'Khách hàng' },
    ]
  },
  {
    group: 'Kho & Hàng hoá',
    items: [
      { href: '/dashboard/san-pham',        icon: '🪑', label: 'Sản phẩm' },
      { href: '/dashboard/nhap-kho',        icon: '📦', label: 'Nhập kho' },
      { href: '/dashboard/kiem-kho',        icon: '🔍', label: 'Kiểm kho' },
      { href: '/dashboard/dat-hang-ncc',    icon: '🛒', label: 'Đặt hàng NCC' },
    ]
  },
  {
    group: 'Giao hàng',
    items: [
      { href: '/dashboard/giao-hang',       icon: '🚚', label: 'Giao hàng' },
      { href: '/dashboard/doi-soat',        icon: '💰', label: 'Đối soát' },
    ]
  },
  {
    group: 'Nhà cung cấp',
    items: [
      { href: '/dashboard/nha-cung-cap',    icon: '🏭', label: 'Nhà cung cấp' },
      { href: '/dashboard/thanh-toan-ncc',  icon: '💳', label: 'Thanh toán NCC' },
    ]
  },
  {
    group: 'Nhân sự',
    items: [
      { href: '/dashboard/nhan-vien',       icon: '👤', label: 'Nhân viên' },
      { href: '/dashboard/chi-tra-nv',      icon: '💵', label: 'Chi trả NV' },
    ]
  },
  {
    group: 'Tài chính',
    items: [
      { href: '/dashboard/chi-phi',         icon: '📉', label: 'Chi phí' },
      { href: '/dashboard/bao-cao',         icon: '📈', label: 'Báo cáo' },
    ]
  },
]

// Menu chỉ dành cho chủ cửa hàng
const OWNER_ONLY = [
  { href: '/dashboard/tai-khoan',  icon: '⚙️', label: 'Tài khoản' },
]

export default function Sidebar({ user }: { user: UserSession }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, bottom: 0,
      width: 'var(--sidebar-w)',
      background: 'linear-gradient(180deg, #0F172A 0%, #1B3A6B 100%)',
      display: 'flex', flexDirection: 'column',
      zIndex: 100, overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px', height: '38px',
            background: 'linear-gradient(135deg, #C8860A, #F5A623)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', flexShrink: 0,
          }}>🏠</div>
          <div>
            <div style={{
              fontFamily: 'Playfair Display, serif',
              color: 'white', fontWeight: 700, fontSize: '14px',
              lineHeight: 1.2,
            }}>Nội Thất<br />Tính Tuyết</div>
          </div>
        </div>
      </div>

      {/* User info */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <div style={{
          width: '34px', height: '34px',
          background: 'rgba(255,255,255,0.15)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px', flexShrink: 0,
        }}>
          {user.vaiTro === 'Chủ cửa hàng' ? '👑' : '👤'}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            color: 'white', fontSize: '13px', fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{user.hoTen}</div>
          <div style={{
            color: 'rgba(255,255,255,0.5)', fontSize: '11px',
          }}>{user.vaiTro}</div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '8px 10px', overflowY: 'auto' }}>
        {MENU_ITEMS.map(group => (
          <div key={group.group} style={{ marginBottom: '4px' }}>
            <div style={{
              padding: '10px 8px 4px',
              fontSize: '10px', fontWeight: 700,
              color: 'rgba(255,255,255,0.35)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              {group.group}
            </div>
            {group.items.map(item => {
              const isActive = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <span style={{ fontSize: '15px', flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontSize: '13.5px' }}>{item.label}</span>
                  {isActive && (
                    <div style={{
                      marginLeft: 'auto',
                      width: '4px', height: '4px',
                      background: '#F5A623',
                      borderRadius: '50%',
                    }} />
                  )}
                </Link>
              )
            })}
          </div>
        ))}

        {/* Chủ cửa hàng only */}
        {user.vaiTro === 'Chủ cửa hàng' && (
          <div style={{ marginBottom: '4px' }}>
            <div style={{
              padding: '10px 8px 4px',
              fontSize: '10px', fontWeight: 700,
              color: 'rgba(255,255,255,0.35)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>Quản trị</div>
            {OWNER_ONLY.map(item => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <span style={{ fontSize: '15px' }}>{item.icon}</span>
                  <span style={{ fontSize: '13.5px' }}>{item.label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* Logout */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}>
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
