const fs = require('fs')

// 1. Patch page.tsx - thêm fields vào các query
const f1 = 'app/dashboard/chi-phi/page.tsx'
let c1 = fs.readFileSync(f1, 'utf8')

// Thêm Tên NV vào đối soát + Mã đơn hàng đúng tên
const old1 = `      fields: 'Mã giao hàng,Mã đơn hàng,Đã thu được,Hình thức thu,Chi phí VC,Chi phí lắp đặt,Kết quả,Id',`
const new1 = `      fields: 'Mã giao hàng,Mã đơn hàng,Đã thu được,Hình thức thu,Chi phí VC,Chi phí lắp đặt,Kết quả,Id,Tên NV/đối tác',`
if (c1.includes(old1)) { c1 = c1.replace(old1, new1); console.log('OK 1. đối soát fields') }
else console.log('FAIL 1.')

// Thêm Tên NCC vào thanh toán NCC
const old2 = `      fields: 'Mã thanh toán,Mã NCC,Ngày trả tiền NCC,Số tiền trả,Hình thức,Nội dung,Trạng thái',`
const new2 = `      fields: 'Mã thanh toán,Mã NCC,Ngày trả tiền NCC,Số tiền trả,Hình thức,Nội dung,Trạng thái,Người trả',`
if (c1.includes(old2)) { c1 = c1.replace(old2, new2); console.log('OK 2. TT NCC fields') }
else console.log('FAIL 2.')

// Thêm map NCC vào page — fetch bảng NCC
const old3 = `  const caiDat = caiDatData.list?.[0] || {}`
const new3 = `  const caiDat = caiDatData.list?.[0] || {}

  // Map Mã NCC → Tên NCC
  const nccData = await getRecords(TABLES.NHA_CUNG_CAP, { limit: 200, fields: 'Mã NCC,Tên NCC' })
  const nccMap: Record<string,string> = {}
  for (const ncc of (nccData.list||[])) { nccMap[ncc['Mã NCC']] = ncc['Tên NCC'] }

  // Map Mã đơn hàng → Tên KH (từ donHangData)
  const donHangMap: Record<string,string> = {}
  for (const don of (donHangData.list||[])) { donHangMap[don['Mã đơn hàng']] = don['Tên khách hàng']||'' }`
if (c1.includes(old3)) { c1 = c1.replace(old3, new3); console.log('OK 3. map NCC + KH') }
else console.log('FAIL 3.')

// Truyền nccMap và donHangMap xuống client
const old4 = `      soDuTienMat={Number(caiDat['so_du_tien_mat'] || 0)}
      soDuNganHang={Number(caiDat['so_du_ngan_hang'] || 0)}
      ngayBatDau={caiDat['ngay_bat_dau'] || ''}
      caiDatId={caiDat['Id'] || caiDat['id'] || null}
      user={session!}`
const new4 = `      soDuTienMat={Number(caiDat['so_du_tien_mat'] || 0)}
      soDuNganHang={Number(caiDat['so_du_ngan_hang'] || 0)}
      ngayBatDau={caiDat['ngay_bat_dau'] || ''}
      caiDatId={caiDat['Id'] || caiDat['id'] || null}
      nccMap={nccMap}
      donHangMap={donHangMap}
      user={session!}`
if (c1.includes(old4)) { c1 = c1.replace(old4, new4); console.log('OK 4. truyền map') }
else console.log('FAIL 4.')

fs.writeFileSync(f1, c1, 'utf8')

// 2. Patch ChiPhiClient.tsx - nhận props + thêm cột + sửa diễn giải
const f2 = 'components/ChiPhiClient.tsx'
let c2 = fs.readFileSync(f2, 'utf8')

// Thêm props nccMap, donHangMap
const old5 = `  donHangList?:any[]; doiSoatList?:any[]; ttNccList?:any[]; chiTraNvList?:any[]
  soDuTienMat?:number; soDuNganHang?:number; ngayBatDau?:string; caiDatId?:any
  user:UserSession`
