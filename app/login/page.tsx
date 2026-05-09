'use client'
// app/login/page.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [tenDangNhap, setTenDangNhap] = useState('')
  const [matKhau, setMatKhau]         = useState('')
  const [nhoDangNhap, setNhoDangNhap] = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [showPass, setShowPass]       = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenDangNhap, matKhau, nhoDangNhap }),
      })

      const data = await res.json()

      if (res.ok) {
        router.push('/dashboard')
        router.refresh()
      } else {
        setError(data.message || 'Tên đăng nhập hoặc mật khẩu không đúng')
      }
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, #0F172A 0%, #1B3A6B 50%, #0F172A 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background decorative elements */}
      <div style={{
        position: 'absolute', top: '-100px', right: '-100px',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(200,134,10,0.15) 0%, transparent 70%)',
        borderRadius: '50%',
      }} />
      <div style={{
        position: 'absolute', bottom: '-150px', left: '-100px',
        width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(46,91,168,0.2) 0%, transparent 70%)',
        borderRadius: '50%',
      }} />

      {/* Left panel - branding */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px',
        color: 'white',
      }} className="no-print" hidden={typeof window !== 'undefined' && window.innerWidth < 768}>
        <div style={{ marginBottom: '48px' }}>
          <div style={{
            width: '64px', height: '64px',
            background: 'linear-gradient(135deg, #C8860A, #F5A623)',
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', marginBottom: '24px',
            boxShadow: '0 8px 24px rgba(200,134,10,0.4)',
          }}>🏠</div>
          <h1 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: '36px', fontWeight: 700,
            lineHeight: 1.2, marginBottom: '12px',
          }}>
            Nội Thất<br />Tính Tuyết
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px', maxWidth: '320px' }}>
            Hệ thống quản lý bán hàng thông minh — kết hợp AI, tự động hoá và báo cáo thời gian thực.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { icon: '📊', text: 'Dashboard tổng quan thời gian thực' },
            { icon: '🤖', text: 'AI hỗ trợ nhập liệu bằng giọng nói' },
            { icon: '📱', text: 'Thông báo tức thì qua Telegram' },
            { icon: '🖨️', text: 'In hoá đơn và phiếu giao hàng' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              color: 'rgba(255,255,255,0.8)', fontSize: '14px',
            }}>
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - login form */}
      <div style={{
        width: '100%', maxWidth: '460px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 32px',
      }}>
        <div style={{
          width: '100%',
          background: 'rgba(255,255,255,0.97)',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
        }}>
          {/* Logo mobile */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '52px', height: '52px',
              background: 'linear-gradient(135deg, #1B3A6B, #2E5BA8)',
              borderRadius: '14px',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px', marginBottom: '12px',
            }}>🏠</div>
            <h2 style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '22px', fontWeight: 700,
              color: '#0F172A',
            }}>Đăng nhập hệ thống</h2>
            <p style={{ color: '#64748B', fontSize: '13px', marginTop: '4px' }}>
              Nội Thất Tính Tuyết — QLBH v1.0
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Tên đăng nhập */}
            <div>
              <label style={{
                display: 'block', marginBottom: '6px',
                fontSize: '13px', fontWeight: 600, color: '#374151',
              }}>
                Tên đăng nhập
              </label>
              <input
                className="input"
                type="text"
                placeholder="Nhập tên đăng nhập..."
                value={tenDangNhap}
                onChange={e => setTenDangNhap(e.target.value)}
                required
                autoComplete="username"
                style={{ fontSize: '14px' }}
              />
            </div>

            {/* Mật khẩu */}
            <div>
              <label style={{
                display: 'block', marginBottom: '6px',
                fontSize: '13px', fontWeight: 600, color: '#374151',
              }}>
                Mật khẩu
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu..."
                  value={matKhau}
                  onChange={e => setMatKhau(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: '44px', fontSize: '14px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: '16px', color: '#94A3B8',
                  }}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Nhớ đăng nhập */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              cursor: 'pointer', fontSize: '13px', color: '#475569',
            }}>
              <input
                type="checkbox"
                checked={nhoDangNhap}
                onChange={e => setNhoDangNhap(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#1B3A6B', cursor: 'pointer' }}
              />
              Ghi nhớ đăng nhập (7 ngày)
            </label>

            {/* Lỗi */}
            {error && (
              <div style={{
                background: '#FEE2E2', color: '#DC2626',
                padding: '10px 14px', borderRadius: '8px',
                fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: '4px' }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: '16px', height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Đang đăng nhập...
                </>
              ) : '🔐 Đăng nhập'}
            </button>
          </form>

          <p style={{
            textAlign: 'center', fontSize: '12px',
            color: '#94A3B8', marginTop: '24px',
          }}>
            Quên mật khẩu? Liên hệ chủ cửa hàng để được hỗ trợ.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .left-panel { display: none; }
        }
      `}</style>
    </div>
  )
}
