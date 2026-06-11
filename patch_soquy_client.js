const fs = require('fs')
const f = 'components/ChiPhiClient.tsx'
let c = fs.readFileSync(f, 'utf8')

// 1. Thêm props mới vào interface
const old1 = `export default function ChiPhiClient({
  chiPhiList, nvList, user
}:{
  chiPhiList:any[]; nvList:any[]; user:UserSession
}) {`
const new1 = `export default function ChiPhiClient({
  chiPhiList, nvList, donHangList=[], doiSoatList=[], ttNccList=[], chiTraNvList=[],
  soDuTienMat=0, soDuNganHang=0, ngayBatDau='', caiDatId=null, user
}:{
  chiPhiList:any[]; nvList:any[]
  donHangList?:any[]; doiSoatList?:any[]; ttNccList?:any[]; chiTraNvList?:any[]
  soDuTienMat?:number; soDuNganHang?:number; ngayBatDau?:string; caiDatId?:any
  user:UserSession
}) {`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK 1. props') }
else console.log('FAIL 1.')

// 2. Thêm state sổ quỹ sau state tab
const old2 = `  const [tab, setTab] = useState<'chi'|'thu'>('chi')`
const new2 = `  const [tab, setTab] = useState<'chi'|'thu'|'soquy'>('chi')
  const [tabSoQuy, setTabSoQuy] = useState<'tienmat'|'nganhang'>('tienmat')
  const [editSoDu, setEditSoDu] = useState(false)
  const [newSoDuTM, setNewSoDuTM] = useState(soDuTienMat)
  const [newSoDuNH, setNewSoDuNH] = useState(soDuNganHang)
  const [savingSoDu, setSavingSoDu] = useState(false)`
if (c.includes(old2)) { c = c.replace(old2, new2); console.log('OK 2. state') }
else console.log('FAIL 2.')