const new5 = `  donHangList?:any[]; doiSoatList?:any[]; ttNccList?:any[]; chiTraNvList?:any[]
  soDuTienMat?:number; soDuNganHang?:number; ngayBatDau?:string; caiDatId?:any
  nccMap?:Record<string,string>; donHangMap?:Record<string,string>
  user:UserSession`
if (c2.includes(old5)) { c2 = c2.replace(old5, new5); console.log('OK 5. interface') }
else console.log('FAIL 5.')

// Thêm nccMap, donHangMap vào destructuring
const old6 = `  donHangList=[], doiSoatList=[], ttNccList=[], chiTraNvList=[],
  soDuTienMat=0, soDuNganHang=0, ngayBatDau='', caiDatId=null, user`
const new6 = `  donHangList=[], doiSoatList=[], ttNccList=[], chiTraNvList=[],
  soDuTienMat=0, soDuNganHang=0, ngayBatDau='', caiDatId=null,
  nccMap={} as Record<string,string>, donHangMap={} as Record<string,string>, user`
if (c2.includes(old6)) { c2 = c2.replace(old6, new6); console.log('OK 6. destructuring') }
else console.log('FAIL 6.')

// Sửa giao dịch đối soát - thêm tenKH, tenNV, sửa Mã đơn hàng
const old7 = `    // 2. Thu tiền từ đối soát
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
    }`
const new7 = `    // 2. Thu tiền từ đối soát
    for (const ds of doiSoatList) {
      const maDon = ds['Mã đơn hàng']||''
      const tenKH = donHangMap[maDon]||maDon
      const tenNV = ds['Tên NV/đối tác']||''
      const thu = Number(ds['Đã thu được']||0)
      const ht = ds['Hình thức thu']||''
      if (thu > 0 && ht !== 'KH nợ-chưa thu') {
        list.push({ ngay:'', loai:'Thu', soTien:thu, dienGiai:'Thu tiền KH', maDon, tenKH, tenNV, hinhThuc:isTM(ht)?'Tiền mặt':'Chuyển khoản' })
      }
      const cpVC = Number(ds['Chi phí VC']||0)
      const cpLap = Number(ds['Chi phí lắp đặt']||0)
      if (cpVC > 0) list.push({ ngay:'', loai:'Chi', soTien:cpVC, dienGiai:'CP vận chuyển', maDon, tenKH, tenNV, hinhThuc:'Tiền mặt' })
      if (cpLap > 0) list.push({ ngay:'', loai:'Chi', soTien:cpLap, dienGiai:'CP lắp đặt', maDon, tenKH, tenNV, hinhThuc:'Tiền mặt' })
    }`
if (c2.includes(old7)) { c2 = c2.replace(old7, new7); console.log('OK 7. đối soát') }
else console.log('FAIL 7.')

// Sửa giao dịch đặt cọc - thêm tenKH
const old8 = `        if (ht.includes('TM') || isTM(ht)) {
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
        }`
const new8 = `        const tenKH = don['Tên khách hàng']||''
        const maDon = don['Mã đơn hàng']
        if (ht.includes('TM') || isTM(ht)) {
          list.push({ ngay, loai:'Thu', soTien:isTM(ht)&&!ht.includes('+')?coc:Math.round(coc/2), dienGiai:'Đặt cọc', maDon, tenKH, hinhThuc:'Tiền mặt' })
        }
        if (ht.includes('CK') || isCK(ht)) {
          list.push({ ngay, loai:'Thu', soTien:isCK(ht)&&!ht.includes('+')?coc:Math.round(coc/2), dienGiai:'Đặt cọc', maDon, tenKH, hinhThuc:'Chuyển khoản' })
        }
        if (ht.includes('+')) {
          const tmMatch = ht.match(/TM\s+([\d.]+)/)
          const ckMatch = ht.match(/CK\s+([\d.]+)/)
          if (tmMatch) list.push({ ngay, loai:'Thu', soTien:Number(tmMatch[1].replace(/\./g,'')), dienGiai:'Đặt cọc', maDon, tenKH, hinhThuc:'Tiền mặt' })
          if (ckMatch) list.push({ ngay, loai:'Thu', soTien:Number(ckMatch[1].replace(/\./g,'')), dienGiai:'Đặt cọc', maDon, tenKH, hinhThuc:'Chuyển khoản' })
        }`
