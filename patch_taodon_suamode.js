const fs = require('fs')
const path = require('path')

const filePath = path.join(process.cwd(), 'components', 'TaoDonHangForm.tsx')
let c = fs.readFileSync(filePath, 'utf8')

// 1. Thêm interface DonHangSua vào sau interface SP
const old1 = `interface Dong { id:string; maSP:string; tenSP:string; soLuong:number; donGia:number; giaBuon?:number; giaNhap?:number; thanhTien:number; ghiChu:string }`
const new1 = `interface Dong { id:string; maSP:string; tenSP:string; soLuong:number; donGia:number; giaBuon?:number; giaNhap?:number; thanhTien:number; ghiChu:string }
interface DonHangSua {
  maDon:string; rowId:string; ngayDat:string; kenhBan:string
  htGiao:string; ngayHenGiao:string; nvBan:string; maNV:string
  ghiChu:string; tienMat:number; ckCoc:number; cpGiaoHang:number
  htCoc:string
  chiTiet:{id:string;maSP:string;tenSP:string;soLuong:number;donGia:number;giaNhap:number;thanhTien:number;ghiChu:string}[]
}`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK 1. interface DonHangSua') }
else console.log('FAIL 1.')

// 2. Thêm prop donHangSua vào component
const old2 = `  user: UserSession
  danhSachKH: KH[]
  danhSachSP: SP[]
  danhSachNV: NV[]
  nextMaDon: string
  khDaChon?: KH | null
}) {`
const new2 = `  user: UserSession
  danhSachKH: KH[]
  danhSachSP: SP[]
  danhSachNV: NV[]
  nextMaDon: string
  khDaChon?: KH | null
  donHangSua?: DonHangSua | null
}) {`
if (c.includes(old2)) { c = c.replace(old2, new2); console.log('OK 2. prop donHangSua') }
else console.log('FAIL 2.')

// 3. Thêm donHangSua vào destructuring
const old3 = `  user, danhSachKH, danhSachSP, danhSachNV, nextMaDon, khDaChon,`
const new3 = `  user, danhSachKH, danhSachSP, danhSachNV, nextMaDon, khDaChon, donHangSua,`
if (c.includes(old3)) { c = c.replace(old3, new3); console.log('OK 3. destructuring') }
else console.log('FAIL 3.')

// 4. Thêm isSuaMode + init state từ donHangSua
const old4 = `  const router = useRouter()
  const today  = new Date().toISOString().split('T')[0]
  const dangLuu = useRef(false) // Ngăn double submit

  const [ngayDat,     setNgayDat]     = useState(today)`
const new4 = `  const router = useRouter()
  const today  = new Date().toISOString().split('T')[0]
  const dangLuu = useRef(false)
  const isSuaMode = !!donHangSua

  const [ngayDat,     setNgayDat]     = useState(donHangSua?.ngayDat || today)`
if (c.includes(old4)) { c = c.replace(old4, new4); console.log('OK 4. isSuaMode') }
else console.log('FAIL 4.')

// 5. Sửa state kenhBan, htGiao, ngayHenGiao, ghiChu
const old5 = `  const [kenhBan,     setKenhBan]     = useState('Trực tiếp')
  const [htGiao,      setHtGiao]      = useState('Giao hàng cho khách')
  const [ngayHenGiao, setNgayHenGiao] = useState('')
  const [ghiChu,      setGhiChu]      = useState('')`
const new5 = `  const [kenhBan,     setKenhBan]     = useState(donHangSua?.kenhBan || 'Trực tiếp')
  const [htGiao,      setHtGiao]      = useState(donHangSua?.htGiao || 'Giao hàng cho khách')
  const [ngayHenGiao, setNgayHenGiao] = useState(donHangSua?.ngayHenGiao || '')
  const [ghiChu,      setGhiChu]      = useState(donHangSua?.ghiChu || '')`
if (c.includes(old5)) { c = c.replace(old5, new5); console.log('OK 5. state kenhBan/htGiao') }
else console.log('FAIL 5.')

// 6. Sửa state searchNV, maNV
const old6 = `  const [searchNV, setSearchNV] = useState('')
  const [maNV,     setMaNV]     = useState('')`
const new6 = `  const [searchNV, setSearchNV] = useState(donHangSua?.nvBan || '')
  const [maNV,     setMaNV]     = useState(donHangSua?.maNV || '')`
if (c.includes(old6)) { c = c.replace(old6, new6); console.log('OK 6. state NV') }
else console.log('FAIL 6.')

