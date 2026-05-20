'use client'
// components/DonHangClient.tsx -- v2.1
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { UserSession } from '@/lib/auth'
import ExcelToolbar from '@/components/ExcelToolbar'

function formatVND(n: number) { return n?.toLocaleString('vi-VN') || '0' }
function formatDate(s: string) {
  if (!s) return '—'
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}
function badgeColor(tt: string) {
  const map: Record<string,{bg:string;color:string}> = {
    'Chờ giao':   { bg:'#FEF3C7', color:'#92400E' },
    'Đang giao':  { bg:'#DBEAFE', color:'#1E40AF' },
    'Hoàn thành': { bg:'#D1FAE5', color:'#065F46' },
    'Huỷ':        { bg:'#FEE2E2', color:'#991B1B' },
  }
  return map[tt] || { bg:'#F3F4F6', color:'#374151' }
}

const TRANG_THAI = ['Tất cả','Chờ giao','Đang giao','Hoàn thành','Huỷ']
const KENH       = ['Tất cả','Trực tiếp','Zalo','Facebook','Điện thoại','Online']

export default function DonHangClient({
  donHang, khachHangMap, user, searchParams,
}: {
  donHang: any[]
  khachHangMap: Record<string, any>   // Mã KH → object KH đầy đủ
  user: UserSession
  searchParams: any
}) {
  const router = useRouter()
  const [trangThai, setTrangThai] = useState(searchParams.trang_thai || 'Tất cả')
  const [kenh,      setKenh]      = useState(searchParams.kenh       || 'Tất cả')
  const [search,    setSearch]    = useState(searchParams.q          || '')

  // Lọc bỏ dòng rỗng
  const donHopLe = useMemo(() =>
    donHang.filter(d => d['Mã đơn hàng']?.toString().trim())
  , [donHang])

  // Hàm lấy tên KH — ưu tiên từ khachHangMap
  function getTenKH(don: any): string {
    const maKH  = don['Mã KH'] || ''
    const kh    = khachHangMap[maKH]
    const ten   = kh?.['Tên khách hàng'] || don['Tên khách hàng'] || maKH || '—'
    return ten.length > 24 ? ten.slice(0, 22) + '…' : ten
  }

  // Hàm lấy địa chỉ giao — ưu tiên:
  // 1. Địa chỉ giao trong đơn hàng (nếu khách yêu cầu giao địa chỉ khác)
  // 2. Địa chỉ từ bảng 1_Khách hàng (địa chỉ mặc định)
  function getDiaChiGiao(don: any): string {
    const diaChiTrongDon = don['Địa chỉ giao'] || ''
    if (diaChiTrongDon.trim()) return diaChiTrongDon

    const maKH   = don['Mã KH'] || ''
    const kh     = khachHangMap[maKH]
    const diaChi = kh?.['Địa chỉ'] || ''
    return diaChi || '—'
  }

  const filtered = useMemo(() => donHopLe.filter(d => {
    if (trangThai !== 'Tất cả' && d['Trạng thái'] !== trangThai) return false
    if (kenh      !== 'Tất cả' && d['Kênh bán']   !== kenh)      return false
    if (search) {
      const q   = search.toLowerCase()
      const ten = (khachHangMap[d['Mã KH']]?.['Tên khách hàng'] || d['Tên khách hàng'] || '').toLowerCase()
      return (
        (d['Mã đơn hàng'] || '').toLowerCase().includes(q) ||
        ten.includes(q) ||
        (d['Mã KH'] || '').toLowerCase().includes(q)
      )
    }
    return true
  }), [donHopLe, trangThai, kenh, search, khachHangMap])

  const tongTien = filtered.reduce((s: number, d: any) => s + (Number(d['Tổng tiền đơn']) || 0), 0)

  async function handleNhap(rows: Record<string,string>[]) {
    const res = await fetch('/api/import/don-hang', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Lỗi nhập')
    router.refresh()
  }

  return (
    <div style={{ padding:'20px' }}>
      <style>{`
        .dh-hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:12px;flex-wrap:wrap;}
        .btn-tao{background:var(--primary);color:white;border:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;white-space:nowrap;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;}
        .btn-tao:hover{opacity:.9;}
        .dh-t th,.dh-t td{padding:8px 10px;}
        .dh-t tbody tr:hover td{background:#F0F4FF!important;}
        @media(max-width:1100px){.col-dia{display:none;}}
        @media(max-width:800px){.col-ngay,.col-coc{display:none;}}
      `}</style>

      {/* Header */}
      <div className="dh-hdr">
        <div>
          <h1 style={{ fontFamily:'Playfair Display,serif', fontSize:'20px', fontWeight:700, margin:0 }}>📋 Đơn hàng</h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'13px', margin:'2px 0 8px' }}>
            {filtered.length} đơn &nbsp;•&nbsp; Tổng: {formatVND(tongTien)}đ
          </p>
          <ExcelToolbar
            loai="DON_HANG"
            danhSach={filtered}
            tenFile="don-hang"
            layGiaTri={d => [
              d['Mã đơn hàng'] || '',
              d['Ngày bán'] || d['Ngày đặt'] || '',
              d['Mã KH'] || '',
              khachHangMap[d['Mã KH']]?.['Tên khách hàng'] || d['Tên khách hàng'] || '',
              d['Kênh bán'] || '',
              d['Hình thức giao hàng'] || '',
              d['Ngày hẹn giao'] || '',
              getDiaChiGiao(d),
              Number(d['Tổng tiền đơn']) || 0,
              Number(d['Đặt cọc']) || 0,
              d['Hình thức cọc'] || '',
              Number(d['Còn phải thu']) || 0,
              d['Trạng thái'] || '',
              d['Nhân viên bán'] || '',
              d['Xuất hóa đơn'] || 'Không',
              d['Ghi chú'] || '',
            ]}
            onNhap={handleNhap}
          />
        </div>
        <Link href="/dashboard/don-hang/tao" className="btn-tao">➕ Tạo đơn mới</Link>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding:'12px 14px', marginBottom:'14px' }}>
        <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center' }}>
          <input className="input" placeholder="🔍 Tìm mã đơn, tên KH..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex:'1', minWidth:'160px', maxWidth:'260px' }} />
          <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
            {TRANG_THAI.map(tt => {
              const c  = tt !== 'Tất cả' ? badgeColor(tt) : null
              const isA = trangThai === tt
              return (
                <button key={tt} onClick={() => setTrangThai(tt)} style={{
                  padding:'5px 11px', borderRadius:'20px', border:'1px solid',
                  borderColor: isA ? (c?.color || 'var(--primary)') : 'var(--border)',
                  background:  isA ? (c?.bg    || 'var(--primary-pale)') : 'white',
                  color:       isA ? (c?.color || 'var(--primary)') : 'var(--text-secondary)',
                  fontWeight:  isA ? 700 : 400, fontSize:'12px', cursor:'pointer', whiteSpace:'nowrap',
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

      {/* Bảng đơn hàng */}
      <div className="card">
        <div style={{ overflowX:'auto' }}>
          <table className="dh-t" style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
            <thead>
              <tr style={{ background:'#F0F4FF', borderBottom:'2px solid var(--border)' }}>
                <th style={{ textAlign:'left', fontWeight:700, whiteSpace:'nowrap' }}>Mã đơn</th>
                <th style={{ textAlign:'left', fontWeight:700, whiteSpace:'nowrap' }}>Ngày đặt</th>
                <th style={{ textAlign:'left', fontWeight:700 }}>Tên khách hàng</th>
                <th className="col-ngay" style={{ textAlign:'left', fontWeight:700, whiteSpace:'nowrap' }}>Ngày giao</th>
                {/* Địa chỉ lấy từ bảng 1_Khách hàng qua khachHangMap */}
                <th className="col-dia" style={{ textAlign:'left', fontWeight:700 }}>Địa chỉ</th>
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
                  <td colSpan={10} style={{ textAlign:'center', padding:'48px', color:'var(--text-muted)' }}>
                    Không tìm thấy đơn hàng nào
                  </td>
                </tr>
              ) : filtered.map((don: any, i: number) => {
                const tt      = don['Trạng thái'] || 'Mới'
                const c       = badgeColor(tt)
                const conLai  = Number(don['Còn phải thu'] || 0)
                const tenKH   = getTenKH(don)
                const diaChi  = getDiaChiGiao(don)
                const maKH    = don['Mã KH'] || ''
                return (
                  <tr key={i} style={{ borderBottom:'1px solid #F0F0F0', background:i%2===0?'white':'#FAFBFD' }}>
                    <td>
                      <Link href={`/dashboard/don-hang/${don['Mã đơn hàng']}`}
                        style={{ color:'var(--primary)', fontWeight:700, textDecoration:'none', whiteSpace:'nowrap' }}>
                        {don['Mã đơn hàng']}
                      </Link>
                    </td>
                    <td style={{ fontSize:'12px', color:'var(--text-secondary)', whiteSpace:'nowrap' }}>
                      {formatDate(don['Ngày đặt'] || don['Ngày bán'])}
                    </td>
                    <td>
                      <div style={{ fontWeight:600 }}>{tenKH}</div>
                      {maKH && <div style={{ fontSize:'11px', color:'var(--text-muted)' }}>{maKH}</div>}
                    </td>
                    <td className="col-ngay" style={{ fontSize:'12px', color:'var(--text-secondary)', whiteSpace:'nowrap' }}>
                      {formatDate(don['Ngày hẹn giao'])}
                    </td>
                    {/* Địa chỉ: lấy từ khachHangMap[Mã KH] → Địa chỉ */}
                    <td className="col-dia" style={{
                      fontSize:'12px', color:'var(--text-secondary)',
                      maxWidth:'180px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                    }} title={diaChi}>
                      {diaChi}
                    </td>
                    <td style={{ fontWeight:700, textAlign:'right', whiteSpace:'nowrap' }}>
                      {formatVND(Number(don['Tổng tiền đơn']))}đ
                    </td>
                    <td className="col-coc" style={{ color:'var(--success)', fontWeight:600, textAlign:'right', whiteSpace:'nowrap' }}>
                      {formatVND(Number(don['Đặt cọc']))}đ
                    </td>
                    <td style={{ textAlign:'right', fontWeight:700, whiteSpace:'nowrap', color:conLai > 0 ? '#DC2626' : '#16A34A' }}>
                      {formatVND(conLai)}đ
                    </td>
                    <td style={{ textAlign:'center' }}>
                      <span style={{
                        padding:'3px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:700,
                        background:c.bg, color:c.color, whiteSpace:'nowrap',
                      }}>
                        {tt}
                      </span>
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:'2px' }}>
                        <Link href={`/dashboard/don-hang/${don['Mã đơn hàng']}`}
                          className="btn btn-ghost btn-sm" style={{ padding:'4px 6px' }}>👁️</Link>
                        <Link href={`/dashboard/don-hang/${don['Mã đơn hàng']}/in`}
                          className="btn btn-ghost btn-sm" style={{ padding:'4px 6px' }}>🖨️</Link>
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
