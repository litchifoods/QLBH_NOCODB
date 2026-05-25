'use client'
// components/DonHangClient.tsx — v3.0
// Thêm phân trang 10 đơn/trang

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
    'Chờ giao':        { bg:'#FEF3C7', color:'#92400E' },
    'Đang giao':       { bg:'#DBEAFE', color:'#1E40AF' },
    'Đang giao 1 phần':{ bg:'#E0F2FE', color:'#0369A1' },
    'Đã giao':         { bg:'#D1FAE5', color:'#065F46' },
    'Đã giao 1 phần':  { bg:'#ECFDF5', color:'#059669' },
    'Hoàn thành':      { bg:'#D1FAE5', color:'#065F46' },
    'Huỷ':             { bg:'#FEE2E2', color:'#991B1B' },
  }
  return map[tt] || { bg:'#F3F4F6', color:'#374151' }
}

const TRANG_THAI = ['Tất cả','Chờ giao','Đang giao 1 phần','Đang giao','Đã giao 1 phần','Đã giao','Hoàn thành','Huỷ']
const KENH       = ['Tất cả','Trực tiếp','Zalo','Facebook','Điện thoại','Online']
const SO_TRANG   = 10

export default function DonHangClient({
  donHang, khachHangMap, trangThaiMap, user, searchParams,
}: {
  donHang: any[]
  khachHangMap: Record<string, any>
  trangThaiMap: Record<string, string>  // maDon → trạng thái tính toán
  user: UserSession
  searchParams: any
}) {
  const router = useRouter()
  const [trangThai, setTrangThai] = useState(searchParams.trang_thai || 'Tất cả')
  const [kenh,      setKenh]      = useState(searchParams.kenh       || 'Tất cả')
  const [search,    setSearch]    = useState(searchParams.q          || '')
  const [trang,     setTrang]     = useState(1)

  const donHopLe = useMemo(() =>
    donHang.filter(d => d['Mã đơn hàng']?.toString().trim())
  , [donHang])

  function getTenKH(don: any): string {
    const maKH = don['Mã KH'] || ''
    const kh   = khachHangMap[maKH]
    const ten  = kh?.['Tên khách hàng'] || don['Tên khách hàng'] || maKH || '—'
    return ten.length > 24 ? ten.slice(0, 22) + '…' : ten
  }

  function getDiaChiGiao(don: any): string {
    const diaChiTrongDon = don['Địa chỉ giao'] || ''
    if (diaChiTrongDon.trim()) return diaChiTrongDon
    const maKH   = don['Mã KH'] || ''
    const kh     = khachHangMap[maKH]
    return kh?.['Địa chỉ'] || '—'
  }

  const filtered = useMemo(() => {
    setTrang(1)
    return donHopLe.filter(d => {
      const ttTinh = trangThaiMap[d['Mã đơn hàng']] || d['Trạng thái'] || ''
      if (trangThai !== 'Tất cả' && ttTinh !== trangThai) return false
      if (kenh      !== 'Tất cả' && d['Kênh bán']   !== kenh)      return false
      if (search) {
        const q      = search.toLowerCase().trim()
        const kh     = khachHangMap[d['Mã KH']] || {}
        const ten    = (kh['Tên khách hàng'] || d['Tên khách hàng'] || '').toLowerCase()
        const sdt    = (kh['Số điện thoại'] || '').replace(/\D/g, '')
        const diaChi = (kh['Địa chỉ'] || d['Địa chỉ giao'] || '').toLowerCase()
        const qSo    = q.replace(/\D/g, '')
        return (
          (d['Mã đơn hàng'] || '').toLowerCase().includes(q) ||
          ten.includes(q) ||
          (d['Mã KH'] || '').toLowerCase().includes(q) ||
          (qSo.length >= 4 && sdt.includes(qSo)) ||
          diaChi.includes(q)
        )
      }
      return true
    })
  }, [donHopLe, trangThai, kenh, search, khachHangMap])

  // Phân trang
  const tongTrang      = Math.max(1, Math.ceil(filtered.length / SO_TRANG))
  const trangHienTai   = Math.min(trang, tongTrang)
  const danhSachTrang  = filtered.slice((trangHienTai-1)*SO_TRANG, trangHienTai*SO_TRANG)
  const tongTien       = filtered.reduce((s: number, d: any) => s + (Number(d['Tổng tiền đơn']) || 0), 0)

  async function handleNhap(rows: Record<string,string>[]) {
    const res = await fetch('/api/import/don-hang', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Lỗi nhập')
    router.refresh()
  }

  function PhanTrang() {
    if (tongTrang <= 1) return null
    const pages = Array.from({length: tongTrang}, (_,i) => i+1)
    let hienThi: number[]
    if (tongTrang <= 7) {
      hienThi = pages
    } else if (trangHienTai <= 4) {
      hienThi = [...pages.slice(0,5), -1, tongTrang]
    } else if (trangHienTai >= tongTrang - 3) {
      hienThi = [1, -1, ...pages.slice(tongTrang-5)]
    } else {
      hienThi = [1, -1, trangHienTai-1, trangHienTai, trangHienTai+1, -2, tongTrang]
    }
    return (
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderTop:'1px solid #F0F0F0',flexWrap:'wrap',gap:'8px'}}>
        <div style={{fontSize:'12px',color:'var(--text-secondary)'}}>
          Hiển thị {(trangHienTai-1)*SO_TRANG+1}–{Math.min(trangHienTai*SO_TRANG, filtered.length)} / {filtered.length} đơn hàng
        </div>
        <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
          <button onClick={()=>setTrang(t=>Math.max(1,t-1))} disabled={trangHienTai===1}
            style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid var(--border)',background:trangHienTai===1?'#F9FAFB':'white',color:trangHienTai===1?'#CCC':'var(--primary)',cursor:trangHienTai===1?'not-allowed':'pointer',fontSize:'13px',fontWeight:600}}>‹</button>
          {hienThi.map((p,idx) =>
            p < 0 ? (
              <span key={`dot${idx}`} style={{padding:'4px 2px',color:'#9CA3AF',fontSize:'13px'}}>…</span>
            ) : (
              <button key={p} onClick={()=>setTrang(p)}
                style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid',borderColor:p===trangHienTai?'var(--primary)':'var(--border)',background:p===trangHienTai?'var(--primary)':'white',color:p===trangHienTai?'white':'var(--text-secondary)',cursor:'pointer',fontSize:'13px',fontWeight:p===trangHienTai?700:400,minWidth:'32px'}}>
                {p}
              </button>
            )
          )}
          <button onClick={()=>setTrang(t=>Math.min(tongTrang,t+1))} disabled={trangHienTai===tongTrang}
            style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid var(--border)',background:trangHienTai===tongTrang?'#F9FAFB':'white',color:trangHienTai===tongTrang?'#CCC':'var(--primary)',cursor:trangHienTai===tongTrang?'not-allowed':'pointer',fontSize:'13px',fontWeight:600}}>›</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding:'20px' }}>
      <style>{`
        .dh-hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:12px;flex-wrap:wrap;}
        .btn-tao{background:var(--primary);color:white;border:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;white-space:nowrap;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;}
        .btn-tao:hover{opacity:.9;}
        .dh-t th,.dh-t td{padding:8px 10px;}
        .dh-t tbody tr:hover td{background:#F0F4FF!important;}
        .tt-wrap .tt-label{display:none;position:absolute;bottom:calc(100% + 4px);left:50%;transform:translateX(-50%);background:#1F2937;color:white;font-size:11px;padding:3px 8px;border-radius:4px;white-space:nowrap;pointer-events:none;z-index:20;}
        .tt-wrap:hover .tt-label{display:block;}
        .tt-wrap:hover::after{content:'';position:absolute;bottom:calc(100% + 1px);left:50%;transform:translateX(-50%);border:4px solid transparent;border-top-color:#1F2937;pointer-events:none;z-index:20;}
        @media(max-width:1100px){.col-dia{display:none;}}
        @media(max-width:800px){.col-ngay,.col-coc{display:none;}}
      `}</style>

      <div className="dh-hdr">
        <div>
          <h1 style={{ fontFamily:'Playfair Display,serif', fontSize:'20px', fontWeight:700, margin:0 }}>📋 Đơn hàng</h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'13px', margin:'2px 0 8px' }}>
            {filtered.length} đơn &nbsp;•&nbsp; Tổng: {formatVND(tongTien)}đ
          </p>
          <ExcelToolbar loai="DON_HANG" danhSach={filtered} tenFile="don-hang"
            layGiaTri={d=>[
              d['Mã đơn hàng']||'', d['Ngày bán']||d['Ngày đặt']||'',
              d['Mã KH']||'', khachHangMap[d['Mã KH']]?.['Tên khách hàng']||d['Tên khách hàng']||'',
              d['Kênh bán']||'', d['Hình thức giao hàng']||'', d['Ngày hẹn giao']||'',
              getDiaChiGiao(d), Number(d['Tổng tiền đơn'])||0, Number(d['Đặt cọc'])||0,
              d['Hình thức cọc']||'', Number(d['Còn phải thu'])||0,
              d['Trạng thái']||'', d['Nhân viên bán']||'', d['Xuất hóa đơn']||'Không', d['Ghi chú']||'',
            ]}
            onNhap={handleNhap}/>
        </div>
        <Link href="/dashboard/don-hang/tao" className="btn-tao">➕ Tạo đơn mới</Link>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding:'12px 14px', marginBottom:'14px' }}>
        <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center' }}>
          <input className="input" placeholder="🔍 Tìm mã đơn, tên KH, SĐT, địa chỉ..."
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

      {/* Bảng */}
      <div className="card" style={{overflow:'hidden'}}>
        <div style={{ overflowX:'auto' }}>
          <table className="dh-t" style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
            <thead>
              <tr style={{ background:'#F0F4FF', borderBottom:'2px solid var(--border)' }}>
                <th style={{ textAlign:'left', fontWeight:700, whiteSpace:'nowrap' }}>Mã đơn</th>
                <th style={{ textAlign:'left', fontWeight:700, whiteSpace:'nowrap' }}>Ngày đặt</th>
                <th style={{ textAlign:'left', fontWeight:700 }}>Tên khách hàng</th>
                <th className="col-ngay" style={{ textAlign:'left', fontWeight:700, whiteSpace:'nowrap' }}>Ngày giao</th>
                <th className="col-dia" style={{ textAlign:'left', fontWeight:700 }}>Địa chỉ</th>
                <th style={{ textAlign:'right', fontWeight:700, whiteSpace:'nowrap' }}>Tổng tiền</th>
                <th className="col-coc" style={{ textAlign:'right', fontWeight:700 }}>Cọc</th>
                <th style={{ textAlign:'right', fontWeight:700, whiteSpace:'nowrap' }}>Còn lại</th>
                <th style={{ textAlign:'center', fontWeight:700 }}>Trạng thái</th>
                <th style={{ width:'64px' }}></th>
              </tr>
            </thead>
            <tbody>
              {danhSachTrang.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign:'center', padding:'48px', color:'var(--text-muted)' }}>
                    Không tìm thấy đơn hàng nào
                  </td>
                </tr>
              ) : danhSachTrang.map((don: any, i: number) => {
                const tt     = trangThaiMap[don['Mã đơn hàng']] || don['Trạng thái'] || 'Mới'
                const c      = badgeColor(tt)
                const conLai = Number(don['Còn phải thu'] || 0)
                const tenKH  = getTenKH(don)
                const diaChi = getDiaChiGiao(don)
                const maKH   = don['Mã KH'] || ''
                return (
                  <tr key={don['Mã đơn hàng']||i} style={{ borderBottom:'1px solid #F0F0F0', background:i%2===0?'white':'#FAFBFD' }}>
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
                      {khachHangMap[maKH]?.['Số điện thoại']
                        ? <div style={{ fontSize:'11px', color:'var(--text-muted)' }}>📞 {khachHangMap[maKH]['Số điện thoại']}</div>
                        : maKH ? <div style={{ fontSize:'11px', color:'var(--text-muted)' }}>{maKH}</div> : null
                      }
                    </td>
                    <td className="col-ngay" style={{ fontSize:'12px', color:'var(--text-secondary)', whiteSpace:'nowrap' }}>
                      {formatDate(don['Ngày hẹn giao'])}
                    </td>
                    <td className="col-dia" style={{
                      fontSize:'12px', color:'var(--text-secondary)',
                      maxWidth:'180px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                    }} title={diaChi}>{diaChi}</td>
                    <td style={{ fontWeight:700, textAlign:'right', whiteSpace:'nowrap' }}>
                      {formatVND(Number(don['Tổng tiền đơn']))}đ
                    </td>
                    <td className="col-coc" style={{ color:'var(--success)', fontWeight:600, textAlign:'right', whiteSpace:'nowrap' }}>
                      {formatVND(Number(don['Đặt cọc']))}đ
                    </td>
                    <td style={{ textAlign:'right', fontWeight:700, whiteSpace:'nowrap' }}>
                      {tt==='Huỷ' && Number(don['Tiền hoàn cọc']||0)>0 ? (
                        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'2px'}}>
                          <span style={{color:'#6B7280',textDecoration:'line-through',fontSize:'11px'}}>{formatVND(conLai)}đ</span>
                          <span style={{
                            fontSize:'11px',fontWeight:700,padding:'2px 7px',borderRadius:'10px',
                            background:don['Tình trạng hoàn cọc']==='Đã hoàn'?'#D1FAE5':'#FEF3C7',
                            color:don['Tình trạng hoàn cọc']==='Đã hoàn'?'#065F46':'#D97706',
                          }}>
                            {don['Tình trạng hoàn cọc']==='Đã hoàn'?'✅':'⚠️'} Hoàn {formatVND(Number(don['Tiền hoàn cọc']))}đ
                          </span>
                        </div>
                      ) : (
                        <span style={{color:conLai > 0 ? '#DC2626' : '#16A34A'}}>{formatVND(conLai)}đ</span>
                      )}
                    </td>
                    <td style={{ textAlign:'center' }}>
                      <span style={{ padding:'3px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:700, background:c.bg, color:c.color, whiteSpace:'nowrap' }}>
                        {tt}
                      </span>
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:'2px' }}>
                        <span style={{position:'relative',display:'inline-block'}} className="tt-wrap">
                          <Link href={`/dashboard/don-hang/${don['Mã đơn hàng']}`}
                            className="btn btn-ghost btn-sm" style={{ padding:'4px 8px' }} title="Xem chi tiết">👁️</Link>
                          <span className="tt-label">Xem chi tiết</span>
                        </span>
                        <span style={{position:'relative',display:'inline-block'}} className="tt-wrap">
                          <Link href={`/dashboard/don-hang/${don['Mã đơn hàng']}/in`}
                            className="btn btn-ghost btn-sm" style={{ padding:'4px 8px' }} title="In hóa đơn">🖨️</Link>
                          <span className="tt-label">In hóa đơn</span>
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <PhanTrang/>
      </div>
    </div>
  )
}