// 7. Sửa state dongSP — load từ donHangSua.chiTiet nếu có
const old7 = `  const [dongSP,   setDongSP]   = useState<Dong[]>([{id:'1',maSP:'',tenSP:'',soLuong:1,donGia:0,giaBuon:0,giaNhap:0,thanhTien:0,ghiChu:''}])`
const new7 = `  const [dongSP,   setDongSP]   = useState<Dong[]>(() => {
    if (donHangSua?.chiTiet?.length) {
      return donHangSua.chiTiet.map(ct => ({
        id: ct.id||Date.now().toString(),
        maSP: ct.maSP, tenSP: ct.tenSP,
        soLuong: ct.soLuong, donGia: ct.donGia,
        giaBuon: 0, giaNhap: ct.giaNhap||0,
        thanhTien: ct.thanhTien, ghiChu: ct.ghiChu,
      }))
    }
    return [{id:'1',maSP:'',tenSP:'',soLuong:1,donGia:0,giaBuon:0,giaNhap:0,thanhTien:0,ghiChu:''}]
  })`
if (c.includes(old7)) { c = c.replace(old7, new7); console.log('OK 7. state dongSP') }
else console.log('FAIL 7.')

// 8. Sửa state tienMat, ckCoc, cpGiaoHang
const old8 = `  const [cpGiaoHang, setCpGiaoHang] = useState(0)
  const [giamGia,    setGiamGia]    = useState(0)`
const new8 = `  const [cpGiaoHang, setCpGiaoHang] = useState(donHangSua?.cpGiaoHang || 0)
  const [giamGia,    setGiamGia]    = useState(0)`
if (c.includes(old8)) { c = c.replace(old8, new8); console.log('OK 8. state cpGiaoHang') }
else console.log('FAIL 8.')

const old9 = `  const [tienMat,  setTienMat]  = useState(0)
  const [ckCoc,    setCkCoc]    = useState(0)`
const new9 = `  const [tienMat,  setTienMat]  = useState(donHangSua?.tienMat || 0)
  const [ckCoc,    setCkCoc]    = useState(donHangSua?.ckCoc || 0)`
if (c.includes(old9)) { c = c.replace(old9, new9); console.log('OK 9. state tienMat/ckCoc') }
else console.log('FAIL 9.')

// 10. Sửa hàm taoDon để hỗ trợ mode sửa
const old10 = `  async function taoDon(): Promise<string|null> {
    setError('')
    let htCoc=''
    if(tienMat>0&&ckCoc>0) htCoc='TM '+tienMat.toLocaleString()+'đ + CK '+ckCoc.toLocaleString()+'đ'
    else if(tienMat>0) htCoc='Tiền mặt'
    else if(ckCoc>0)   htCoc='Chuyển khoản'

    try {
      const res = await fetch('/api/don-hang',{`
const new10 = `  async function taoDon(): Promise<string|null> {
    setError('')
    let htCoc=''
    if(tienMat>0&&ckCoc>0) htCoc='TM '+tienMat.toLocaleString()+'đ + CK '+ckCoc.toLocaleString()+'đ'
    else if(tienMat>0) htCoc='Tiền mặt'
    else if(ckCoc>0)   htCoc='Chuyển khoản'

    // ── MODE SỬA ĐƠN ──
    if (isSuaMode && donHangSua) {
      try {
        // 1. Cập nhật đơn hàng
        await fetch('/api/don-hang', {
          method:'PATCH', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            id: donHangSua.rowId,
            'Ngày bán': ngayDat, 'Ngày đặt': ngayDat,
            'Kênh bán': kenhBan,
            'Hình thức giao hàng': htGiao,
            'Ngày hẹn giao': ngayHenGiao||null,
            'Mã NV': maNV||'', 'Nhân viên bán': searchNV,
            'Tổng tiền đơn': tongTien - soTienGiam,
            'Đặt cọc': datCocTong,
            'Hình thức cọc': htCoc,
            'CP giao hàng': cpGiaoHang,
            'Còn phải thu': conPhaiThu,
            'Ghi chú': ghiChu,
          }),
        })
        // 2. Đánh dấu SP cũ = Huỷ (sẽ tạo lại mới)
        for (const ct of donHangSua.chiTiet) {
          if (ct.id && !ct.id.startsWith('new-')) {
            await fetch('/api/chi-tiet-don', {
              method:'PATCH', headers:{'Content-Type':'application/json'},
              body: JSON.stringify({id: ct.id, 'Trạng thái SP': 'Huỷ'}),
            })
          }
        }
        // 3. Tạo lại SP mới theo danh sách hiện tại
        for (const d of dongSP.filter((x:any)=>(x.maSP||x.tenSP?.trim()))) {
          await fetch('/api/chi-tiet-don', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              'Mã đơn hàng': donHangSua.maDon,
              'Mã SP': d.maSP,
              'Tên SP (ghi nhanh)': d.tenSP,
              'Số lượng': d.soLuong,
              'Đơn giá': d.donGia,
              'Giá nhập': d.giaNhap||0,
              'Thành tiền': d.thanhTien,
              'Ghi chú SP': d.ghiChu,
            }),
          })
        }
        return donHangSua.maDon
      } catch(err:any) {
        setError(err.message||'Lỗi khi lưu')
        return null
      }
    }

    // ── MODE TẠO MỚI ──
    try {
      const res = await fetch('/api/don-hang',{`
