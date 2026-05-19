'use client'
// components/GiaoHangClient.tsx
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserSession } from '@/lib/auth'

function fVND(n: any) { return Number(n||0).toLocaleString('vi-VN')+'đ' }
function fDT(s: string) {
  if (!s) return '—'
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
function boDau(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()
}

interface Nguoi {
  id: string
  hinhThuc: 'NV cửa hàng' | 'Đối tác'
  maNV: string
  tenNV: string
  vaiTro: 'Vận chuyển' | 'Lắp đặt' | 'Vận chuyển+Lắp'
  chiPhiVC: number
  chiPhiLap: number
  thuongChuyen: number
  ghiChu: string
  showSearch: boolean
  searchText: string
}

interface SPGiao {
  maChiTiet: string
  tenSP: string
  soLuongDon: number
  soLuongGiao: number
  daDuocGiao: number
  ghiChu: string
  checked: boolean
}

export default function GiaoHangClient({
  giaoHangList, chuyenGiaoMap, chiTietGiaoMap, chiTietDonMap,
  donChuaGiao, donHangMap, nhanVien, khachHangMap, user,
}: {
  giaoHangList: any[]
  chuyenGiaoMap: Record<string, any[]>
  chiTietGiaoMap: Record<string, any[]>
  chiTietDonMap: Record<string, any[]>
  donChuaGiao: any[]
  donHangMap: Record<string, any>
  nhanVien: any[]
  khachHangMap: Record<string, any>
  user: UserSession
}) {
  const router = useRouter()
  const [tab, setTab]         = useState<'chuyen'|'nguoi'>('chuyen')
  const [filterDS, setFilterDS] = useState('Tất cả')
  const [showForm, setShowForm] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [msg,      setMsg]      = useState('')
  const [msgOk,    setMsgOk]    = useState(true)

  // ── Form tạo chuyến ─────────────────────────────────────
  const [searchDon,  setSearchDon]  = useState('')
  const [donChon,    setDonChon]    = useState<any>(null)
  const [showDon,    setShowDon]    = useState(false)
  const [dotGiao,    setDotGiao]    = useState(1)
  const [ngayGiao,   setNgayGiao]   = useState(new Date().toISOString().slice(0,16))
  const [danhSachNguoi, setDanhSachNguoi] = useState<Nguoi[]>([
    { id:'1', hinhThuc:'NV cửa hàng', maNV:'', tenNV:'', vaiTro:'Vận chuyển+Lắp', chiPhiVC:0, chiPhiLap:0, thuongChuyen:0, ghiChu:'', showSearch:false, searchText:'' }
  ])
  const [danhSachSP, setDanhSachSP] = useState<SPGiao[]>([])

  // Helpers
  function getTenKH(maKH: string, tenTuDon?: string) {
    return khachHangMap[maKH]?.['Tên khách hàng'] || tenTuDon || maKH || '—'
  }
  function getDiaChi(don: any) {
    return don?.['Địa chỉ giao'] || khachHangMap[don?.['Mã KH']]?.['Địa chỉ'] || '—'
  }

  // Tính đợt giao tiếp theo cho đơn
  function getDotGiaoTiepTheo(maDon: string) {
    const nguoiCuaDon = giaoHangList.filter(g => g['Mã đơn hàng'] === maDon)
    if (nguoiCuaDon.length === 0) return 1
    const maxDot = Math.max(...nguoiCuaDon.map(g => Number(g['Đợt giao']||0)))
    return maxDot + 1
  }

  // Khi chọn đơn hàng
  function chonDon(don: any) {
    setDonChon(don)
    setSearchDon(don['Mã đơn hàng'])
    setShowDon(false)
    const dot = getDotGiaoTiepTheo(don['Mã đơn hàng'])
    setDotGiao(dot)

    // Load sản phẩm chưa giao đủ
    const chiTiet = chiTietDonMap[don['Mã đơn hàng']] || []
    // Tính đã giao bao nhiêu mỗi sản phẩm
    const daDuocGiaoMap: Record<string, number> = {}
    for (const [, ctList] of Object.entries(chiTietGiaoMap)) {
      for (const ct of ctList) {
        if (ct['Mã đơn hàng'] === don['Mã đơn hàng']) {
          const key = ct['Mã chi tiết đơn'] || ct['Tên SP (ghi nhanh)']
          daDuocGiaoMap[key] = (daDuocGiaoMap[key]||0) + Number(ct['Số lượng giao đợt này']||0)
        }
      }
    }

    const spList: SPGiao[] = chiTiet.map((ct: any) => {
      const key = ct['Mã chi tiết'] || ct['Tên SP (ghi nhanh)']
      const daDuoc = daDuocGiaoMap[key] || 0
      const conLai = Math.max(0, Number(ct['Số lượng']||1) - daDuoc)
      return {
        maChiTiet: ct['Mã chi tiết'] || '',
        tenSP: ct['Tên SP (ghi nhanh)'] || ct['Mã SP'] || '',
        soLuongDon: Number(ct['Số lượng']||1),
        soLuongGiao: conLai,
        daDuocGiao: daDuoc,
        ghiChu: '',
        checked: conLai > 0,
      }
    })
    setDanhSachSP(spList)
  }

  // Lọc đơn hàng để chọn
  const donLoc = useMemo(() => {
    if (!searchDon.trim()) return donChuaGiao.slice(0,10)
    const q = boDau(searchDon)
    return donChuaGiao.filter(d =>
      boDau(d['Mã đơn hàng']||'').includes(q) ||
      boDau(getTenKH(d['Mã KH'],d['Tên khách hàng'])).includes(q)
    ).slice(0,10)
  }, [searchDon, donChuaGiao])

  // Lọc NV cho dropdown người
  function getNVLoc(searchText: string) {
    if (!searchText.trim()) return nhanVien.slice(0,8)
    const q = boDau(searchText)
    return nhanVien.filter((nv:any) =>
      boDau(nv['Họ tên']||'').includes(q) || boDau(nv['Mã NV']||'').includes(q) || boDau(nv['Vai trò']||'').includes(q)
    ).slice(0,8)
  }

  // Thêm/xóa người
  function themNguoi() {
    setDanhSachNguoi(prev => [...prev, {
      id: Date.now().toString(), hinhThuc:'NV cửa hàng', maNV:'', tenNV:'',
      vaiTro:'Vận chuyển', chiPhiVC:0, chiPhiLap:0, thuongChuyen:0, ghiChu:'',
      showSearch:false, searchText:'',
    }])
  }
  function xoaNguoi(id: string) {
    setDanhSachNguoi(prev => prev.filter(n => n.id !== id))
  }
  function updNguoi(id: string, field: keyof Nguoi, val: any) {
    setDanhSachNguoi(prev => prev.map(n => n.id===id ? {...n,[field]:val} : n))
  }
  function chonNV(nguoiId: string, nv: any) {
    setDanhSachNguoi(prev => prev.map(n => n.id===nguoiId ? {
      ...n, maNV:nv['Mã NV']||'', tenNV:nv['Họ tên']||'',
      searchText:nv['Họ tên']||'', showSearch:false,
    } : n))
  }

  // SP giao
  function updSP(idx: number, field: keyof SPGiao, val: any) {
    setDanhSachSP(prev => prev.map((sp,i) => i===idx ? {...sp,[field]:val} : sp))
  }

  function resetForm() {
    setSearchDon(''); setDonChon(null); setDotGiao(1)
    setNgayGiao(new Date().toISOString().slice(0,16))
    setDanhSachNguoi([{id:'1',hinhThuc:'NV cửa hàng',maNV:'',tenNV:'',vaiTro:'Vận chuyển+Lắp',chiPhiVC:0,chiPhiLap:0,thuongChuyen:0,ghiChu:'',showSearch:false,searchText:''}])
    setDanhSachSP([])
  }

  async function luuChuyen() {
    if (!donChon) { setMsg('Vui lòng chọn đơn hàng'); setMsgOk(false); return }
    if (danhSachNguoi.every(n => !n.tenNV.trim())) { setMsg('Vui lòng thêm ít nhất 1 người giao'); setMsgOk(false); return }
    const spGiao = danhSachSP.filter(sp => sp.checked && sp.soLuongGiao > 0)

    setLoading(true); setMsg('')
    try {
      const res = await fetch('/api/giao-hang', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          maDon:     donChon['Mã đơn hàng'],
          dotGiao,
          ngayGiao,
          danhSachNguoi: danhSachNguoi.filter(n => n.tenNV.trim()).map(n => ({
            hinhThuc:      n.hinhThuc,
            maNV:          n.maNV,
            tenNV:         n.tenNV,
            vaiTro:        n.vaiTro,
            chiPhiVC:      n.chiPhiVC,
            chiPhiLap:     n.chiPhiLap,
            thuongChuyen:  n.thuongChuyen,
            ghiChu:        n.ghiChu,
          })),
          danhSachSP: spGiao.map(sp => ({
            maChiTiet:   sp.maChiTiet,
            tenSP:       sp.tenSP,
            soLuongDon:  sp.soLuongDon,
            soLuongGiao: sp.soLuongGiao,
            ghiChu:      sp.ghiChu,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message||'Lỗi')
      setMsg(`✅ Đã tạo chuyến giao ${data.maChuyen} với ${data.soNguoi} người`)
      setMsgOk(true); resetForm(); setShowForm(false); router.refresh()
    } catch (err: any) {
      setMsg('❌ '+(err.message||'Lỗi')); setMsgOk(false)
    } finally {
      setLoading(false); setTimeout(()=>setMsg(''),5000)
    }
  }

  // ── Danh sách hiển thị ──────────────────────────────────
  // Group theo mã chuyến
  const danhSachChuyen = useMemo(() => {
    const chuyenList: {
      maChuyen: string; maDon: string; dotGiao: number; ngayGiao: string
      nguoiList: any[]; donInfo: any; tenKH: string; diaChi: string
    }[] = []
    const seen = new Set<string>()

    for (const gh of giaoHangList) {
      const maChuyen = gh['Mã chuyến'] || gh['Mã giao hàng']
      if (seen.has(maChuyen)) continue
      seen.add(maChuyen)
      const maDon = gh['Mã đơn hàng'] || ''
      const don = donHangMap[maDon]
      const maKH = don?.['Mã KH'] || ''
      chuyenList.push({
        maChuyen,
        maDon,
        dotGiao: Number(gh['Đợt giao']||1),
        ngayGiao: gh['Ngày giao']||'',
        nguoiList: chuyenGiaoMap[maChuyen] || [gh],
        donInfo: don,
        tenKH: getTenKH(maKH, don?.['Tên khách hàng']),
        diaChi: don?.['Địa chỉ giao'] || khachHangMap[maKH]?.['Địa chỉ'] || '—',
      })
    }
    // Sắp xếp mới nhất trên
    return chuyenList.sort((a,b) => new Date(b.ngayGiao).getTime() - new Date(a.ngayGiao).getTime())
  }, [giaoHangList, chuyenGiaoMap, donHangMap, khachHangMap])

  const chuyenFiltered = useMemo(() => {
    if (filterDS === 'Tất cả') return danhSachChuyen
    if (filterDS === 'Chưa đối soát') return danhSachChuyen.filter(c =>
      c.nguoiList.some(n => n['Tình trạng đối soát'] !== 'Đã đối soát')
    )
    return danhSachChuyen.filter(c =>
      c.nguoiList.every(n => n['Tình trạng đối soát'] === 'Đã đối soát')
    )
  }, [danhSachChuyen, filterDS])

  const tongChuaDS = danhSachChuyen.filter(c =>
    c.nguoiList.some(n => n['Tình trạng đối soát'] !== 'Đã đối soát')
  ).length

  const VAI_TRO = ['Vận chuyển','Lắp đặt','Vận chuyển+Lắp']

  return (
    <div style={{padding:'20px'}}>
      <style>{`
        .gh-hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:12px;flex-wrap:wrap;}
        .btn-gh{background:var(--primary);color:white;border:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;white-space:nowrap;cursor:pointer;display:inline-flex;align-items:center;gap:6px;}
        .btn-gh:hover{opacity:.9;}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto;}
        .modal{background:white;border-radius:12px;padding:24px;width:100%;max-width:720px;margin:auto;}
        .drop-box{position:absolute;top:calc(100% + 3px);left:0;right:0;z-index:70;background:white;border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);max-height:220px;overflow-y:auto;}
        .drop-item{padding:8px 12px;cursor:pointer;border-bottom:1px solid #F3F4F6;font-size:13px;}
        .drop-item:hover{background:#F0F9FF;}
        .nguoi-card{border:1px solid var(--border);border-radius:10px;padding:14px;background:#FAFBFD;margin-bottom:10px;}
        .sp-row{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;border:1px solid #E5E7EB;margin-bottom:6px;background:white;}
        .tag-vai-tro{padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;}
        .chuyen-card{border:1px solid var(--border);border-radius:10px;padding:14px 16px;background:white;margin-bottom:10px;cursor:pointer;transition:box-shadow .15s;}
        .chuyen-card:hover{box-shadow:0 2px 12px rgba(0,0,0,.08);}
        @media(max-width:700px){.col-dia{display:none;}}
      `}</style>

      {/* Header */}
      <div className="gh-hdr">
        <div>
          <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>🚚 Giao hàng</h1>
          <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'2px 0 0'}}>
            {danhSachChuyen.length} chuyến
            {tongChuaDS>0&&<span style={{marginLeft:'8px',color:'#DC2626',fontWeight:600}}>⚠️ {tongChuaDS} chuyến chưa đối soát</span>}
          </p>
        </div>
        <button className="btn-gh" onClick={()=>setShowForm(true)}>🚚 Tạo chuyến giao</button>
      </div>

      {msg&&<div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'14px',fontSize:'13px',background:msgOk?'#D1FAE5':'#FEE2E2',color:msgOk?'#065F46':'#991B1B'}}>{msg}</div>}

      {/* Filter */}
      <div className="card" style={{padding:'12px 14px',marginBottom:'14px'}}>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
          {['Tất cả','Chưa đối soát','Đã đối soát'].map(f=>(
            <button key={f} onClick={()=>setFilterDS(f)} style={{
              padding:'5px 14px',borderRadius:'20px',border:'1px solid',
              borderColor:filterDS===f?'var(--primary)':'var(--border)',
              background:filterDS===f?'var(--primary-pale)':'white',
              color:filterDS===f?'var(--primary)':'var(--text-secondary)',
              fontWeight:filterDS===f?700:400,fontSize:'12px',cursor:'pointer',
            }}>{f}</button>
          ))}
          <span style={{marginLeft:'auto',fontSize:'12px',color:'var(--text-secondary)',alignSelf:'center'}}>{chuyenFiltered.length} chuyến</span>
        </div>
      </div>

      {/* Danh sách chuyến */}
      {chuyenFiltered.length===0?(
        <div className="card" style={{padding:'48px',textAlign:'center',color:'var(--text-muted)'}}>Chưa có chuyến giao nào</div>
      ):chuyenFiltered.map(chuyen=>{
        const tatCaDS = chuyen.nguoiList.every(n=>n['Tình trạng đối soát']==='Đã đối soát')
        const motPhanDS = chuyen.nguoiList.some(n=>n['Tình trạng đối soát']==='Đã đối soát')
        const spChuyen = chiTietGiaoMap[chuyen.maChuyen] || []

        return(
          <div key={chuyen.maChuyen} className="chuyen-card">
            {/* Header chuyến */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px',flexWrap:'wrap',gap:'8px'}}>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                  <Link href={`/dashboard/don-hang/${chuyen.maDon}`}
                    style={{fontWeight:700,color:'var(--primary)',textDecoration:'none',fontSize:'14px'}}>
                    {chuyen.maDon}
                  </Link>
                  <span style={{fontSize:'12px',background:'#F0F4FF',color:'var(--primary)',padding:'2px 8px',borderRadius:'4px',fontWeight:600}}>
                    Đợt {chuyen.dotGiao}
                  </span>
                  <span style={{
                    fontSize:'11px',padding:'2px 8px',borderRadius:'12px',fontWeight:700,
                    background:tatCaDS?'#D1FAE5':motPhanDS?'#FEF9C3':'#FEF3C7',
                    color:tatCaDS?'#065F46':motPhanDS?'#92400E':'#92400E',
                  }}>
                    {tatCaDS?'✅ Đã đối soát':motPhanDS?'⚡ Một phần':'⏳ Chưa đối soát'}
                  </span>
                </div>
                <div style={{fontSize:'12px',color:'var(--text-secondary)',marginTop:'3px'}}>
                  👤 <strong>{chuyen.tenKH}</strong> · 📍 {chuyen.diaChi}
                </div>
                <div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'2px'}}>
                  🕐 {fDT(chuyen.ngayGiao)} · {chuyen.maChuyen}
                </div>
              </div>
              <Link href={`/dashboard/doi-soat?maChuyen=${chuyen.maChuyen}`}
                style={{padding:'6px 14px',borderRadius:'8px',background:'var(--primary)',color:'white',textDecoration:'none',fontSize:'12px',fontWeight:700,whiteSpace:'nowrap'}}>
                💰 Đối soát
              </Link>
            </div>

            {/* Người tham gia */}
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'8px'}}>
              {chuyen.nguoiList.map((nguoi:any,i:number)=>{
                const vaiTro = nguoi['Vai trò chuyến']||'—'
                const laDT = nguoi['Hình thức giao']==='Đối tác'
                const daDS = nguoi['Tình trạng đối soát']==='Đã đối soát'
                const vaiTroColor = vaiTro.includes('Lắp')&&vaiTro.includes('Vận')?{bg:'#EDE9FE',c:'#6D28D9'}
                  :vaiTro==='Lắp đặt'?{bg:'#FEF3C7',c:'#92400E'}:{bg:'#DBEAFE',c:'#1E40AF'}
                return(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:'6px',padding:'5px 10px',borderRadius:'8px',border:'1px solid #E5E7EB',background:daDS?'#F0FDF4':'white',fontSize:'12px'}}>
                    <span style={{fontWeight:600}}>{nguoi['Tên NV/đối tác']||'—'}</span>
                    <span style={{padding:'1px 6px',borderRadius:'10px',fontSize:'10px',fontWeight:700,...{background:vaiTroColor.bg,color:vaiTroColor.c}}}>{vaiTro}</span>
                    {laDT&&<span style={{padding:'1px 6px',borderRadius:'10px',background:'#FEF3C7',color:'#92400E',fontSize:'10px',fontWeight:700}}>Đối tác</span>}
                    {daDS&&<span style={{color:'#16A34A',fontSize:'11px'}}>✅</span>}
                  </div>
                )
              })}
            </div>

            {/* Sản phẩm giao đợt này */}
            {spChuyen.length>0&&(
              <div style={{marginTop:'6px',padding:'8px 10px',background:'#F8FAFC',borderRadius:'6px',fontSize:'12px'}}>
                <div style={{fontWeight:600,color:'var(--text-secondary)',marginBottom:'4px'}}>📦 Sản phẩm đợt này:</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                  {spChuyen.map((sp:any,i:number)=>(
                    <span key={i} style={{padding:'2px 8px',borderRadius:'4px',background:'white',border:'1px solid #E5E7EB'}}>
                      {sp['Tên SP (ghi nhanh)']||'—'} ×{sp['Số lượng giao đợt này']||1}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* ── MODAL TẠO CHUYẾN ── */}
      {showForm&&(
        <div className="overlay" onClick={()=>{setShowForm(false);resetForm()}}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <h2 style={{fontSize:'17px',fontWeight:700,margin:0}}>🚚 Tạo chuyến giao hàng</h2>
              <button onClick={()=>{setShowForm(false);resetForm()}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'22px',color:'#6B7280'}}>✕</button>
            </div>

            {/* Chọn đơn + đợt */}
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'12px',marginBottom:'16px'}}>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'4px'}}>Đơn hàng *</label>
                <div style={{position:'relative'}}>
                  <input className="input" placeholder="Gõ mã đơn hoặc tên khách hàng..."
                    value={searchDon}
                    onChange={e=>{setSearchDon(e.target.value);setDonChon(null);setShowDon(true)}}
                    onFocus={()=>setShowDon(true)}
                    onBlur={()=>setTimeout(()=>setShowDon(false),200)}/>
                  {showDon&&(
                    <div className="drop-box">
                      {donLoc.length===0
                        ?<div style={{padding:'12px',fontSize:'12px',color:'#6B7280',textAlign:'center'}}>Không có đơn cần giao</div>
                        :donLoc.map((don:any)=>(
                          <div key={don['Mã đơn hàng']} className="drop-item" onClick={()=>chonDon(don)}>
                            <div style={{fontWeight:700,color:'var(--primary)'}}>{don['Mã đơn hàng']}</div>
                            <div style={{fontSize:'12px'}}>{getTenKH(don['Mã KH'],don['Tên khách hàng'])} · {getDiaChi(don)}</div>
                            <div style={{fontSize:'11px',color:'#DC2626'}}>Còn thu: {fVND(don['Còn phải thu'])}</div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
                {donChon&&(
                  <div style={{marginTop:'6px',background:'var(--primary-pale)',borderRadius:'6px',padding:'8px 12px',fontSize:'12px'}}>
                    <div style={{fontWeight:700,color:'var(--primary)'}}>✅ {donChon['Mã đơn hàng']}</div>
                    <div>{getTenKH(donChon['Mã KH'],donChon['Tên khách hàng'])} · {getDiaChi(donChon)}</div>
                    <div style={{color:'#DC2626',fontWeight:600}}>Còn thu: {fVND(donChon['Còn phải thu'])}</div>
                  </div>
                )}
              </div>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'4px'}}>Đợt giao</label>
                <input className="input" type="number" min="1" value={dotGiao} onChange={e=>setDotGiao(Number(e.target.value))}/>
                <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'4px',marginTop:'10px'}}>Ngày giờ giao</label>
                <input className="input" type="datetime-local" value={ngayGiao} onChange={e=>setNgayGiao(e.target.value)}/>
              </div>
            </div>

            {/* Sản phẩm giao đợt này */}
            {danhSachSP.length>0&&(
              <div style={{marginBottom:'16px'}}>
                <label style={{fontSize:'12px',fontWeight:700,display:'block',marginBottom:'8px',color:'var(--primary)'}}>
                  📦 Chọn sản phẩm giao đợt này
                </label>
                {danhSachSP.map((sp,idx)=>(
                  <div key={idx} className="sp-row">
                    <input type="checkbox" checked={sp.checked} onChange={e=>updSP(idx,'checked',e.target.checked)}
                      style={{width:'16px',height:'16px',flexShrink:0,accentColor:'var(--primary)'}}/>
                    <span style={{flex:1,fontSize:'13px',fontWeight:sp.checked?600:400,color:sp.checked?'#1F2937':'#9CA3AF'}}>
                      {sp.tenSP}
                    </span>
                    <span style={{fontSize:'11px',color:'#6B7280',whiteSpace:'nowrap'}}>
                      ĐH: {sp.soLuongDon} · Đã giao: {sp.daDuocGiao}
                    </span>
                    {sp.checked&&(
                      <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                        <label style={{fontSize:'11px',color:'#6B7280',whiteSpace:'nowrap'}}>Giao:</label>
                        <input type="number" min="1" max={sp.soLuongDon - sp.daDuocGiao} value={sp.soLuongGiao}
                          onChange={e=>updSP(idx,'soLuongGiao',Number(e.target.value))}
                          style={{width:'52px',padding:'3px 6px',border:'1px solid var(--border)',borderRadius:'4px',fontSize:'12px'}}/>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Danh sách người tham gia */}
            <div style={{marginBottom:'16px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                <label style={{fontSize:'12px',fontWeight:700,color:'var(--primary)'}}>👷 Người vận chuyển / lắp đặt</label>
                <button onClick={themNguoi} style={{padding:'5px 12px',borderRadius:'6px',border:'1px solid var(--primary)',color:'var(--primary)',background:'white',cursor:'pointer',fontSize:'12px',fontWeight:600}}>
                  + Thêm người
                </button>
              </div>

              {danhSachNguoi.map((nguoi,idx)=>(
                <div key={nguoi.id} className="nguoi-card">
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                    <span style={{fontSize:'12px',fontWeight:700,color:'var(--text-secondary)'}}>Người {idx+1}</span>
                    {danhSachNguoi.length>1&&(
                      <button onClick={()=>xoaNguoi(nguoi.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#DC2626',fontSize:'16px'}}>✕</button>
                    )}
                  </div>

                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                    {/* Hình thức */}
                    <div>
                      <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Hình thức</label>
                      <select className="input" value={nguoi.hinhThuc} onChange={e=>updNguoi(nguoi.id,'hinhThuc',e.target.value as any)}>
                        <option value="NV cửa hàng">NV cửa hàng</option>
                        <option value="Đối tác">Đối tác ngoài</option>
                      </select>
                    </div>
                    {/* Vai trò */}
                    <div>
                      <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Vai trò</label>
                      <select className="input" value={nguoi.vaiTro} onChange={e=>updNguoi(nguoi.id,'vaiTro',e.target.value as any)}>
                        {VAI_TRO.map(v=><option key={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Tên người — dropdown tìm kiếm */}
                  <div style={{marginBottom:'10px'}}>
                    <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Tên người *</label>
                    <div style={{position:'relative'}}>
                      <input className="input" placeholder="Gõ tên hoặc chọn từ danh sách..."
                        value={nguoi.searchText||nguoi.tenNV}
                        onChange={e=>{updNguoi(nguoi.id,'searchText',e.target.value);updNguoi(nguoi.id,'tenNV',e.target.value);updNguoi(nguoi.id,'showSearch',true)}}
                        onFocus={()=>updNguoi(nguoi.id,'showSearch',true)}
                        onBlur={()=>setTimeout(()=>updNguoi(nguoi.id,'showSearch',false),200)}/>
                      {nguoi.showSearch&&(
                        <div className="drop-box">
                          {nguoi.tenNV&&!nhanVien.find((nv:any)=>nv['Họ tên']===nguoi.tenNV)&&(
                            <div className="drop-item" onClick={()=>updNguoi(nguoi.id,'showSearch',false)}
                              style={{background:'#FEF9C3',color:'#92400E',fontSize:'12px'}}>
                              ✏️ Dùng tên: <strong>"{nguoi.tenNV}"</strong>
                            </div>
                          )}
                          {getNVLoc(nguoi.searchText||nguoi.tenNV).map((nv:any)=>(
                            <div key={nv['Mã NV']} className="drop-item" onClick={()=>chonNV(nguoi.id,nv)}>
                              <div style={{fontWeight:600}}>{nv['Họ tên']}</div>
                              <div style={{fontSize:'11px',color:'#6B7280'}}>{nv['Mã NV']} · {nv['Vai trò']||'—'}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Chi phí + thưởng */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px'}}>
                    <div>
                      <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>
                        {nguoi.hinhThuc==='Đối tác'?'CP vận chuyển (đ)':'Thưởng VC (đ)'}
                      </label>
                      <input className="input" type="number" min="0" value={nguoi.chiPhiVC||''} placeholder="0"
                        onChange={e=>updNguoi(nguoi.id,'chiPhiVC',Number(e.target.value))}
                        style={{fontSize:'12px'}}/>
                    </div>
                    <div>
                      <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>
                        {nguoi.hinhThuc==='Đối tác'?'CP lắp đặt (đ)':'Thưởng lắp (đ)'}
                      </label>
                      <input className="input" type="number" min="0" value={nguoi.chiPhiLap||''} placeholder="0"
                        onChange={e=>updNguoi(nguoi.id,'chiPhiLap',Number(e.target.value))}
                        style={{fontSize:'12px'}}/>
                    </div>
                    <div>
                      <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Thưởng chuyến (đ)</label>
                      <input className="input" type="number" min="0" value={nguoi.thuongChuyen||''} placeholder="0"
                        onChange={e=>updNguoi(nguoi.id,'thuongChuyen',Number(e.target.value))}
                        style={{fontSize:'12px'}}/>
                    </div>
                  </div>

                  {/* Ghi chú người */}
                  <div style={{marginTop:'8px'}}>
                    <input className="input" placeholder="Ghi chú riêng..." value={nguoi.ghiChu}
                      onChange={e=>updNguoi(nguoi.id,'ghiChu',e.target.value)}
                      style={{fontSize:'12px'}}/>
                  </div>

                  {/* Tổng chi phí người này */}
                  {(nguoi.chiPhiVC+nguoi.chiPhiLap+nguoi.thuongChuyen)>0&&(
                    <div style={{marginTop:'8px',fontSize:'12px',color:nguoi.hinhThuc==='Đối tác'?'#DC2626':'#065F46',fontWeight:600}}>
                      {nguoi.hinhThuc==='Đối tác'?'💸 Phải trả:':'🎁 Thưởng:'}
                      {' '}{fVND(nguoi.chiPhiVC+nguoi.chiPhiLap+nguoi.thuongChuyen)}
                      {nguoi.hinhThuc==='Đối tác'&&<span style={{fontWeight:400,color:'#6B7280',marginLeft:'6px'}}>(trả ngay sau chuyến)</span>}
                      {nguoi.hinhThuc==='NV cửa hàng'&&<span style={{fontWeight:400,color:'#6B7280',marginLeft:'6px'}}>(trả cuối tháng)</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Tổng chi phí chuyến */}
            {danhSachNguoi.length>0&&(
              <div style={{padding:'12px 14px',background:'#FFF7ED',borderRadius:'8px',border:'1px solid #FED7AA',marginBottom:'16px',fontSize:'13px'}}>
                <div style={{fontWeight:700,marginBottom:'6px'}}>💰 Tổng chi phí chuyến này:</div>
                {danhSachNguoi.filter(n=>n.tenNV).map((n,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',marginBottom:'3px',fontSize:'12px'}}>
                    <span>{n.tenNV} ({n.vaiTro})</span>
                    <span style={{fontWeight:600,color:n.hinhThuc==='Đối tác'?'#DC2626':'#065F46'}}>
                      {fVND(n.chiPhiVC+n.chiPhiLap+n.thuongChuyen)}
                      <span style={{fontWeight:400,color:'#9CA3AF',fontSize:'11px',marginLeft:'4px'}}>
                        {n.hinhThuc==='Đối tác'?'(trả ngay)':'(cuối tháng)'}
                      </span>
                    </span>
                  </div>
                ))}
                <div style={{borderTop:'1px solid #FED7AA',paddingTop:'6px',marginTop:'6px',fontWeight:700,display:'flex',justifyContent:'space-between'}}>
                  <span>Tổng:</span>
                  <span style={{color:'#DC2626'}}>
                    {fVND(danhSachNguoi.reduce((s,n)=>s+n.chiPhiVC+n.chiPhiLap+n.thuongChuyen,0))}
                  </span>
                </div>
              </div>
            )}

            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={luuChuyen} disabled={loading} style={{flex:1,padding:'12px',borderRadius:'8px',border:'none',background:'var(--primary)',color:'white',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>
                {loading?'⏳ Đang lưu...':'✅ Tạo chuyến giao'}
              </button>
              <button onClick={()=>{setShowForm(false);resetForm()}} style={{padding:'12px 18px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px'}}>Huỷ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