if (c2.includes(old8)) { c2 = c2.replace(old8, new8); console.log('OK 8. đặt cọc') }
else console.log('FAIL 8.')

// Sửa hoàn tiền KH
const old9 = `      const hoan = Number(don['Tiền hoàn cọc']||0)
      const htHoan = don['Hình thức hoàn cọc']||''
      if (hoan > 0 && don['Tình trạng hoàn cọc']==='Đã hoàn' && htHoan) {
        const ngay = (don['Ngày bán']||'').split('T')[0]
        list.push({ ngay, loai:'Chi', soTien: hoan, dienGiai:'Hoàn tiền KH - '+don['Tên khách hàng'], maDon:don['Mã đơn hàng'], hinhThuc: htHoan })
      }`
const new9 = `      const hoan = Number(don['Tiền hoàn cọc']||0)
      const htHoan = don['Hình thức hoàn cọc']||''
      if (hoan > 0 && don['Tình trạng hoàn cọc']==='Đã hoàn' && htHoan) {
        const ngayH = (don['Ngày bán']||'').split('T')[0]
        list.push({ ngay:ngayH, loai:'Chi', soTien:hoan, dienGiai:'Hoàn tiền KH', maDon:don['Mã đơn hàng'], tenKH:don['Tên khách hàng']||'', hinhThuc:htHoan })
      }`
if (c2.includes(old9)) { c2 = c2.replace(old9, new9); console.log('OK 9. hoàn tiền') }
else console.log('FAIL 9.')

// Sửa thanh toán NCC - thêm tenNCC
const old10 = `    // 3. Thanh toán NCC
    for (const tt of ttNccList) {
      if (tt['Trạng thái']==='Huỷ') continue
      const ht = tt['Hình thức']||''
      list.push({ ngay:(tt['Ngày trả tiền NCC']||'').split('T')[0], loai:'Chi', soTien:Number(tt['Số tiền trả']||0), dienGiai:'Trả NCC - '+(tt['Nội dung']||tt['Mã NCC']||''), hinhThuc:isTM(ht)?'Tiền mặt':'Chuyển khoản' })
    }`
const new10 = `    // 3. Thanh toán NCC
    for (const tt of ttNccList) {
      if (tt['Trạng thái']==='Huỷ') continue
      const ht = tt['Hình thức']||''
      const tenNCC = nccMap[tt['Mã NCC']]||tt['Mã NCC']||''
      list.push({ ngay:(tt['Ngày trả tiền NCC']||'').split('T')[0], loai:'Chi', soTien:Number(tt['Số tiền trả']||0), dienGiai:'Trả NCC', tenNCC, nguoiThucHien:tt['Người trả']||'', hinhThuc:isTM(ht)?'Tiền mặt':'Chuyển khoản' })
    }`
if (c2.includes(old10)) { c2 = c2.replace(old10, new10); console.log('OK 10. TT NCC') }
else console.log('FAIL 10.')

// Sửa chi trả NV
const old11 = `    // 4. Chi trả nhân viên
    for (const nv of chiTraNvList) {
      const ht = nv['Hình thức TT']||''
      const ngay = nv['Ngày thanh toán'] ? (nv['Ngày thanh toán']||'').split('T')[0] : ''
      list.push({ ngay, loai:'Chi', soTien:Number(nv['Tổng lương']||0), dienGiai:'Lương NV - '+(nv['Họ và Tên']||nv['Mã nhân viên']||''), hinhThuc:isTM(ht)?'Tiền mặt':'Chuyển khoản' })
    }`
const new11 = `    // 4. Chi trả nhân viên
    for (const nv of chiTraNvList) {
      const ht = nv['Hình thức TT']||''
      const ngay = nv['Ngày thanh toán'] ? (nv['Ngày thanh toán']||'').split('T')[0] : ''
      list.push({ ngay, loai:'Chi', soTien:Number(nv['Tổng lương']||0), dienGiai:'Lương NV', nguoiThucHien:nv['Họ và Tên']||nv['Mã nhân viên']||'', hinhThuc:isTM(ht)?'Tiền mặt':'Chuyển khoản' })
    }`