// 3. Thêm hàm tổng hợp giao dịch sổ quỹ sau useMemo theoLoaiThu
const old3 = `  const nvLoc = useMemo(()=>{`
const new3 = `  // Tổng hợp giao dịch sổ quỹ
  const giaoDichSoQuy = useMemo(()=>{
    const list:any[] = []
    const isTM = (ht:string) => (ht||'').toLowerCase().includes('tiền mặt') || (ht||'').toLowerCase().includes('tien mat') || ht==='TM'
    const isCK = (ht:string) => (ht||'').toLowerCase().includes('chuyển khoản') || (ht||'').toLowerCase().includes('chuyen khoan') || ht==='CK'

    // 1. Đặt cọc từ đơn hàng
    for (const don of donHangList) {
      const coc = Number(don['Đặt cọc']||0)
      const ht = don['Hình thức cọc']||''
      if (coc > 0 && don['Ngày bán']) {
        const ngay = (don['Ngày bán']||'').split('T')[0]
        if (ht.includes('TM') || isTM(ht)) {
          list.push({ ngay, loai:'Thu', soTien: isTM(ht)&&!ht.includes('+') ? coc : Math.round(coc/2), dienGiai:'Đặt cọc - '+don['Tên khách hàng'], maDon:don['Mã đơn hàng'], hinhThuc:'Tiền mặt' })
        }
        if (ht.includes('CK') || isCK(ht)) {
          list.push({ ngay, loai:'Thu', soTien: isCK(ht)&&!ht.includes('+') ? coc : Math.round(coc/2), dienGiai:'Đặt cọc - '+don['Tên khách hàng'], maDon:don['Mã đơn hàng'], hinhThuc:'Chuyển khoản' })
        }
        // Hình thức cọc dạng "TM Xđ + CK Xđ"
        if (ht.includes('+')) {
          const tmMatch = ht.match(/TM\s+([\d.]+)/)
          const ckMatch = ht.match(/CK\s+([\d.]+)/)
          if (tmMatch) list.push({ ngay, loai:'Thu', soTien: Number(tmMatch[1].replace(/\./g,'')), dienGiai:'Đặt cọc TM - '+don['Tên khách hàng'], maDon:don['Mã đơn hàng'], hinhThuc:'Tiền mặt' })
          if (ckMatch) list.push({ ngay, loai:'Thu', soTien: Number(ckMatch[1].replace(/\./g,'')), dienGiai:'Đặt cọc CK - '+don['Tên khách hàng'], maDon:don['Mã đơn hàng'], hinhThuc:'Chuyển khoản' })
        }
      }
      // Hoàn tiền KH
      const hoan = Number(don['Tiền hoàn cọc']||0)
      const htHoan = don['Hình thức hoàn cọc']||''
      if (hoan > 0 && don['Tình trạng hoàn cọc']==='Đã hoàn' && htHoan) {
        const ngay = (don['Ngày bán']||'').split('T')[0]
        list.push({ ngay, loai:'Chi', soTien: hoan, dienGiai:'Hoàn tiền KH - '+don['Tên khách hàng'], maDon:don['Mã đơn hàng'], hinhThuc: htHoan })
      }
    }

    // 2. Thu tiền từ đối soát
    for (const ds of doiSoatList) {
      const thu = Number(ds['Đã thu được']||0)
      const ht = ds['Hình thức thu']||''
      if (thu > 0 && ht !== 'KH nợ-chưa thu') {
        list.push({ ngay: '', loai:'Thu', soTien: thu, dienGiai:'Thu tiền KH - '+ds['Mã đơn hàng'], maDon:ds['Mã đơn hàng'], hinhThuc: isTM(ht)?'Tiền mặt':'Chuyển khoản' })
      }
      // Chi CP vận chuyển + lắp đặt từ đối soát
      const cpVC = Number(ds['Chi phí VC']||0)
      const cpLap = Number(ds['Chi phí lắp đặt']||0)
      if (cpVC > 0) list.push({ ngay: '', loai:'Chi', soTien: cpVC, dienGiai:'CP vận chuyển - '+ds['Mã đơn hàng'], maDon:ds['Mã đơn hàng'], hinhThuc:'Tiền mặt' })
      if (cpLap > 0) list.push({ ngay: '', loai:'Chi', soTien: cpLap, dienGiai:'CP lắp đặt - '+ds['Mã đơn hàng'], maDon:ds['Mã đơn hàng'], hinhThuc:'Tiền mặt' })
    }

    // 3. Thanh toán NCC
    for (const tt of ttNccList) {
      if (tt['Trạng thái']==='Huỷ') continue
      const ht = tt['Hình thức']||''
      list.push({ ngay:(tt['Ngày trả tiền NCC']||'').split('T')[0], loai:'Chi', soTien:Number(tt['Số tiền trả']||0), dienGiai:'Trả NCC - '+(tt['Nội dung']||tt['Mã NCC']||''), hinhThuc:isTM(ht)?'Tiền mặt':'Chuyển khoản' })
    }

    // 4. Chi trả nhân viên
    for (const nv of chiTraNvList) {
      const ht = nv['Hình thức TT']||''
      const ngay = nv['Ngày thanh toán'] ? (nv['Ngày thanh toán']||'').split('T')[0] : ''
      list.push({ ngay, loai:'Chi', soTien:Number(nv['Tổng lương']||0), dienGiai:'Lương NV - '+(nv['Họ và Tên']||nv['Mã nhân viên']||''), hinhThuc:isTM(ht)?'Tiền mặt':'Chuyển khoản' })
    }

    // 5. Thu chi hoạt động
    for (const cp of chiPhiList) {
      const ht = cp['Hình thức thanh toán']||''
      const loai = cp['Loại giao dịch']==='Thu'?'Thu':'Chi'
      list.push({ ngay:(cp['Ngày phát sinh']||'').split('T')[0], loai, soTien:Number(cp['Số tiền']||0), dienGiai:(loai==='Thu'?cp['Loại thu']:cp['Loại chi phí'])||cp['Nội dung']||'Thu chi HĐ', hinhThuc:isTM(ht)?'Tiền mặt':'Chuyển khoản' })
    }

    return list.filter(g=>g.soTien>0).sort((a,b)=>(a.ngay||'')>(b.ngay||'')?1:-1)
  },[donHangList,doiSoatList,ttNccList,chiTraNvList,chiPhiList])

  const gdTienMat = useMemo(()=>giaoDichSoQuy.filter(g=>g.hinhThuc==='Tiền mặt'),[giaoDichSoQuy])
  const gdNganHang = useMemo(()=>giaoDichSoQuy.filter(g=>g.hinhThuc==='Chuyển khoản'),[giaoDichSoQuy])

  function tinhSoDu(list:any[], soDuDau:number) {
    let soDu = soDuDau
    return list.map(g => {
      soDu = g.loai==='Thu' ? soDu+g.soTien : soDu-g.soTien
      return {...g, soDu}
    })
  }

  const gdTMVoiSoDu = useMemo(()=>tinhSoDu(gdTienMat, soDuTienMat),[gdTienMat,soDuTienMat])
  const gdNHVoiSoDu = useMemo(()=>tinhSoDu(gdNganHang, soDuNganHang),[gdNganHang,soDuNganHang])

  const tongThuTM = gdTienMat.filter(g=>g.loai==='Thu').reduce((s,g)=>s+g.soTien,0)
  const tongChiTM = gdTienMat.filter(g=>g.loai==='Chi').reduce((s,g)=>s+g.soTien,0)
  const tongThuNH = gdNganHang.filter(g=>g.loai==='Thu').reduce((s,g)=>s+g.soTien,0)
  const tongChiNH = gdNganHang.filter(g=>g.loai==='Chi').reduce((s,g)=>s+g.soTien,0)
  const tonQuyCuoiTM = soDuTienMat + tongThuTM - tongChiTM
  const tonQuyCuoiNH = soDuNganHang + tongThuNH - tongChiNH

  async function luuSoDu() {
    if (!caiDatId) return
    setSavingSoDu(true)
    try {
      await fetch('/api/cai-dat', { method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ id: caiDatId, so_du_tien_mat: newSoDuTM, so_du_ngan_hang: newSoDuNH }) })
      setEditSoDu(false)
      window.location.reload()
    } catch(e) { console.error(e) }
    finally { setSavingSoDu(false) }
  }

  const nvLoc = useMemo(()=>{`
