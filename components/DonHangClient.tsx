'use client'
// components/DonHangClient.tsx
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { UserSession } from '@/lib/auth'

function formatVND(n: number) {
  return n?.toLocaleString('vi-VN') || '0'
}
function formatDate(s: string) {
  if (!s) return '—'
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}
function badgeColor(tt: string) {
  const map: Record<string,{bg:string,color:string}> = {
    'Chờ giao':   { bg:'#FEF3C7', color:'#92400E' },
    'Đang giao':  { bg:'#DBEAFE', color:'#1E40AF' },
    'Hoàn thành': { bg:'#D1FAE5', color:'#065F46' },
    'Huỷ':        { bg:'#FEE2E2', color:'#991B1B' },
  }
  return map[tt] || { bg:'#F3F4F6', color:'#374151' }
}

const TRANG_THAI = ['Tất cả','Chờ giao','Đang giao','Hoàn thành','Huỷ']
const KENH = ['Tất cả','Trực tiếp','Zalo','Facebook','Điện thoại','Online']

export default function DonHangClient({
  donHang, user, searchParams
}: {
  donHang: any[], user: UserSession, searchParams: any
}) {
  const [trangThai, setTrangThai] = useState(searchParams.trang_thai || 'Tất cả')
  const [kenh, setKenh]           = useState(searchParams.kenh || 'Tất cả')
  const [search, setSearch]       = useState(searchParams.q || '')

  // Lọc bỏ dòng rỗng
  const donHangHopLe = useMemo(() =>
    donHang.filter(d => d['Mã đơn hàng'] && d['Mã đơn hàng'].toString().trim() !== '')
  , [donHang])

  const filtered = useMemo(() => {
    return donHangHopLe.filter(d => {
      if (trangThai !== 'Tất cả' && d['Trạng thái'] !== trangThai) return false
      if (kenh !== 'Tất cả' && d['Kênh bán'] !== kenh) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          (d['Mã đơn hàng'] || '').toLowerCase().includes(q) ||
          (d['Mã KH'] || '').toLowerCase().includes(q) ||
          (d['Tên khách hàng'] || '').toLowerCase().includes(q) ||
          (d['Nhân viên bán'] || '').toLowerCase().includes(q) ||
          (d['Địa chỉ giao'] || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [donHangHopLe, trangThai, kenh, search])

  const tongTien = filtered.reduce((s: number, d: any) => s + (Number(d['Tổng tiền đơn']) || 0), 0)

  // Rút gọn tên KH cho gọn
  function rutGonTen(ten: string, maKH: string) {
    if (!ten && !maKH) return '—'
    if (!ten) return maKH
    // Nếu tên dài hơn 20 chữ thì rút gọn
    return ten.length > 20 ? ten.slice(0, 18) + '…' : ten
  }

  return (
    <div style={{ padding: '20px' }}>
      <style>{`
        .don-hang-header {
          display:flex; justify-content:space-between; align-items:center;
          margin-bottom:16px; gap:12px;
        }
        .btn-tao-don {
          background:var(--primary); color:white; border:none; border-radius:8px;
          padding:10px 18px; font-size:14px; font-weight:600;
          white-space:nowrap; flex-shrink:0; cursor:pointer;
          text-decoration:none; display:inline-flex; align-items:center; gap:6px;
        }
        .btn-tao-don:hover { opacity:0.9; }
        .don-table th { padding:9px 10px; font-size:12px; }
        .don-table td { padding:8px 10px; }
        .don-table tbody tr:hover td { background:#F0F4FF !important; }
        @media (max-width:1000px) {
          .col-dia-chi { display:none; }
        }
        @media (max-width:750px) {
          .col-ngay-giao, .col-coc, .col-ht-giao { display:none; }
          .don-hang-header { flex-wrap:wrap; }
        }
      `}</style>

      {/* Header */}
      <div className="don-hang-header">
        <div>
          <h1 style={{ fontFamily:'Playfair Display,serif', fontSize:'20px', fontWeight:700, margin:0 }}>
            📋 Đơn hàng
          </h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'13px', margin:'2px 0 0' }}>
            {filtered.length} đơn • Tổng: {formatVND(tongTien)}đ
          </p>
        </div>
        <Link href="/dashboard/don-hang/tao" className="btn-tao-don">
          ➕ Tạo đơn mới
        </Link>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding:'12px 14px', marginBottom:'14px' }}>
        <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center' }}>
          <input className="input" placeholder="🔍 Tìm mã đơn, tên KH, địa chỉ..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex:'1', minWidth:'160px', maxWidth:'280px' }} />
          <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
            {TRANG_THAI.map(tt => {
              const c = tt !== 'Tất cả' ? badgeColor(tt) : null
              const isActive = trangThai === tt
              return (
                <button key={tt} onClick={() => setTrangThai(tt)} style={{
                  padding:'5px 11px', borderRadius:'20px', border:'1px solid',
                  borderColor: isActive ? (c?.color || 'var(--primary)') : 'var(--border)',
                  background: isActive ? (c?.bg || 'var(--primary-pale)') : 'white',
                  color: isActive ? (c?.color || 'var(--primary)') : 'var(--text-secondary)',
                  fontWeight: isActive ? 700 : 400, fontSize:'12px', cursor:'pointer', whiteSpace:'nowrap',
                }}>{tt}</button>
              )
            })}
          </div>
          <select className="input" value={kenh} onChange={e => setKenh(e.target.value)}
            style={{ width:'auto', minWidth:'110px' }}>
            {KENH.map(k => <option key={k}>{k}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div style={{ overflowX:'auto' }}>
          <table className="don-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
            <thead>
              <tr style={{ background:'#F0F4FF', borderBottom:'2px solid var(--border)' }}>
                <th style={{ textAlign:'left', fontWeight:700, whiteSpace:'nowrap' }}>Mã đơn</th>
                <th style={{ textAlign:'left', fontWeight:700, whiteSpace:'nowrap' }}>Ngày đặt</th>
                <th style={{ textAlign:'left', fontWeight:700 }}>Tên khách hàng</th>
                <th className="col-ht-giao" style={{ textAlign:'left', fontWeight:700 }}>HT giao</th>
                <th className="col-ngay-giao" style={{ textAlign:'left', fontWeight:700, whiteSpace:'nowrap' }}>Ngày giao</th>
                <th className="col-dia-chi" style={{ textAlign:'left', fontWeight:700 }}>Địa chỉ giao</th>
                <th style={{ textAlign:'right', fontWeight:700, whiteSpace:'nowrap' }}>Tổng tiền</th>
                <th className="col-coc" style={{ textAlign:'right', fontWeight:700 }}>Cọc</th>
                <th style={{ textAlign:'right', fontWeight:700, whiteSpace:'nowrap' }}>Còn lại</th>
                <th style={{ textAlign:'center', fontWeight:700 }}>Trạng thái</th>
                <th style={{ width:'64px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign:'center', padding:'48px', color:'var(--text-muted)' }}>
                    Không tìm thấy đơn hàng nào
                  </td>
                </tr>
              ) : filtered.map((don: any, i: number) => {
                const tt     = don['Trạng thái'] || 'Mới'
                const c      = badgeColor(tt)
                const conLai = Number(don['Còn phải thu'] || 0)
                const tenKH  = rutGonTen(don['Tên khách hàng'], don['Mã KH'])
                return (
                  <tr key={i} style={{ borderBottom:'1px solid #F0F0F0', background: i%2===0 ? 'white' : '#FAFBFD' }}>
                    <td>
                      <Link href={`/dashboard/don-hang/${don['Mã đơn hàng']}`}
                        style={{ color:'var(--primary)', fontWeight:700, textDecoration:'none', whiteSpace:'nowrap' }}>
                        {don['Mã đơn hàng']}
                      </Link>
                    </td>
                    <td style={{ color:'var(--text-secondary)', fontSize:'12px', whiteSpace:'nowrap' }}>
                      {formatDate(don['Ngày đặt'] || don['Ngày bán'])}
                    </td>
                    <td>
                      <div style={{ fontWeight:600, fontSize:'13px' }}>{tenKH}</div>
                      {don['Mã KH'] && (
                        <div style={{ fontSize:'11px', color:'var(--text-muted)' }}>{don['Mã KH']}</div>
                      )}
                    </td>
                    <td className="col-ht-giao">
                      {don['Hình thức giao hàng'] && (
                        <span style={{ fontSize:'11px', background:'var(--primary-pale)', color:'var(--primary)', padding:'2px 6px', borderRadius:'4px', fontWeight:600, whiteSpace:'nowrap' }}>
                          {don['Hình thức giao hàng'] === 'Giao hàng cho khách' ? '🚚' : '🏃'} {don['Hình thức giao hàng'] === 'Giao hàng cho khách' ? 'Giao tận nơi' : 'KH lấy'}
                        </span>
                      )}
                    </td>
                    <td className="col-ngay-giao" style={{ fontSize:'12px', whiteSpace:'nowrap', color:'var(--text-secondary)' }}>
                      {formatDate(don['Ngày hẹn giao'])}
                    </td>
                    <td className="col-dia-chi" style={{ fontSize:'12px', color:'var(--text-secondary)', maxWidth:'160px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {don['Địa chỉ giao'] || '—'}
                    </td>
                    <td style={{ fontWeight:700, textAlign:'right', whiteSpace:'nowrap' }}>
                      {formatVND(Number(don['Tổng tiền đơn']))}đ
                    </td>
                    <td className="col-coc" style={{ color:'var(--success)', fontWeight:600, textAlign:'right', whiteSpace:'nowrap' }}>
                      {formatVND(Number(don['Đặt cọc']))}đ
                    </td>
                    <td style={{ textAlign:'right', fontWeight:700, whiteSpace:'nowrap', color: conLai > 0 ? '#DC2626' : '#16A34A' }}>
                      {formatVND(conLai)}đ
                    </td>
                    <td style={{ textAlign:'center' }}>
                      <span style={{ padding:'3px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:700, background:c.bg, color:c.color, whiteSpace:'nowrap' }}>
                        {tt}
                      </span>
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:'2px' }}>
                        <Link href={`/dashboard/don-hang/${don['Mã đơn hàng']}`}
                          className="btn btn-ghost btn-sm" title="Chi tiết" style={{ padding:'4px 6px' }}>👁️</Link>
                        <Link href={`/dashboard/don-hang/${don['Mã đơn hàng']}/in`}
                          className="btn btn-ghost btn-sm" title="In" style={{ padding:'4px 6px' }}>🖨️</Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