if (c.includes(old10)) { c = c.replace(old10, new10); console.log('OK 10. taoDon sửa mode') }
else console.log('FAIL 10.')

// 11. Sửa tiêu đề form + nút quay lại khi ở mode sửa
const old11 = `      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'18px'}}>
        <div>
          <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'21px',fontWeight:700,margin:0}}>➕ Tạo đơn hàng mới</h1>
          <p style={{color:'var(--text-secondary)',fontSize:'12px',margin:'2px 0 0'}}>Mã đơn sẽ được hệ thống tự tạo</p>
        </div>
        <button onClick={()=>router.back()} className="btn btn-ghost btn-sm">← Quay lại</button>
      </div>`
const new11 = `      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'18px'}}>
        <div>
          <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'21px',fontWeight:700,margin:0}}>
            {isSuaMode ? '✏️ Sửa đơn hàng' : '➕ Tạo đơn hàng mới'}
          </h1>
          <p style={{color:'var(--text-secondary)',fontSize:'12px',margin:'2px 0 0'}}>
            {isSuaMode ? 'Mã đơn: '+donHangSua?.maDon : 'Mã đơn sẽ được hệ thống tự tạo'}
          </p>
        </div>
        <button onClick={()=>isSuaMode?router.push('/dashboard/don-hang/'+donHangSua?.maDon):router.back()} className="btn btn-ghost btn-sm">← Quay lại</button>
      </div>`
if (c.includes(old11)) { c = c.replace(old11, new11); console.log('OK 11. tiêu đề') }
else console.log('FAIL 11.')

// 12. Sửa nút Lưu đơn
const old12 = `            {loadingLuu?'⏳ Đang lưu...':'✅ Lưu đơn hàng'}`
const new12 = `            {loadingLuu?'⏳ Đang lưu...':(isSuaMode?'💾 Lưu chỉnh sửa':'✅ Lưu đơn hàng')}`
if (c.includes(old12)) { c = c.replace(old12, new12); console.log('OK 12. nút lưu') }
else console.log('FAIL 12.')

// 13. Sau khi lưu sửa → redirect về trang chi tiết đơn
const old13 = `  async function luuDon() {
    if (!validate()) return
    if (dangLuu.current) return // Ngăn double submit
    dangLuu.current = true
    setLoadingLuu(true)
    const ma = await taoDon()
    setLoadingLuu(false)
    dangLuu.current = false
    if (ma) { router.push('/dashboard/don-hang'); router.refresh() }
  }`
const new13 = `  async function luuDon() {
    if (!validate()) return
    if (dangLuu.current) return
    dangLuu.current = true
    setLoadingLuu(true)
    const ma = await taoDon()
    setLoadingLuu(false)
    dangLuu.current = false
    if (ma) {
      if (isSuaMode) { router.push('/dashboard/don-hang/'+ma); router.refresh() }
      else { router.push('/dashboard/don-hang'); router.refresh() }
    }
  }`
if (c.includes(old13)) { c = c.replace(old13, new13); console.log('OK 13. redirect sau lưu') }
else console.log('FAIL 13.')

// 14. searchSP init từ donHangSua
const old14 = `  const [searchSP, setSearchSP] = useState<Record<string,string>>({})`
const new14 = `  const [searchSP, setSearchSP] = useState<Record<string,string>>(() => {
    if (donHangSua?.chiTiet?.length) {
      const m: Record<string,string> = {}
      donHangSua.chiTiet.forEach(ct => { m[ct.id||''] = ct.tenSP })
      return m
    }
    return {}
  })`
if (c.includes(old14)) { c = c.replace(old14, new14); console.log('OK 14. searchSP init') }
else console.log('FAIL 14.')

fs.writeFileSync(filePath, c, 'utf8')
console.log('Done! TaoDonHangForm.tsx saved.')