if (c.includes(old3)) { c = c.replace(old3, new3); console.log('OK 3. hàm sổ quỹ') }
else console.log('FAIL 3.')

// 4. Thêm tab Sổ quỹ vào tab bar
const old4 = `        <button onClick={()=>{setTab('thu');setSearch('');setFilterLoai('Tất cả');setFilterTT('Tất cả')}}
          style={{padding:'9px 20px',borderRadius:'8px 8px 0 0',border:'none',
            background:tab==='thu'?'#16A34A':'transparent',
            color:tab==='thu'?'white':'var(--text-secondary)',
            fontWeight:tab==='thu'?700:400,cursor:'pointer',fontSize:'13px'}}>
          💰 Khoản thu ({filteredThu.length})
        </button>
      </div>`
const new4 = `        <button onClick={()=>{setTab('thu');setSearch('');setFilterLoai('Tất cả');setFilterTT('Tất cả')}}
          style={{padding:'9px 20px',borderRadius:'8px 8px 0 0',border:'none',
            background:tab==='thu'?'#16A34A':'transparent',
            color:tab==='thu'?'white':'var(--text-secondary)',
            fontWeight:tab==='thu'?700:400,cursor:'pointer',fontSize:'13px'}}>
          💰 Khoản thu ({filteredThu.length})
        </button>
        <button onClick={()=>setTab('soquy')}
          style={{padding:'9px 20px',borderRadius:'8px 8px 0 0',border:'none',
            background:tab==='soquy'?'#7C3AED':'transparent',
            color:tab==='soquy'?'white':'var(--text-secondary)',
            fontWeight:tab==='soquy'?700:400,cursor:'pointer',fontSize:'13px'}}>
          💵 Sổ quỹ
        </button>
      </div>`
if (c.includes(old4)) { c = c.replace(old4, new4); console.log('OK 4. tab sổ quỹ') }
else console.log('FAIL 4.')

// 5. Thêm UI sổ quỹ trước modal thêm/sửa Chi
const old5 = `      {/* Modal thêm/sửa Chi */}
      {showForm&&tab==='chi'&&(`