if (c2.includes(old11)) { c2 = c2.replace(old11, new11); console.log('OK 11. chi NV') }
else console.log('FAIL 11.')

// Sửa thu chi HĐ
const old12 = `    // 5. Thu chi hoạt động
    for (const cp of chiPhiList) {
      const ht = cp['Hình thức thanh toán']||''
      const loai = cp['Loại giao dịch']==='Thu'?'Thu':'Chi'
      list.push({ ngay:(cp['Ngày phát sinh']||'').split('T')[0], loai, soTien:Number(cp['Số tiền']||0), dienGiai:(loai==='Thu'?cp['Loại thu']:cp['Loại chi phí'])||cp['Nội dung']||'Thu chi HĐ', hinhThuc:isTM(ht)?'Tiền mặt':'Chuyển khoản' })
    }`
const new12 = `    // 5. Thu chi hoạt động
    for (const cp of chiPhiList) {
      const ht = cp['Hình thức thanh toán']||''
      const loai = cp['Loại giao dịch']==='Thu'?'Thu':'Chi'
      list.push({ ngay:(cp['Ngày phát sinh']||'').split('T')[0], loai, soTien:Number(cp['Số tiền']||0), dienGiai:(loai==='Thu'?cp['Loại thu']:cp['Loại chi phí'])||cp['Nội dung']||'Thu chi HĐ', nguoiThucHien:cp['Người chi']||'', hinhThuc:isTM(ht)?'Tiền mặt':'Chuyển khoản' })
    }`
if (c2.includes(old12)) { c2 = c2.replace(old12, new12); console.log('OK 12. thu chi HĐ') }
else console.log('FAIL 12.')

// Sửa header bảng - thêm cột Tên KH, NV/Đối tác, NCC
const old13 = `                  <tr style={{background:tabSoQuy==='tienmat'?'#F5F3FF':'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                    <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Ngày</th>
                    <th style={{textAlign:'left',fontWeight:700}}>Diễn giải</th>
                    <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Mã đơn</th>
                    <th style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap',color:'#16A34A'}}>Thu</th>
                    <th style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap',color:'#DC2626'}}>Chi</th>
                    <th style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>Tồn quỹ</th>
                  </tr>`
const new13 = `                  <tr style={{background:tabSoQuy==='tienmat'?'#F5F3FF':'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                    <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Ngày</th>
                    <th style={{textAlign:'left',fontWeight:700}}>Diễn giải</th>
                    <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Mã đơn</th>
                    <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Khách hàng</th>
                    <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>NV/Đối tác</th>
                    <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Nhà CC</th>
                    <th style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap',color:'#16A34A'}}>Thu</th>
                    <th style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap',color:'#DC2626'}}>Chi</th>
                    <th style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>Tồn quỹ</th>
                  </tr>`
if (c2.includes(old13)) { c2 = c2.replace(old13, new13); console.log('OK 13. header') }
else console.log('FAIL 13.')

// Sửa dòng số dư đầu kỳ
const old14 = `                  <tr style={{borderBottom:'1px solid #F0F0F0',background:'#FFFBEB'}}>
                    <td style={{fontSize:'11px',color:'#6B7280'}}>{ngayBatDau?fDate(ngayBatDau):'—'}</td>
                    <td style={{fontWeight:600,color:'#92400E'}}>📌 Số dư đầu kỳ</td>
                    <td>—</td>
                    <td style={{textAlign:'right',fontWeight:700,color:'#92400E'}}>{fVND(tabSoQuy==='tienmat'?soDuTienMat:soDuNganHang)}đ</td>
                    <td></td>
                    <td style={{textAlign:'right',fontWeight:700,color:'#92400E'}}>{fVND(tabSoQuy==='tienmat'?soDuTienMat:soDuNganHang)}đ</td>
                  </tr>`
