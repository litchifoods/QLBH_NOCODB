const fs = require('fs')
const path = require('path')
const f = path.join(process.cwd(), 'app', 'dashboard', 'don-hang', '[maDon]', 'sua', 'page.tsx')
let c = fs.readFileSync(f, 'utf8')

// Thêm logic tinhTrangThai vào sua/page.tsx
const old1 = `  const donHang = donHangResult.list?.[0]
  if (!donHang) notFound()

  // Chỉ cho sửa khi trạng thái phù hợp
  const tt = donHang['Trạng thái']||''
  if (['Huỷ','Đã giao','Hoàn thành'].includes(tt)) {
    redirect('/dashboard/don-hang/'+maDon)
  }`
const new1 = `  const donHang = donHangResult.list?.[0]
  if (!donHang) notFound()

  // Lấy thêm dữ liệu giao hàng để tính trangThaiTinh
  const [ghResult, ctGiaoResult] = await Promise.all([
    getRecords(TABLES.GIAO_HANG, { where:'(Mã đơn hàng,eq,'+maDon+')', limit:10, fields:'Mã giao hàng,Tình trạng đối soát' }),
    getRecords(TABLES.CHI_TIET_GIAO, { where:'(Mã đơn hàng,eq,'+maDon+')', limit:100, fields:'Mã giao hàng,Số lượng giao đợt này' }),
  ])
  const ghList = ghResult.list||[]
  const ctGiao = ctGiaoResult.list||[]
  const slGiao = ctGiao.reduce((s:number,ct:any)=>s+Number(ct['Số lượng giao đợt này']||0),0)
  const tatCaDaSoat = ghList.length>0 && ghList.every((gh:any)=>gh['Tình trạng đối soát']==='Đã đối soát')
  const conPhaiThu = Number(donHang['Còn phải thu']||0)

  // Tính trạng thái thực tế
  let trangThaiTinh = donHang['Trạng thái']||''
  if (trangThaiTinh !== 'Hủy' && trangThaiTinh !== 'Huỷ') {
    if (slGiao > 0 && tatCaDaSoat && conPhaiThu <= 0) trangThaiTinh = 'Hoàn thành'
    else if (slGiao > 0 && tatCaDaSoat) trangThaiTinh = 'Đã giao'
  }

  // Chỉ cho sửa khi Chờ giao / Đang giao / Đang giao 1 phần
  const coTheSua = ['Chờ giao','Đang giao','Đang giao 1 phần'].includes(trangThaiTinh)
  if (!coTheSua) {
    redirect('/dashboard/don-hang/'+maDon)
  }`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK') }
else console.log('FAIL')

fs.writeFileSync(f, c, 'utf8')
console.log('Done!')
