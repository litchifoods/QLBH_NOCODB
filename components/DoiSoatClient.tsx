'use client'
// components/DoiSoatClient.tsx
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

interface DoiSoatForm {
  tienThuKH: number
  hinhThucThu: string
  chiPhiVC: number
  chiPhiLap: number
  thuongChuyen: number
  ketQua: string
  ghiChu: string
  hoanThanhDon: boolean
}

export default function DoiSoatClient({
  chuyenMap, doiSoatMap, donHangMap, khachHangMap, maChuyen: maChuyenFilter, user,
}: {
  chuyenMap: Record<string, any[]>
  doiSoatMap: Record<string, any>
  donHangMap: Record<string, any>
  khachHangMap: Record<string, any>
  maChuyen?: string
  user: UserSession
}) {
  const router = useRouter()
  const [filterTT, setFilterTT]   = useState(maChuyenFilter ? 'Tất cả' : 'Chưa đối soát')
  const [modalData, setModalData] = useState<{nguoi:any; maDon:string; don:any; maChuyen:string}|null>(null)
  const [form, setForm]           = useState<DoiSoatForm>({
    tienThuKH:0, hinhThucThu:'Tiền mặt', chiPhiVC:0, chiPhiLap:0,
    thuongChuyen:0, ketQua:'Thành công', ghiChu:'', hoanThanhDon:false,
  })
  const [loading, setLoading]     = useState(false)
  const [msg, setMsg]             = useState('')
  const [msgOk, setMsgOk]         = useState(true)

  function getTenKH(maKH: string, tenTuDon?: string) {
    return khachHangMap[maKH]?.['Tên khách hàng'] || tenTuDon || maKH || '—'
  }

  // Danh sách chuyến có thể hiển thị
  const allChuyen = useMemo(() => {
    return Object.entries(chuyenMap)
      .filter(([maChuyen]) => maChuyenFilter ? maChuyen === maChuyenFilter : true)
      .map(([maChuyen, nguoiList]) => {
        const maDon = nguoiList[0]?.['Mã đơn hàng']||''
        const don = donHangMap[maDon]
        const maKH = don?.['Mã KH']||''
        const tatCaDS = nguoiList.every(n=>n['Tình trạng đối soát']==='Đã đối soát')
        const choDSCount = nguoiList.filter(n=>n['Tình trạng đối soát']!=='Đã đối soát').length
        return { maChuyen, maDon, nguoiList, don, maKH, tenKH: getTenKH(maKH,don?.['Tên khách hàng']), tatCaDS, choDSCount }
      })
      .sort((a,b) => {
        const ngayA = a.nguoiList[0]?.['Ngày giao']||''
        const ngayB = b.nguoiList[0]?.['Ngày giao']||''
        return new Date(ngayB).getTime() - new Date(ngayA).getTime()
      })
  }, [chuyenMap, donHangMap, khachHangMap, maChuyenFilter])

  const filtered = useMemo(() => {
    if (filterTT==='Tất cả') return allChuyen
    if (filterTT==='Chưa đối soát') return allChuyen.filter(c=>!c.tatCaDS)
    return allChuyen.filter(c=>c.tatCaDS)
  }, [allChuyen, filterTT])

  const tongChuaDS = allChuyen.filter(c=>!c.tatCaDS).length
  const tongCP = allChuyen.reduce((s,c)=>s+c.nguoiList.reduce((ss,n)=>ss+Number(n['Chi phí VC']||0)+Number(n['Chi phí lắp đặt']||0)+Number(n['Thưởng chuyến']||0),0),0)

  function moModal(nguoi: any, maDon: string, don: any, maChuyen: string) {
    const ds = doiSoatMap[nguoi['Mã giao hàng']]
    setForm({
      tienThuKH:    Number(don?.['Còn phải thu']||0),
      hinhThucThu:  'Tiền mặt',
      chiPhiVC:     Number(nguoi['Chi phí VC']||0),
      chiPhiLap:    Number(nguoi['Chi phí lắp đặt']||0),
      thuongChuyen: Number(nguoi['Thưởng chuyến']||0),
      ketQua:       'Thành công',
      ghiChu:       '',
      hoanThanhDon: false,
    })
    setModalData({nguoi, maDon, don, maChuyen})
  }

  function setF(k: keyof DoiSoatForm, v: any) { setForm(prev=>({...prev,[k]:v})) }

  async function luuDoiSoat() {
    if (!modalData) return
    setLoading(true); setMsg('')
    try {
      const res = await fetch('/api/doi-soat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          maGiaoHang:   modalData.nguoi['Mã giao hàng'],
          maChuyen:     modalData.maChuyen,
          maDon:        modalData.maDon,
          maNVDoiTac:   modalData.nguoi['Mã NV/đối tác']||'',
          tenNVDoiTac:  modalData.nguoi['Tên NV/đối tác']||'',
          hinhThucGiao: modalData.nguoi['Hình thức giao']||'',
          tienThuKH:    form.tienThuKH,
          hinhThucThu:  form.hinhThucThu,
          chiPhiVC:     form.chiPhiVC,
          chiPhiLap:    form.chiPhiLap,
          thuongChuyen: form.thuongChuyen,
          ketQua:       form.ketQua,
          ghiChu:       form.ghiChu,
          hoanThanhDon: form.hoanThanhDon,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).message||'Lỗi')
      setMsg('✅ Đã lưu đối soát'); setMsgOk(true)
      setModalData(null); router.refresh()
    } catch (err:any) {
      setMsg('❌ '+(err.message||'Lỗi')); setMsgOk(false)
    } finally {
      setLoading(false); setTimeout(()=>setMsg(''),4000)
    }
  }

  const laDT = modalData?.nguoi['Hình thức giao']==='Đối tác'
  const tongPhaiTra = (form.chiPhiVC||0)+(form.chiPhiLap||0)+(form.thuongChuyen||0)

  return (
    <div style={{padding:'20px'}}>
      <style>{`
        .ds-hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:12px;flex-wrap:wrap;}
        .chuyen-card{border:1px solid var(--border);border-radius:10px;padding:14px 16px;background:white;margin-bottom:10px;}
        .nguoi-row{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:8px;border:1px solid #E5E7EB;background:#FAFBFD;margin-bottom:6px;gap:8px;flex-wrap:wrap;}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;}
        .modal{background:white;border-radius:12px;padding:24px;width:100%;max-width:500px;max-height:92vh;overflow-y:auto;}
        .kv{display:flex;justify-content:space-between;padding:'4px 0';font-size:13px;margin-bottom:4px;}
      `}</style>

      {/* Header */}
      <div className="ds-hdr">
        <div>
          <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>💰 Đối soát giao hàng</h1>
          <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'2px 0 0'}}>
            {allChuyen.length} chuyến
            {tongChuaDS>0&&<span style={{marginLeft:'8px',color:'#DC2626',fontWeight:600}}>⚠️ {tongChuaDS} chuyến chưa đối soát</span>}
          </p>
        </div>
        {maChuyenFilter&&<Link href="/dashboard/doi-soat" className="btn btn-ghost btn-sm">← Xem tất cả</Link>}
      </div>

      {msg&&<div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'14px',fontSize:'13px',background:msgOk?'#D1FAE5':'#FEE2E2',color:msgOk?'#065F46':'#991B1B'}}>{msg}</div>}

      {/* Tổng quan */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'12px',marginBottom:'16px'}}>
        {[
          {icon:'🚚',label:'Tổng chuyến',val:allChuyen.length,c:'var(--primary)'},
          {icon:'⏳',label:'Chưa đối soát',val:tongChuaDS,c:'#DC2626'},
          {icon:'✅',label:'Đã đối soát',val:allChuyen.length-tongChuaDS,c:'#065F46'},
          {icon:'💸',label:'Tổng chi phí',val:fVND(tongCP),c:'#92400E'},
        ].map(({icon,label,val,c})=>(
          <div key={label} className="card" style={{padding:'12px 14px'}}>
            <div style={{fontSize:'18px',marginBottom:'2px'}}>{icon}</div>
            <div style={{fontSize:'17px',fontWeight:800,color:c}}>{val}</div>
            <div style={{fontSize:'11px',color:'var(--text-secondary)'}}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="card" style={{padding:'12px 14px',marginBottom:'14px'}}>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
          {['Tất cả','Chưa đối soát','Đã đối soát'].map(tt=>(
            <button key={tt} onClick={()=>setFilterTT(tt)} style={{
              padding:'5px 14px',borderRadius:'20px',border:'1px solid',
              borderColor:filterTT===tt?'var(--primary)':'var(--border)',
              background:filterTT===tt?'var(--primary-pale)':'white',
              color:filterTT===tt?'var(--primary)':'var(--text-secondary)',
              fontWeight:filterTT===tt?700:400,fontSize:'12px',cursor:'pointer',
            }}>{tt}</button>
          ))}
        </div>
      </div>

      {/* Danh sách */}
      {filtered.length===0?(
        <div className="card" style={{padding:'48px',textAlign:'center',color:'var(--text-muted)'}}>Không có chuyến nào</div>
      ):filtered.map(({maChuyen,maDon,nguoiList,don,tenKH,tatCaDS,choDSCount})=>{
        const ngayGiao = nguoiList[0]?.['Ngày giao']||''
        const dotGiao  = nguoiList[0]?.['Đợt giao']||1
        const conThuKH = Number(don?.['Còn phải thu']||0)

        return(
          <div key={maChuyen} className="chuyen-card">
            {/* Header */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px',flexWrap:'wrap',gap:'6px'}}>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                  <Link href={`/dashboard/don-hang/${maDon}`}
                    style={{fontWeight:700,color:'var(--primary)',textDecoration:'none',fontSize:'14px'}}>{maDon}</Link>
                  <span style={{fontSize:'11px',background:'#F0F4FF',color:'var(--primary)',padding:'2px 7px',borderRadius:'4px',fontWeight:600}}>Đợt {dotGiao}</span>
                  <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'12px',fontWeight:700,
                    background:tatCaDS?'#D1FAE5':'#FEF3C7',color:tatCaDS?'#065F46':'#92400E'}}>
                    {tatCaDS?'✅ Xong':choDSCount===nguoiList.length?`⏳ ${choDSCount} người chờ`:`⚡ ${choDSCount}/${nguoiList.length} chờ`}
                  </span>
                </div>
                <div style={{fontSize:'12px',color:'var(--text-secondary)',marginTop:'3px'}}>
                  👤 {tenKH} · 🕐 {fDT(ngayGiao)}
                  {conThuKH>0&&<span style={{marginLeft:'8px',color:'#DC2626',fontWeight:600}}>📌 Còn thu: {fVND(conThuKH)}</span>}
                </div>
              </div>
            </div>

            {/* Từng người — đối soát riêng */}
            {nguoiList.map((nguoi:any,i:number)=>{
              const maGH     = nguoi['Mã giao hàng']
              const daDS     = nguoi['Tình trạng đối soát']==='Đã đối soát'
              const dsRecord = doiSoatMap[maGH]
              const laDT     = nguoi['Hình thức giao']==='Đối tác'
              const vaiTro   = nguoi['Vai trò chuyến']||'—'
              const chiPhi   = Number(nguoi['Chi phí VC']||0)+Number(nguoi['Chi phí lắp đặt']||0)+Number(nguoi['Thưởng chuyến']||0)
              const vaiTroColor = vaiTro.includes('Lắp')&&vaiTro.includes('Vận')?{bg:'#EDE9FE',c:'#6D28D9'}
                :vaiTro==='Lắp đặt'?{bg:'#FEF3C7',c:'#92400E'}:{bg:'#DBEAFE',c:'#1E40AF'}

              return(
                <div key={i} className="nguoi-row">
                  <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',flex:1}}>
                    <span style={{fontWeight:600,fontSize:'13px'}}>{nguoi['Tên NV/đối tác']||'—'}</span>
                    <span style={{padding:'2px 7px',borderRadius:'10px',fontSize:'10px',fontWeight:700,background:vaiTroColor.bg,color:vaiTroColor.c}}>{vaiTro}</span>
                    {laDT&&<span style={{padding:'2px 7px',borderRadius:'10px',background:'#FEF3C7',color:'#92400E',fontSize:'10px',fontWeight:700}}>Đối tác</span>}
                    {!laDT&&<span style={{padding:'2px 7px',borderRadius:'10px',background:'#DBEAFE',color:'#1E40AF',fontSize:'10px',fontWeight:700}}>NV cửa hàng</span>}
                    {chiPhi>0&&(
                      <span style={{fontSize:'12px',color:laDT?'#DC2626':'#065F46',fontWeight:600}}>
                        {laDT?'💸':'🎁'} {fVND(chiPhi)} {laDT?'(trả ngay)':'(cuối tháng)'}
                      </span>
                    )}
                  </div>

                  {daDS?(
                    <div style={{fontSize:'12px',color:'#065F46',fontWeight:600,display:'flex',alignItems:'center',gap:'6px'}}>
                      ✅ Đã đối soát
                      {dsRecord&&<span style={{color:'#6B7280',fontWeight:400}}>· {dsRecord['Kết quả']||''}</span>}
                    </div>
                  ):(
                    <button onClick={()=>moModal(nguoi,maDon,don,maChuyen)}
                      style={{padding:'6px 14px',borderRadius:'6px',border:'none',background:'var(--primary)',color:'white',fontWeight:700,fontSize:'12px',cursor:'pointer',whiteSpace:'nowrap'}}>
                      💰 Đối soát
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      {/* Modal đối soát 1 người */}
      {modalData&&(
        <div className="overlay" onClick={()=>setModalData(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>💰 Đối soát chuyến</h2>
              <button onClick={()=>setModalData(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>

            {/* Thông tin */}
            <div style={{background:'var(--primary-pale)',borderRadius:'8px',padding:'12px 14px',marginBottom:'16px',fontSize:'13px'}}>
              <div style={{fontWeight:700,color:'var(--primary)',marginBottom:'4px'}}>
                {modalData.nguoi['Tên NV/đối tác']||'—'}
                {laDT&&<span style={{marginLeft:'8px',padding:'2px 8px',borderRadius:'10px',background:'#FEF3C7',color:'#92400E',fontSize:'11px'}}>Đối tác ngoài</span>}
                {!laDT&&<span style={{marginLeft:'8px',padding:'2px 8px',borderRadius:'10px',background:'#DBEAFE',color:'#1E40AF',fontSize:'11px'}}>NV cửa hàng</span>}
              </div>
              <div>📋 {modalData.maDon} · Đợt {modalData.nguoi['Đợt giao']||1} · {modalData.nguoi['Vai trò chuyến']||'—'}</div>
              {Number(modalData.don?.['Còn phải thu']||0)>0&&(
                <div style={{color:'#DC2626',fontWeight:600,marginTop:'3px'}}>
                  📌 KH còn nợ: {fVND(modalData.don?.['Còn phải thu'])}
                </div>
              )}
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>

              {/* Tiền thu từ KH */}
              <div style={{background:'#F0FDF4',borderRadius:'8px',padding:'12px 14px',border:'1px solid #BBF7D0'}}>
                <div style={{fontWeight:700,fontSize:'13px',marginBottom:'8px',color:'#15803D'}}>💵 Tiền thu từ khách hàng</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  <div>
                    <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Số tiền thu (đ)</label>
                    <input className="input" type="number" min="0" value={form.tienThuKH||''} placeholder="0"
                      onChange={e=>setF('tienThuKH',Number(e.target.value))}/>
                    {Number(modalData.don?.['Còn phải thu']||0)>0&&(
                      <button onClick={()=>setF('tienThuKH',Number(modalData.don?.['Còn phải thu']||0))}
                        style={{marginTop:'3px',padding:'2px 8px',border:'1px solid #BBF7D0',borderRadius:'4px',background:'white',cursor:'pointer',fontSize:'11px',color:'#15803D'}}>
                        Điền đủ: {fVND(modalData.don?.['Còn phải thu'])}
                      </button>
                    )}
                  </div>
                  <div>
                    <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Hình thức thu</label>
                    <select className="input" value={form.hinhThucThu} onChange={e=>setF('hinhThucThu',e.target.value)}>
                      <option>Tiền mặt</option>
                      <option>Chuyển khoản</option>
                      <option>Tiền mặt+chuyển khoản</option>
                      <option>KH nợ — chưa thu</option>
                      <option>KH CK thẳng cửa hàng</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Chi phí/thưởng cho người này */}
              <div style={{background:laDT?'#FFF7ED':'#F0F9FF',borderRadius:'8px',padding:'12px 14px',border:`1px solid ${laDT?'#FED7AA':'#BAE6FD'}`}}>
                <div style={{fontWeight:700,fontSize:'13px',marginBottom:'8px',color:laDT?'#C2410C':'#0369A1'}}>
                  {laDT?'💸 Chi phí trả đối tác (trả ngay)':'🎁 Thưởng nhân viên (ghi nhận cuối tháng)'}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px'}}>
                  <div>
                    <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>CP vận chuyển (đ)</label>
                    <input className="input" type="number" min="0" value={form.chiPhiVC||''} placeholder="0"
                      onChange={e=>setF('chiPhiVC',Number(e.target.value))} style={{fontSize:'12px'}}/>
                  </div>
                  <div>
                    <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>CP lắp đặt (đ)</label>
                    <input className="input" type="number" min="0" value={form.chiPhiLap||''} placeholder="0"
                      onChange={e=>setF('chiPhiLap',Number(e.target.value))} style={{fontSize:'12px'}}/>
                  </div>
                  <div>
                    <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Thưởng chuyến (đ)</label>
                    <input className="input" type="number" min="0" value={form.thuongChuyen||''} placeholder="0"
                      onChange={e=>setF('thuongChuyen',Number(e.target.value))} style={{fontSize:'12px'}}/>
                  </div>
                </div>
                {tongPhaiTra>0&&(
                  <div style={{marginTop:'6px',fontSize:'12px',fontWeight:700,color:laDT?'#DC2626':'#0369A1'}}>
                    Tổng {laDT?'phải trả':'ghi nhận thưởng'}: {fVND(tongPhaiTra)}
                  </div>
                )}
              </div>

              {/* Kết quả + ghi chú */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Kết quả chuyến</label>
                  <select className="input" value={form.ketQua} onChange={e=>setF('ketQua',e.target.value)}>
                    <option>Thành công</option>
                    <option>Hoàn trả</option>
                    <option>Đổi hàng</option>
                  </select>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Ghi chú</label>
                  <input className="input" placeholder="Ghi chú thêm..." value={form.ghiChu}
                    onChange={e=>setF('ghiChu',e.target.value)}/>
                </div>
              </div>

              {/* Đánh dấu hoàn thành đơn */}
              <label style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',padding:'10px 12px',background:'#F0FDF4',borderRadius:'8px',border:'1px solid #BBF7D0'}}>
                <input type="checkbox" checked={form.hoanThanhDon} onChange={e=>setF('hoanThanhDon',e.target.checked)}
                  style={{width:'16px',height:'16px',accentColor:'#16A34A'}}/>
                <div>
                  <div style={{fontSize:'13px',fontWeight:600,color:'#15803D'}}>Đánh dấu đơn hàng "Hoàn thành"</div>
                  <div style={{fontSize:'11px',color:'#6B7280'}}>Tất cả sản phẩm đã giao đủ, đơn hoàn tất</div>
                </div>
              </label>

              <div style={{display:'flex',gap:'10px'}}>
                <button onClick={luuDoiSoat} disabled={loading} style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:'var(--primary)',color:'white',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>
                  {loading?'⏳ Đang lưu...':'✅ Xác nhận đối soát'}
                </button>
                <button onClick={()=>setModalData(null)} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px'}}>Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