const new5 = `      {/* Sổ quỹ */}
      {tab==='soquy'&&(
        <div>
          {/* Số dư đầu kỳ */}
          <div className="card" style={{padding:'16px',marginBottom:'16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
              <div style={{fontSize:'13px',fontWeight:700,color:'var(--primary)'}}>💰 Số dư đầu kỳ</div>
              {isOwner&&!editSoDu&&<button onClick={()=>{setEditSoDu(true);setNewSoDuTM(soDuTienMat);setNewSoDuNH(soDuNganHang)}}
                style={{padding:'4px 12px',borderRadius:'6px',border:'1px solid var(--border)',background:'white',fontSize:'12px',cursor:'pointer'}}>✏️ Sửa</button>}
            </div>
            {editSoDu?(
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'4px'}}>💵 Tiền mặt (đ)</label>
                  <input className="input" type="text" inputMode="numeric"
                    value={newSoDuTM>0?newSoDuTM.toLocaleString('vi-VN'):''}
                    onChange={e=>setNewSoDuTM(Number(e.target.value.replace(/\./g,'').replace(/[^0-9]/g,''))||0)}
                    placeholder="0"/>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'4px'}}>🏦 Ngân hàng (đ)</label>
                  <input className="input" type="text" inputMode="numeric"
                    value={newSoDuNH>0?newSoDuNH.toLocaleString('vi-VN'):''}
                    onChange={e=>setNewSoDuNH(Number(e.target.value.replace(/\./g,'').replace(/[^0-9]/g,''))||0)}
                    placeholder="0"/>
                </div>
                <div style={{gridColumn:'1/-1',display:'flex',gap:'8px'}}>
                  <button onClick={luuSoDu} disabled={savingSoDu}
                    style={{padding:'8px 16px',borderRadius:'6px',border:'none',background:'var(--primary)',color:'white',fontWeight:700,fontSize:'13px',cursor:'pointer'}}>
                    {savingSoDu?'⏳ Đang lưu...':'✅ Lưu'}
                  </button>
                  <button onClick={()=>setEditSoDu(false)}
                    style={{padding:'8px 12px',borderRadius:'6px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'13px'}}>Huỷ</button>
                </div>
              </div>
            ):(
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                <div style={{background:'#F0F4FF',borderRadius:'8px',padding:'12px'}}>
                  <div style={{fontSize:'11px',color:'#6B7280',marginBottom:'4px'}}>💵 Tiền mặt đầu kỳ</div>
                  <div style={{fontSize:'16px',fontWeight:800,color:'var(--primary)'}}>{fVND(soDuTienMat)}đ</div>
                </div>
                <div style={{background:'#F0F4FF',borderRadius:'8px',padding:'12px'}}>
                  <div style={{fontSize:'11px',color:'#6B7280',marginBottom:'4px'}}>🏦 Ngân hàng đầu kỳ</div>
                  <div style={{fontSize:'16px',fontWeight:800,color:'var(--primary)'}}>{fVND(soDuNganHang)}đ</div>
                </div>
              </div>
            )}
          </div>

          {/* Thống kê tồn quỹ */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px',marginBottom:'16px'}}>
            {[
              {icon:'💵',label:'Tồn quỹ TM',val:fVND(tonQuyCuoiTM)+'đ',c:tonQuyCuoiTM>=0?'#16A34A':'#DC2626'},
              {icon:'🏦',label:'Tồn TK NH',val:fVND(tonQuyCuoiNH)+'đ',c:tonQuyCuoiNH>=0?'#16A34A':'#DC2626'},
              {icon:'📈',label:'Tổng thu (lọc)',val:fVND(tabSoQuy==='tienmat'?tongThuTM:tongThuNH)+'đ',c:'#16A34A'},
              {icon:'📉',label:'Tổng chi (lọc)',val:fVND(tabSoQuy==='tienmat'?tongChiTM:tongChiNH)+'đ',c:'#DC2626'},
            ].map(({icon,label,val,c})=>(
              <div key={label} className="card" style={{padding:'12px 14px'}}>
                <div style={{fontSize:'18px',marginBottom:'2px'}}>{icon}</div>
                <div style={{fontSize:'15px',fontWeight:800,color:c}}>{val}</div>
                <div style={{fontSize:'11px',color:'var(--text-secondary)'}}>{label}</div>
              </div>
            ))}
          </div>

          {/* Tab TM / NH */}
          <div style={{display:'flex',gap:'4px',marginBottom:'12px'}}>
            {([['tienmat','💵 Tiền mặt'],['nganhang','🏦 Ngân hàng']] as const).map(([k,label])=>(
              <button key={k} onClick={()=>setTabSoQuy(k)}
                style={{padding:'7px 18px',borderRadius:'8px',border:'2px solid',
                  borderColor:tabSoQuy===k?'#7C3AED':'var(--border)',
                  background:tabSoQuy===k?'#F5F3FF':'white',
                  color:tabSoQuy===k?'#7C3AED':'var(--text-secondary)',
                  fontWeight:tabSoQuy===k?700:400,cursor:'pointer',fontSize:'13px'}}>
                {label} ({(tabSoQuy===k?tabSoQuy==='tienmat'?gdTienMat:gdNganHang:k==='tienmat'?gdTienMat:gdNganHang).length})
              </button>
            ))}
          </div>

          {/* Bảng giao dịch */}
          <div className="card" style={{overflow:'hidden'}}>
            <div style={{overflowX:'auto'}}>
              <table className="cp-t" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                <thead>
                  <tr style={{background:tabSoQuy==='tienmat'?'#F5F3FF':'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                    <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Ngày</th>
                    <th style={{textAlign:'left',fontWeight:700}}>Diễn giải</th>
                    <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Mã đơn</th>
                    <th style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap',color:'#16A34A'}}>Thu</th>
                    <th style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap',color:'#DC2626'}}>Chi</th>
                    <th style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>Tồn quỹ</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Dòng số dư đầu kỳ */}
                  <tr style={{borderBottom:'1px solid #F0F0F0',background:'#FFFBEB'}}>
                    <td style={{fontSize:'11px',color:'#6B7280'}}>{ngayBatDau?fDate(ngayBatDau):'—'}</td>
                    <td style={{fontWeight:600,color:'#92400E'}}>📌 Số dư đầu kỳ</td>
                    <td>—</td>
                    <td style={{textAlign:'right',fontWeight:700,color:'#92400E'}}>{fVND(tabSoQuy==='tienmat'?soDuTienMat:soDuNganHang)}đ</td>
                    <td></td>
                    <td style={{textAlign:'right',fontWeight:700,color:'#92400E'}}>{fVND(tabSoQuy==='tienmat'?soDuTienMat:soDuNganHang)}đ</td>
                  </tr>
                  {(tabSoQuy==='tienmat'?gdTMVoiSoDu:gdNHVoiSoDu).length===0?(
                    <tr><td colSpan={6} style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>Chưa có giao dịch nào</td></tr>
                  ):(tabSoQuy==='tienmat'?gdTMVoiSoDu:gdNHVoiSoDu).map((g,i)=>(
                    <tr key={i} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                      <td style={{fontSize:'11px',color:'#6B7280',whiteSpace:'nowrap'}}>{g.ngay?fDate(g.ngay):'—'}</td>
                      <td style={{fontSize:'12px',maxWidth:'220px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.dienGiai}</td>
                      <td style={{fontSize:'11px',color:'var(--primary)'}}>{g.maDon||'—'}</td>
                      <td style={{textAlign:'right',fontWeight:600,color:'#16A34A',whiteSpace:'nowrap'}}>{g.loai==='Thu'?fVND(g.soTien)+'đ':''}</td>
                      <td style={{textAlign:'right',fontWeight:600,color:'#DC2626',whiteSpace:'nowrap'}}>{g.loai==='Chi'?fVND(g.soTien)+'đ':''}</td>
                      <td style={{textAlign:'right',fontWeight:700,color:g.soDu>=0?'#1E40AF':'#DC2626',whiteSpace:'nowrap'}}>{fVND(g.soDu)}đ</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{background:'#F5F3FF',borderTop:'2px solid var(--border)'}}>
                    <td colSpan={3} style={{padding:'8px 10px',textAlign:'right',fontWeight:700,fontSize:'13px'}}>Tồn quỹ cuối kỳ:</td>
                    <td style={{padding:'8px 10px',textAlign:'right',fontWeight:700,color:'#16A34A',fontSize:'12px'}}>{fVND(tabSoQuy==='tienmat'?tongThuTM:tongThuNH)}đ</td>
                    <td style={{padding:'8px 10px',textAlign:'right',fontWeight:700,color:'#DC2626',fontSize:'12px'}}>{fVND(tabSoQuy==='tienmat'?tongChiTM:tongChiNH)}đ</td>
                    <td style={{padding:'8px 10px',textAlign:'right',fontWeight:800,color:((tabSoQuy==='tienmat'?tonQuyCuoiTM:tonQuyCuoiNH))>=0?'#16A34A':'#DC2626',fontSize:'15px',whiteSpace:'nowrap'}}>{fVND(tabSoQuy==='tienmat'?tonQuyCuoiTM:tonQuyCuoiNH)}đ</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal thêm/sửa Chi */}
      {showForm&&tab==='chi'&&(`
if (c.includes(old5)) { c = c.replace(old5, new5); console.log('OK 5. UI sổ quỹ') }
else console.log('FAIL 5.')

fs.writeFileSync(f, c, 'utf8')
console.log('Done!')