const new14 = `                  <tr style={{borderBottom:'1px solid #F0F0F0',background:'#FFFBEB'}}>
                    <td style={{fontSize:'11px',color:'#6B7280'}}>{ngayBatDau?fDate(ngayBatDau):'—'}</td>
                    <td style={{fontWeight:600,color:'#92400E'}}>📌 Số dư đầu kỳ</td>
                    <td>—</td><td>—</td><td>—</td><td>—</td>
                    <td style={{textAlign:'right',fontWeight:700,color:'#92400E'}}>{fVND(tabSoQuy==='tienmat'?soDuTienMat:soDuNganHang)}đ</td>
                    <td></td>
                    <td style={{textAlign:'right',fontWeight:700,color:'#92400E'}}>{fVND(tabSoQuy==='tienmat'?soDuTienMat:soDuNganHang)}đ</td>
                  </tr>`
if (c2.includes(old14)) { c2 = c2.replace(old14, new14); console.log('OK 14. dòng đầu kỳ') }
else console.log('FAIL 14.')

// Sửa dòng data - thêm cột tenKH, tenNV, tenNCC
const old15 = `                    <tr key={i} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                      <td style={{fontSize:'11px',color:'#6B7280',whiteSpace:'nowrap'}}>{g.ngay?fDate(g.ngay):'—'}</td>
                      <td style={{fontSize:'12px',maxWidth:'220px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.dienGiai}</td>
                      <td style={{fontSize:'11px',color:'var(--primary)'}}>{g.maDon||'—'}</td>
                      <td style={{textAlign:'right',fontWeight:600,color:'#16A34A',whiteSpace:'nowrap'}}>{g.loai==='Thu'?fVND(g.soTien)+'đ':''}</td>
                      <td style={{textAlign:'right',fontWeight:600,color:'#DC2626',whiteSpace:'nowrap'}}>{g.loai==='Chi'?fVND(g.soTien)+'đ':''}</td>
                      <td style={{textAlign:'right',fontWeight:700,color:g.soDu>=0?'#1E40AF':'#DC2626',whiteSpace:'nowrap'}}>{fVND(g.soDu)}đ</td>
                    </tr>`
const new15 = `                    <tr key={i} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                      <td style={{fontSize:'11px',color:'#6B7280',whiteSpace:'nowrap'}}>{g.ngay?fDate(g.ngay):'—'}</td>
                      <td style={{fontSize:'12px',maxWidth:'160px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.dienGiai}</td>
                      <td style={{fontSize:'11px',color:'var(--primary)',whiteSpace:'nowrap'}}>{g.maDon||'—'}</td>
                      <td style={{fontSize:'11px',maxWidth:'120px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.tenKH||'—'}</td>
                      <td style={{fontSize:'11px',maxWidth:'100px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.tenNV||g.nguoiThucHien||'—'}</td>
                      <td style={{fontSize:'11px',maxWidth:'100px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.tenNCC||'—'}</td>
                      <td style={{textAlign:'right',fontWeight:600,color:'#16A34A',whiteSpace:'nowrap'}}>{g.loai==='Thu'?fVND(g.soTien)+'đ':''}</td>
                      <td style={{textAlign:'right',fontWeight:600,color:'#DC2626',whiteSpace:'nowrap'}}>{g.loai==='Chi'?fVND(g.soTien)+'đ':''}</td>
                      <td style={{textAlign:'right',fontWeight:700,color:g.soDu>=0?'#1E40AF':'#DC2626',whiteSpace:'nowrap'}}>{fVND(g.soDu)}đ</td>
                    </tr>`
if (c2.includes(old15)) { c2 = c2.replace(old15, new15); console.log('OK 15. dòng data') }
else console.log('FAIL 15.')

// Sửa tfoot - thêm colspan
const old16 = `                    <td colSpan={3} style={{padding:'8px 10px',textAlign:'right',fontWeight:700,fontSize:'13px'}}>Tồn quỹ cuối kỳ:</td>`
const new16 = `                    <td colSpan={6} style={{padding:'8px 10px',textAlign:'right',fontWeight:700,fontSize:'13px'}}>Tồn quỹ cuối kỳ:</td>`
if (c2.includes(old16)) { c2 = c2.replace(old16, new16); console.log('OK 16. tfoot') }
else console.log('FAIL 16.')

fs.writeFileSync(f2, c2, 'utf8')
console.log('Done!')
