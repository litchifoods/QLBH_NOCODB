'use client'
import { useState, useMemo } from 'react'
import { UserSession } from '@/lib/auth'

function Tt({label,tip,color}:{label:string,tip:string,color?:string}){
  return (
    <span className="tt-wrap">
      <span style={{fontSize:'11px',color:color||'#6B7280'}}>{label}</span>
      <span style={{fontSize:'10px',color:'#9CA3AF',marginLeft:'2px'}}>ⓘ</span>
      <span className="tt">{tip}</span>
    </span>
  )
}
function fVND(n:any){return Number(n||0).toLocaleString('vi-VN')}
function fDate(s:string){
  if(!s)return'—'
  try{const d=new Date(s);return`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`}
  catch{return s}
}
function getLocalDate(){
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function getLocalMonth(){
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`
}
function inRange(dateStr:string, tuNgay:string, denNgay:string){
  const d=(dateStr||'').split('T')[0]
  return d>=tuNgay&&d<=denNgay
}

export default function BaoCaoClient({
  donHangList, doiSoatList, chiTraNVList, thanhToanNCCList,
  chiPhiList, baoCaoList, chiTietDonList, nhapKhoList,
  tamUngNVList=[], thuongKhacNVList=[],
  soDuTienMat=0, soDuNganHang=0, user
}:{
  donHangList:any[]; doiSoatList:any[]; chiTraNVList:any[];
  thanhToanNCCList:any[]; chiPhiList:any[]; baoCaoList:any[]; chiTietDonList:any[]; nhapKhoList:any[];
  tamUngNVList?:any[]; thuongKhacNVList?:any[];
  soDuTienMat?:number; soDuNganHang?:number; user:UserSession
}) {
  const isOwner = user.vaiTro === 'Chủ cửa hàng'
  const [tuNgay, setTuNgay] = useState(getLocalMonth())
  const [denNgay, setDenNgay] = useState(getLocalDate())
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgOk, setMsgOk] = useState(true)
  const [showChot, setShowChot] = useState(false)
  const [filterKenh, setFilterKenh] = useState('Tất cả')
  const [ghiChuChot, setGhiChuChot] = useState('')
  const [trangLS, setTrangLS] = useState(1)
  const SO_DONG_LS = 10

  function showMsg(t:string,ok=true){setMsg(t);setMsgOk(ok);setTimeout(()=>setMsg(''),5000)}

  // ── TÍNH TOÁN ĐỘNG ──
  const stats = useMemo(()=>{
    // Đơn hàng — lọc theo kênh bán
    const donTrongKy = donHangList.filter(d=>{
      if(!inRange(d['Ngày bán']||'',tuNgay,denNgay)) return false
      if(filterKenh==='Trực tiếp') return d['Kênh bán']==='Trực tiếp'
      if(filterKenh==='Online') return d['Kênh bán']!=='Trực tiếp'
      return true
    })
    const donKhongHuy = donTrongKy.filter(d=>d['Trạng thái']!=='Huỷ'&&d['Trạng thái']!=='Hủy')
    const donHoanThanh = donTrongKy.filter(d=>['Hoàn thành','Đã giao','Đã thu chưa đối soát','Đang giao'].includes(d['Trạng thái']))
    const donHuy = donTrongKy.filter(d=>d['Trạng thái']==='Huỷ'||d['Trạng thái']==='Hủy')
    // Doanh thu = tổng tiền đơn không hủy
    const tongDT = donKhongHuy.reduce((s,d)=>s+Number(d['Tổng tiền đơn']||0),0)
    const dtTrucTiep = donKhongHuy.filter(d=>d['Kênh bán']==='Trực tiếp').reduce((s,d)=>s+Number(d['Tổng tiền đơn']||0),0)
    const dtOnline = tongDT - dtTrucTiep
    // KH còn nợ = tổng Còn phải thu các đơn không hủy
    const khConNo = donKhongHuy.reduce((s,d)=>s+Number(d['Còn phải thu']||0),0)
    // Đã thu = Tổng tiền - Còn phải thu
    const tongDaThu = tongDT - khConNo
    // Phân loại tiền mặt/CK từ đối soát
    const daThuDS = doiSoatList.filter(ds=>inRange(ds['Ngày đối soát']||'',tuNgay,denNgay)&&ds['Tình trạng đối soát']==='Đã đối soát')
    const daThuTM = daThuDS.reduce((s,ds)=>s+Number(ds['Thu tiền mặt']||0),0)
    const daThuCK = daThuDS.reduce((s,ds)=>s+Number(ds['Thu chuyển khoản']||0),0)
    // Thu bù CP từ đơn hủy KH chịu CP (Kết quả = Huỷ — khách trả CP)
    const dsThuBuCP = doiSoatList.filter(ds=>
      inRange(ds['Ngày đối soát']||'',tuNgay,denNgay) &&
      ds['Tình trạng đối soát']==='Đã đối soát' &&
      (ds['Kết quả']||'').includes('khách trả CP')
    )
    const thuBuCP = dsThuBuCP.reduce((s:any,ds:any)=>s+Number(ds['Đã thu được']||0),0)
    // Cộng thêm Thu bù CP từ bảng 14 (khi hủy đơn có KH chịu CP)
    const thuBuCPBang14 = chiPhiList.filter((cp:any)=>
      inRange(cp['Ngày phát sinh']||'',tuNgay,denNgay) &&
      cp['Loại giao dịch']==='Thu' &&
      (cp['Loại thu']||'').includes('CP đổi trả') &&
      cp['Trạng thái']==='Đã thanh toán'
    ).reduce((s:any,cp:any)=>s+Number(cp['Số tiền']||0),0)
    const thuBuCPTong = thuBuCP + thuBuCPBang14

    // Tỷ lệ kênh — dùng để phân bổ chi phí chung khi lọc kênh cụ thể
    const tongDTTatCa = donHangList.filter(d=>inRange(d['Ngày bán']||'',tuNgay,denNgay)&&d['Trạng thái']!=='Huỷ'&&d['Trạng thái']!=='Hủy').reduce((s:number,d:any)=>s+Number(d['Tổng tiền đơn']||0),0)
    const tyLeKenh = (filterKenh!=='Tất cả' && tongDTTatCa>0) ? tongDT/tongDTTatCa : 1

    // Chi lương NV (bảng 13) — lọc theo Tháng vì Ngày thanh toán thường trống
    const luongNV = chiTraNVList.filter(ct=>{
      // Ưu tiên Ngày thanh toán, fallback về Tháng
      const ngayTT=(ct['Ngày thanh toán']||'').split('T')[0]
      if(ngayTT) return ngayTT>=tuNgay&&ngayTT<=denNgay
      const thang=ct['Tháng']||''
      return thang>=tuNgay.substring(0,7)&&thang<=denNgay.substring(0,7)
    })
    const tongLuongRaw = luongNV.reduce((s,ct)=>s+Number(ct['Tổng chi trả']||0),0)
    const tongLuong = Math.round(tongLuongRaw * tyLeKenh)
    const luongTM = Math.round(luongNV.filter((ct:any)=>ct['Hình thức TT']==='Tiền mặt').reduce((s:number,ct:any)=>s+Number(ct['Tổng chi trả']||0),0) * tyLeKenh)
    const luongCK = Math.round(luongNV.filter((ct:any)=>ct['Hình thức TT']==='Chuyển khoản').reduce((s:number,ct:any)=>s+Number(ct['Tổng chi trả']||0),0) * tyLeKenh)

    // CP giao hàng ĐT (bảng 9) — lọc theo Ngày đối soát + kênh bán
    const maDonTrongKy = new Set(donKhongHuy.map((d:any)=>d['Mã đơn hàng']))
    const cpGiao = doiSoatList.filter(ds=>{
      const ngay=(ds['Ngày đối soát']||ds['Ngày chi trả']||'').split('T')[0]
      if(ngay<tuNgay||ngay>denNgay||ds['Tình trạng đối soát']!=='Đã đối soát') return false
      // Nếu lọc kênh cụ thể → chỉ tính CP giao của đơn thuộc kênh đó
      if(filterKenh!=='Tất cả' && ds['Mã đơn hàng'] && !maDonTrongKy.has(ds['Mã đơn hàng'])) return false
      return true
    })
    const tongCPGiao = cpGiao.filter((ds:any)=>ds['Đã chi trả']).reduce((s,ds)=>s+Number(ds['Chi phí VC']||0)+Number(ds['Chi phí lắp đặt']||0)+Number(ds['Thưởng chuyến']||0),0)
    const cpGiaoTM = cpGiao.filter(ds=>ds['Hình thức thanh toán']==='Tiền mặt'&&ds['Đã chi trả']).reduce((s,ds)=>s+Number(ds['Chi phí VC']||0)+Number(ds['Chi phí lắp đặt']||0)+Number(ds['Thưởng chuyến']||0),0)
    const cpGiaoCK = tongCPGiao - cpGiaoTM

    // Thanh toán NCC (bảng 12)
    const ttNCC = thanhToanNCCList.filter(tt=>inRange(tt['Ngày trả tiền NCC']||'',tuNgay,denNgay))
    const tongTTNCC = ttNCC.reduce((s,tt)=>s+Number(tt['Số tiền trả']||0),0)
    const ttNCCTM = ttNCC.filter(tt=>tt['Hình thức']==='Tiền mặt').reduce((s,tt)=>s+Number(tt['Số tiền trả']||0),0)
    const ttNCCCK = tongTTNCC - ttNCCTM

    // Chi phí vận hành (bảng 14)
    const cpVH = chiPhiList.filter(cp=>inRange(cp['Ngày phát sinh']||'',tuNgay,denNgay)&&cp['Trạng thái']==='Đã thanh toán'&&(cp['Loại giao dịch']||'Chi')==='Chi')
    const tongCPVHRaw = cpVH.reduce((s:number,cp:any)=>s+Number(cp['Số tiền']||0),0)
    const tongCPVH = Math.round(tongCPVHRaw * tyLeKenh)
    const cpVHTM = Math.round(cpVH.filter((cp:any)=>cp['Hình thức thanh toán']==='Tiền mặt').reduce((s:number,cp:any)=>s+Number(cp['Số tiền']||0),0) * tyLeKenh)
    const cpVHCK = tongCPVH - cpVHTM

    // Tạm ứng NV (bảng 13b)
    const tamUngTM = (tamUngNVList as any[]).filter(tu=>inRange(tu['Ngày tạm ứng']||'',tuNgay,denNgay)&&tu['Hình thức']!=='Chuyển khoản').reduce((s:number,tu:any)=>s+Number(tu['Số tiền']||0),0)
    const tamUngCK = (tamUngNVList as any[]).filter(tu=>inRange(tu['Ngày tạm ứng']||'',tuNgay,denNgay)&&tu['Hình thức']==='Chuyển khoản').reduce((s:number,tu:any)=>s+Number(tu['Số tiền']||0),0)
    const tongTamUng = tamUngTM + tamUngCK
    // Thưởng khác NV (bảng 13c)
    const thuongKhacTM = (thuongKhacNVList as any[]).filter(tk=>inRange(tk['Ngày thưởng']||'',tuNgay,denNgay)&&tk['Hình thức']!=='Chuyển khoản').reduce((s:number,tk:any)=>s+Number(tk['Số tiền']||0),0)
    const thuongKhacCK = (thuongKhacNVList as any[]).filter(tk=>inRange(tk['Ngày thưởng']||'',tuNgay,denNgay)&&tk['Hình thức']==='Chuyển khoản').reduce((s:number,tk:any)=>s+Number(tk['Số tiền']||0),0)
    const tongThuongKhac = thuongKhacTM + thuongKhacCK
    // Giá vốn bình quân từ bảng 11 (nhập kho)
    const nhapTheoSP:Record<string,{tongTien:number,tongSL:number}>={}
    nhapKhoList.forEach((nk:any)=>{
      const maSP=nk['Mã SP']||''; if(!maSP) return
      if(!nhapTheoSP[maSP]) nhapTheoSP[maSP]={tongTien:0,tongSL:0}
      const sl=Number(nk['Số lượng thực nhận']||0)
      const giaNhap=Number(nk['Giá nhập thực tế']||0)
      const cpVC=Number(nk['CP vận chuyển về kho']||0)
      // Phân bổ CP vận chuyển vào giá vốn theo tỷ lệ số lượng
      const tongTienLo=sl*giaNhap
      const tongTienLoTatCa=nhapKhoList.filter((x:any)=>x['Mã phiếu nhập']===nk['Mã phiếu nhập']).reduce((s:number,x:any)=>s+Number(x['Số lượng thực nhận']||0)*Number(x['Giá nhập thực tế']||0),0)
      const cpVCPhanBo=tongTienLoTatCa>0?Math.round(cpVC*tongTienLo/tongTienLoTatCa):0
      nhapTheoSP[maSP].tongTien+=sl*giaNhap+cpVCPhanBo
      nhapTheoSP[maSP].tongSL+=Number(nk['Số lượng thực nhận']||0)
    })
    const giaBinhQuan:Record<string,number>={}
    Object.keys(nhapTheoSP).forEach(maSP=>{
      const {tongTien,tongSL}=nhapTheoSP[maSP]
      giaBinhQuan[maSP]=tongSL>0?Math.round(tongTien/tongSL):0
    })
    // maDonTrongKy đã khai báo ở trên
    const giaVon=chiTietDonList
      .filter((ct:any)=>maDonTrongKy.has(ct['Mã đơn hàng'])&&ct['Trạng thái SP']!=='Huỷ')
      .reduce((s:number,ct:any)=>{
        const maSP=ct['Mã SP']||''
        const giaBQ=giaBinhQuan[maSP]||Number(ct['Giá nhập']||0)
        return s+giaBQ*Number(ct['Số lượng']||1)
      },0)

    // Thu khác ngoài bán hàng (bảng 14)
    const thuKhac = chiPhiList.filter((cp)=>inRange(cp["Ngày phát sinh"]||"",tuNgay,denNgay)&&cp["Loại giao dịch"]==="Thu"&&cp["Trạng thái"]==="Đã thanh toán").reduce((s,cp)=>s+Number(cp["Số tiền"]||0),0)

    // Tổng chi
    const tongChiVH = tongLuong + tongCPGiao + tongTTNCC + tongCPVH
    const tongChi = tongChiVH

    // Lợi nhuận gộp
    const loiNhuan = tongDT + thuKhac - giaVon - tongChi

    // Sổ quỹ — tính từ tổng thu/chi theo hình thức TM/CK (đồng bộ với Sổ quỹ chi tiết)
    // Cọc TM/CK từ đơn hàng trong kỳ
    const donTrongKyTatCa = donHangList.filter((d:any)=>inRange(d['Ngày bán']||'',tuNgay,denNgay))
    const cocTM = donTrongKyTatCa.reduce((s:number,d:any)=>s+Number(d['Cọc tiền mặt']||0),0)
    const cocCK = donTrongKyTatCa.reduce((s:number,d:any)=>s+Number(d['Cọc chuyển khoản']||0),0)
    // Thu TM/CK từ KH (dựa trên đối soát)
    const thuTM = daThuDS.reduce((s,ds)=>s+Number(ds['Thu tiền mặt']||0),0)
    const thuCK = daThuDS.reduce((s,ds)=>s+Number(ds['Thu chuyển khoản']||0),0)
    // Chi TM/CK
    // CP vận chuyển nhập kho (Đã trả, theo ngày trả)
    const cpvcNhapTM = (nhapKhoList as any[]).filter(nk=>Number(nk['CP vận chuyển về kho']||0)>0&&nk['Trạng thái CP VC']==='Đã trả'&&inRange(nk['Ngày trả CP VC']||nk['Ngày nhập']||'',tuNgay,denNgay)&&nk['Hình thức TT CP VC']!=='Chuyển khoản').reduce((s:number,nk:any)=>s+Number(nk['CP vận chuyển về kho']||0),0)
    const cpvcNhapCK = (nhapKhoList as any[]).filter(nk=>Number(nk['CP vận chuyển về kho']||0)>0&&nk['Trạng thái CP VC']==='Đã trả'&&inRange(nk['Ngày trả CP VC']||nk['Ngày nhập']||'',tuNgay,denNgay)&&nk['Hình thức TT CP VC']==='Chuyển khoản').reduce((s:number,nk:any)=>s+Number(nk['CP vận chuyển về kho']||0),0)
    const tongCPVCNhap = cpvcNhapTM + cpvcNhapCK
    const chiTM = luongTM + cpGiaoTM + ttNCCTM + cpVHTM + tamUngTM + thuongKhacTM + cpvcNhapTM
    const chiCK = luongCK + cpGiaoCK + ttNCCCK + cpVHCK + tamUngCK + thuongKhacCK + cpvcNhapCK
    // Thu từ bảng 14 (Khoản thu, Thu bù CP...) theo hình thức TM/CK
    const thuB14TM = chiPhiList.filter((cp:any)=>inRange(cp['Ngày phát sinh']||'',tuNgay,denNgay)&&cp['Loại giao dịch']==='Thu'&&cp['Trạng thái']==='Đã thanh toán'&&(cp['Hình thức thanh toán']||'').includes('Tiền mặt')).reduce((s:number,cp:any)=>s+Number(cp['Số tiền']||0),0)
    const thuB14CK = chiPhiList.filter((cp:any)=>inRange(cp['Ngày phát sinh']||'',tuNgay,denNgay)&&cp['Loại giao dịch']==='Thu'&&cp['Trạng thái']==='Đã thanh toán'&&(cp['Hình thức thanh toán']||'').includes('Chuyển khoản')).reduce((s:number,cp:any)=>s+Number(cp['Số tiền']||0),0)
    const quyTM = soDuTienMat + cocTM + thuTM + thuB14TM - chiTM
    const soDuNH = soDuNganHang + cocCK + thuCK + thuB14CK - chiCK

    return {
      // DT
      tongDT, dtTrucTiep, dtOnline, tongDaThu, khConNo, thuBuCP: thuBuCPTong, thuKhac,
      soDon:donTrongKy.length, donHoanThanh:donHoanThanh.length, donHuy:donHuy.length,
      // Chi
      tongLuong, tongCPGiao, tongTTNCC, tongCPVH, tongChi,
      tongTamUng, tongThuongKhac, tongCPVCNhap,
      // Giá vốn
      giaVon,
      // Lợi nhuận
      loiNhuan,
      // Sổ quỹ
      quyTM, soDuNH,
    }
  },[donHangList,doiSoatList,chiTraNVList,thanhToanNCCList,chiPhiList,chiTietDonList,nhapKhoList,tamUngNVList,thuongKhacNVList,tuNgay,denNgay,filterKenh])

  // Biểu đồ cột 6 tháng
  const bieu6Thang = useMemo(()=>{
    const now = new Date()
    const result = []
    for(let i=5;i>=0;i--){
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1)
      const thang = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      const cuoi = new Date(d.getFullYear(), d.getMonth()+1, 0).toISOString().split('T')[0]
      const dau = `${thang}-01`
      const dt = donHangList.filter(d2=>(d2['Ngày bán']||'').startsWith(thang)&&(d2['Trạng thái']==='Hoàn thành'||d2['Trạng thái']==='Đã giao')).reduce((s,d2)=>s+Number(d2['Tổng tiền đơn']||0),0)
      const chi = chiPhiList.filter(c=>inRange(c['Ngày phát sinh']||'',dau,cuoi)).reduce((s,c)=>s+Number(c['Số tiền']||0),0)
      result.push({thang:`T${d.getMonth()+1}`,dt,chi})
    }
    return result
  },[donHangList,chiPhiList])

  const maxBieu = Math.max(...bieu6Thang.map(b=>Math.max(b.dt,b.chi)),1)

  async function chotBaoCao(){
    setLoading(true)
    try {
      const thang = tuNgay.substring(0,7)
      const [nam, thangSo] = thang.split('-')
      const quy = Math.ceil(Number(thangSo)/3)
      const body = {
        thang, nam, quy,
        tongDT: stats.tongDT, dtTrucTiep: stats.dtTrucTiep, dtOnline: stats.dtOnline,
        daThu: stats.tongDaThu, khConNo: stats.khConNo,
        tongDon: stats.soDon, donHoanThanh: stats.donHoanThanh, donHuy: stats.donHuy,
        tongChi: stats.tongChi, luongNV: stats.tongLuong, cpGiao: stats.tongCPGiao,
        ttNCC: stats.tongTTNCC, cpVH: stats.tongCPVH,
        loiNhuan: stats.loiNhuan, ghiChu: ghiChuChot,
      }
      const res = await fetch('/api/bao-cao',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      if(!res.ok) throw new Error((await res.json()).message)
      showMsg('✅ Đã chốt báo cáo tháng '+thang)
      setShowChot(false);setGhiChuChot('')
    } catch(e:any){showMsg('❌ '+(e.message||'Lỗi'),false)}
    finally{setLoading(false)}
  }

  const tongTrangLS = Math.max(1,Math.ceil(baoCaoList.length/SO_DONG_LS))
  const baoCaoTrang = baoCaoList.slice((trangLS-1)*SO_DONG_LS, trangLS*SO_DONG_LS)
  const phanTramLN = stats.tongDT>0?Math.round(stats.loiNhuan/stats.tongDT*100):0

  return (
    <div style={{padding:'20px'}}>
      <style>{`
        .ov{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;}
        .bc-card{background:white;border-radius:10px;border:1px solid var(--border);padding:14px 16px;}
        .tt-wrap{position:relative;display:inline-flex;align-items:center;gap:4px;cursor:help;}
        .tt-wrap .tt{display:none;position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:#1F2937;color:white;font-size:11px;padding:7px 10px;border-radius:7px;white-space:pre-line;min-width:220px;max-width:300px;line-height:1.6;z-index:999;box-shadow:0 4px 12px rgba(0,0,0,.25);pointer-events:none;}
        .tt-wrap:hover .tt{display:block;}
        .tt-wrap .tt::after{content:'';position:absolute;top:100%;left:50%;transform:translateX(-50%);border:5px solid transparent;border-top-color:#1F2937;}
      `}</style>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'16px',flexWrap:'wrap',gap:'10px'}}>
        <div>
          <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>📊 Báo cáo tài chính</h1>
          <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'4px 0 0'}}>{tuNgay} → {denNgay}</p>
        </div>
        <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
          <span style={{fontSize:'12px',color:'var(--text-secondary)',fontWeight:600}}>Từ:</span>
          <input type="date" value={tuNgay} onChange={e=>setTuNgay(e.target.value)} style={{padding:'6px 10px',borderRadius:'6px',border:'1px solid var(--border)',fontSize:'12px'}}/>
          <span style={{fontSize:'12px',color:'var(--text-secondary)',fontWeight:600}}>Đến:</span>
          <input type="date" value={denNgay} onChange={e=>setDenNgay(e.target.value)} style={{padding:'6px 10px',borderRadius:'6px',border:'1px solid var(--border)',fontSize:'12px'}}/>
          <button onClick={()=>{setTuNgay(getLocalMonth());setDenNgay(getLocalDate())}}
            style={{padding:'6px 12px',borderRadius:'6px',border:'1px solid var(--border)',background:'white',fontSize:'12px',cursor:'pointer'}}>📅 Tháng này</button>
          <button onClick={()=>{const n=new Date();const q=Math.ceil((n.getMonth()+1)/3);const m1=(q-1)*3;setTuNgay(`${n.getFullYear()}-${String(m1+1).padStart(2,'0')}-01`);setDenNgay(new Date(n.getFullYear(),m1+3,0).toISOString().split('T')[0])}}
            style={{padding:'6px 12px',borderRadius:'6px',border:'1px solid var(--border)',background:'white',fontSize:'12px',cursor:'pointer'}}>📅 Quý này</button>
          <button onClick={()=>{const n=new Date();setTuNgay(`${n.getFullYear()}-01-01`);setDenNgay(`${n.getFullYear()}-12-31`)}}
            style={{padding:'6px 12px',borderRadius:'6px',border:'1px solid var(--border)',background:'white',fontSize:'12px',cursor:'pointer'}}>📅 Năm này</button>
          {isOwner&&<button onClick={()=>setShowChot(true)}
            style={{padding:'8px 16px',borderRadius:'8px',border:'none',background:'#7C3AED',color:'white',fontWeight:700,fontSize:'13px',cursor:'pointer'}}>
            📌 Chốt báo cáo
          </button>}
        </div>
      </div>

      {msg&&<div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'14px',fontSize:'13px',background:msgOk?'#D1FAE5':'#FEE2E2',color:msgOk?'#065F46':'#991B1B'}}>{msg}</div>}

      {/* Bộ lọc kênh bán */}
      <div className="bc-card" style={{marginBottom:'16px',padding:'12px 16px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <span style={{fontSize:'12px',fontWeight:700,color:'var(--text-secondary)',whiteSpace:'nowrap'}}>🏪 Kênh bán:</span>
          {['Tất cả','Trực tiếp','Online'].map((k:any)=>{
            const isActive=filterKenh===k
            const bgMap:any={'Tất cả':'#EFF6FF','Trực tiếp':'#F0FDF4','Online':'#F5F3FF'}
            const cMap:any={'Tất cả':'#1E40AF','Trực tiếp':'#16A34A','Online':'#7C3AED'}
            const iconMap:any={'Tất cả':'📊','Trực tiếp':'🏪','Online':'🌐'}
            const donKenh=donHangList.filter((d:any)=>inRange(d['Ngày bán']||'',tuNgay,denNgay)&&d['Trạng thái']!=='Huỷ'&&d['Trạng thái']!=='Hủy'&&(k==='Tất cả'||d['Kênh bán']===k))
            const dtKenh=donKenh.reduce((s:number,d:any)=>s+Number(d['Tổng tiền đơn']||0),0)
            return (<button key={k} onClick={()=>setFilterKenh(k)} style={{padding:'8px 16px',borderRadius:'20px',border:'2px solid '+(isActive?cMap[k]:'var(--border)'),background:isActive?bgMap[k]:'white',color:isActive?cMap[k]:'var(--text-secondary)',fontWeight:isActive?700:400,cursor:'pointer',fontSize:'13px',display:'flex',flexDirection:'column',alignItems:'center',gap:'2px',minWidth:'100px'}}><span style={{fontWeight:700}}>{iconMap[k]} {k}</span><span style={{fontSize:'11px',opacity:0.85}}>{donKenh.length} đơn · {fVND(Math.round(dtKenh/1000))}K</span></button>)
          })}
          {filterKenh!=='Tất cả'&&(<div style={{marginLeft:'auto',padding:'6px 12px',borderRadius:'8px',background:'#EFF6FF',border:'1px solid #BFDBFE',fontSize:'12px',color:'#1E40AF',fontWeight:500}}>📊 Kênh: <strong>{filterKenh}</strong> — chi phí chung phân bổ theo tỷ lệ doanh thu</div>)}
        </div>
      </div>

      {/* DOANH THU */}
      <div style={{marginBottom:'12px'}}>
        <div style={{fontSize:'11px',fontWeight:700,color:'var(--text-secondary)',marginBottom:'8px',letterSpacing:'0.05em'}}>DOANH THU</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px',marginBottom:'8px'}}>
          <div className="bc-card" style={{borderLeft:'4px solid #16A34A'}}>
            <Tt label="🛒 Doanh thu bán hàng" tip={"Tổng giá trị đơn hàng trong kỳ\n(không tính đơn hủy)\n\nBao gồm cả phần khách chưa trả"} />
            <div style={{fontSize:'18px',fontWeight:800,color:'#16A34A',marginTop:'2px'}}>{fVND(stats.tongDT)}đ</div>
            <div style={{fontSize:'11px',color:'#6B7280',marginTop:'2px'}}>
              {filterKenh==='Tất cả'?<>Trực tiếp: {fVND(stats.dtTrucTiep)}đ · Online: {fVND(stats.dtOnline)}đ</>:<>Kênh: <strong>{filterKenh}</strong> · {stats.soDon} đơn</>}
            </div>
          </div>
          <div className="bc-card" style={{borderLeft:'4px solid #0284C7'}}>
            <Tt label="💰 Thu khác" tip={"Các khoản thu ngoài bán hàng (bảng 14)\nVD: Thu phí lắp đặt, Thu bù CP đổi trả,\nThu nợ KH, khoản thu bất thường...\n\nĐã cộng vào Tổng thu & Lợi nhuận"} />
            <div style={{fontSize:'18px',fontWeight:800,color:'#0284C7',marginTop:'2px'}}>{fVND(stats.thuKhac)}đ</div>
            <div style={{fontSize:'11px',color:'#6B7280',marginTop:'2px'}}>Từ tab Khoản thu (bảng 14)</div>
          </div>
          <div className="bc-card" style={{borderLeft:'4px solid #D97706'}}>
            <Tt label="📦 Khách còn nợ" color="#D97706" tip={"Tổng tiền KH chưa thanh toán trong kỳ\n(cột Còn phải thu của đơn hàng)\n\nSố âm = cửa hàng cần hoàn tiền lại KH"} />
            <div style={{fontSize:'18px',fontWeight:800,color:'#D97706',marginTop:'2px'}}>{fVND(stats.khConNo)}đ</div>
            <div style={{fontSize:'11px',color:'#6B7280',marginTop:'2px'}}>{stats.soDon} đơn trong kỳ · {stats.donHuy} đơn hủy</div>
          </div>
        </div>
        <div className="bc-card" style={{background:'#F0FDF4',borderLeft:'4px solid #16A34A'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <Tt label="💵 Tổng thu" tip={"= Doanh thu bán hàng + Thu khác\n\nĐây là tổng tiền thu về của cửa hàng\ntrong kỳ (trước khi trừ chi phí)"} />
              <div style={{fontSize:'22px',fontWeight:800,color:'#16A34A'}}>{fVND(stats.tongDT+stats.thuKhac)}đ</div>
            </div>
            <div style={{textAlign:'right',fontSize:'12px',color:'#6B7280',lineHeight:'1.8'}}>
              <div>{fVND(stats.tongDT)}đ bán hàng</div>
              {stats.thuKhac>0&&<div style={{color:'#0284C7'}}>+ {fVND(stats.thuKhac)}đ thu khác</div>}
            </div>
          </div>
        </div>
      </div>

      {/* CHI PHÍ */}
      <div style={{marginBottom:'12px'}}>
        <div style={{fontSize:'11px',fontWeight:700,color:'var(--text-secondary)',marginBottom:'8px',letterSpacing:'0.05em'}}>CHI PHÍ</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'8px',marginBottom:'8px'}}>
          {[
            {icon:'📦',label:'Giá vốn',val:stats.giaVon,c:'#DC2626',tip:'Giá vốn = Số lượng bán × Giá nhập bình quân\n(tính từ phiếu nhập kho bảng 11)\n\nNếu chưa nhập kho, dùng giá nhập trong đơn'},
            {icon:'👥',label:'Lương & thưởng NV',val:stats.tongLuong,c:'#1E40AF',tip:'Tổng lương + thưởng đã chi trả\ncho nhân viên cửa hàng (bảng 13)\n(chỉ tính dòng Trạng thái = Đã trả)'},
            {icon:'🚚',label:'CP giao hàng',val:stats.tongCPGiao,c:'#7C3AED',tip:'CP vận chuyển + CP lắp đặt + thưởng chuyến\nchi trả cho đối tác ngoài (bảng 9)\n(chỉ tính chuyến đã chi trả trong kỳ)'},
            {icon:'💼',label:'CP vận hành',val:stats.tongCPVH,c:'#D97706',tip:'Điện nước, mặt bằng, văn phòng phẩm,\nxăng xe, tiếp khách, marketing...\n(bảng 14 — chỉ tính Đã thanh toán)'},
            {icon:'🚛',label:'CP VC nhập kho',val:stats.tongCPVCNhap,c:'#0369A1',tip:'Chi phí vận chuyển hàng về kho\n(bảng 11 — chỉ tính Đã trả trong kỳ)\n\nĐã được phân bổ vào giá vốn từng SP\nHiển thị riêng để theo dõi dòng tiền thực tế'},
          ].map(({icon,label,val,c,tip}:any)=>(
            <div key={label} className="bc-card" style={{borderLeft:`4px solid ${c}`}}>
              <Tt label={`${icon} ${label}`} tip={tip||label} color="#6B7280" />
              <div style={{fontSize:'16px',fontWeight:800,color:c,marginTop:'2px'}}>{fVND(val)}đ</div>
            </div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
          <div className="bc-card" style={{background:'#FEF2F2',borderLeft:'4px solid #DC2626'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <Tt label="💸 Tổng chi" tip={"= Giá vốn + Lương NV + CP giao hàng + CP vận hành\n\nTT NCC hiển thị riêng bên cạnh để tham khảo\nvì không tính vào lợi nhuận"} />
                <div style={{fontSize:'20px',fontWeight:800,color:'#DC2626'}}>{fVND(stats.giaVon+stats.tongChi)}đ</div>
              </div>
              <div style={{textAlign:'right',fontSize:'11px',color:'#9CA3AF',lineHeight:'1.8'}}>
                <div>Giá vốn: {fVND(stats.giaVon)}đ</div>
                <div>CP HĐ & GH: {fVND(stats.tongChi)}đ</div>
              </div>
            </div>
          </div>
          <div className="bc-card" style={{borderLeft:'4px solid #B45309',background:'#FFFBEB'}}>
            <Tt label="🏭 TT NCC (tham khảo)" color="#B45309" tip={"Tổng tiền đã thanh toán cho nhà cung cấp\ntrong kỳ (bảng 12 — chỉ tính Đã xác nhận)\n\n⚠️ Không tính vào lợi nhuận vì tiền trả NCC\nlà thanh toán hàng tồn kho — đã được\nphản ánh qua Giá vốn khi bán ra\n\nDùng để theo dõi công nợ & dòng tiền NCC"} />
            <div style={{fontSize:'20px',fontWeight:800,color:'#B45309',marginTop:'2px'}}>{fVND(stats.tongTTNCC)}đ</div>
            <div style={{fontSize:'11px',color:'#92400E',marginTop:'2px'}}>Không ảnh hưởng lợi nhuận</div>
          </div>
        </div>
      </div>

      {/* KẾT QUẢ */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'16px'}}>
        <div className="bc-card" style={{borderLeft:`4px solid ${stats.loiNhuan>=0?'#16A34A':'#DC2626'}`,background:stats.loiNhuan>=0?'#F0FDF4':'#FEF2F2'}}>
          <Tt label="📈 Lợi nhuận" tip={"= Tổng thu − Tổng chi\n= (DT bán hàng + Thu khác)\n  − (Giá vốn + Lương NV + CP giao + CP vận hành)\n\nTT NCC không trừ vào đây vì Giá vốn\nđã phản ánh chi phí hàng hóa rồi"} />
          <div style={{fontSize:'26px',fontWeight:800,color:stats.loiNhuan>=0?'#16A34A':'#DC2626',marginTop:'2px'}}>
            {stats.loiNhuan>=0?'+':''}{fVND(stats.loiNhuan)}đ
          </div>
          <div style={{fontSize:'11px',color:'#6B7280',marginTop:'4px'}}>
            {fVND(stats.tongDT+stats.thuKhac)}đ thu − {fVND(stats.giaVon+stats.tongChi)}đ chi
          </div>
          <div style={{marginTop:'8px'}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',marginBottom:'4px'}}>
              <span style={{color:'#6B7280'}}>Biên lợi nhuận</span>
              <span style={{fontWeight:700,color:phanTramLN>=20?'#16A34A':phanTramLN>=10?'#D97706':'#DC2626'}}>{phanTramLN}%</span>
            </div>
            <div style={{height:'6px',background:'#E5E7EB',borderRadius:'3px',overflow:'hidden'}}>
              <div style={{height:'100%',width:`${Math.min(Math.max(phanTramLN,0),100)}%`,background:phanTramLN>=20?'#16A34A':phanTramLN>=10?'#D97706':'#DC2626',borderRadius:'3px',transition:'width 0.5s'}}></div>
            </div>
          </div>
        </div>
        <div className="bc-card">
          <div style={{fontSize:'11px',fontWeight:700,color:'var(--text-secondary)',marginBottom:'10px',letterSpacing:'0.05em'}}>SỔ QUỸ</div>
          <div style={{display:'flex',gap:'12px'}}>
            <div style={{flex:1,background:'#F0FDF4',borderRadius:'8px',padding:'10px 12px',border:'1px solid #BBF7D0'}}>
              <Tt label="💵 Tiền mặt" tip={"= Cọc TM + Thu TM (đối soát) + Thu khác TM\n  − Chi TM (lương + CP giao + vận hành)\n\nĐối chiếu với Sổ quỹ chi tiết trong Thu Chi"} />
              <div style={{fontSize:'18px',fontWeight:800,color:stats.quyTM>=0?'#16A34A':'#DC2626'}}>{fVND(stats.quyTM)}đ</div>
            </div>
            <div style={{flex:1,background:'#EFF6FF',borderRadius:'8px',padding:'10px 12px',border:'1px solid #BFDBFE'}}>
              <Tt label="🏦 Ngân hàng" tip={"= Cọc CK + Thu CK (đối soát) + Thu khác CK\n  − Chi CK\n\nĐối chiếu với Sổ quỹ chi tiết trong Thu Chi"} />
              <div style={{fontSize:'18px',fontWeight:800,color:stats.soDuNH>=0?'#2563EB':'#DC2626'}}>{fVND(stats.soDuNH)}đ</div>
            </div>
          </div>
          <div style={{fontSize:'10px',color:'#9CA3AF',marginTop:'8px',lineHeight:'1.6'}}>
            <div>Số dư đầu kỳ: TM {fVND(soDuTienMat)}đ · NH {fVND(soDuNganHang)}đ</div>
            * Đối chiếu chi tiết: trang Thu Chi → tab Sổ quỹ
          </div>
        </div>
      </div>


      {/* So sánh cùng kỳ */}
      {baoCaoList.length>0&&(()=>{
        const thangHienTai=tuNgay.substring(0,7)
        const namHienTai=Number(thangHienTai.split('-')[0])
        const thangSo=thangHienTai.split('-')[1]
        const cungKyNamTruoc=`${namHienTai-1}-${thangSo}`
        const cungKyNamTruoc2=`${namHienTai-2}-${thangSo}`
        const bcNT=baoCaoList.find(b=>b['Tháng']===cungKyNamTruoc)
        const bcNT2=baoCaoList.find(b=>b['Tháng']===cungKyNamTruoc2)
        if(!bcNT&&!bcNT2) return null
        function pct(a:number,b:number){if(!b)return null;return Math.round((a-b)/b*100)}
        function renderPct(p:number|null){
          if(p===null) return <span style={{color:'#9CA3AF',fontSize:'11px'}}>—</span>
          return <span style={{color:p>=0?'#16A34A':'#DC2626',fontWeight:700,fontSize:'12px'}}>{p>=0?'↑':'↓'} {Math.abs(p)}%</span>
        }
        const rows=[
          {label:'💰 Doanh thu',cur:stats.tongDT,prev:Number(bcNT?.['Tổng doanh thu']||0),prev2:Number(bcNT2?.['Tổng doanh thu']||0)},
          {label:'💸 Tổng chi phí',cur:stats.tongChi,prev:Number(bcNT?.['Tổng chi phí']||0),prev2:Number(bcNT2?.['Tổng chi phí']||0)},
          {label:'📈 Lợi nhuận',cur:stats.loiNhuan,prev:Number(bcNT?.['Lợi nhuận gộp']||0),prev2:Number(bcNT2?.['Lợi nhuận gộp']||0)},
          {label:'👥 Lương NV',cur:stats.tongLuong,prev:Number(bcNT?.['Lương thưởng NV']||0),prev2:Number(bcNT2?.['Lương thưởng NV']||0)},
          {label:'🚚 CP giao ĐT',cur:stats.tongCPGiao,prev:Number(bcNT?.['CP chuyến giao']||0),prev2:Number(bcNT2?.['CP chuyến giao']||0)},
          {label:'📦 Giá vốn',cur:stats.giaVon,prev:0,prev2:0},
          {label:'🏭 TT NCC',cur:stats.tongTTNCC,prev:Number(bcNT?.['Đã trả NCC tháng này']||0),prev2:Number(bcNT2?.['Đã trả NCC tháng này']||0)},
        ]
        return (
          <div className="bc-card" style={{marginBottom:'16px'}}>
            <div style={{fontSize:'12px',fontWeight:700,color:'var(--text-secondary)',marginBottom:'12px',letterSpacing:'0.05em'}}>SO SÁNH CÙNG KỲ</div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                <thead>
                  <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                    <th style={{textAlign:'left',padding:'8px 10px',fontWeight:700}}>Chỉ số</th>
                    <th style={{textAlign:'right',padding:'8px 10px',fontWeight:700,whiteSpace:'nowrap',color:'var(--primary)'}}>Kỳ này ({thangHienTai})</th>
                    {bcNT&&<th style={{textAlign:'right',padding:'8px 10px',fontWeight:700,whiteSpace:'nowrap'}}>Cùng kỳ {namHienTai-1}</th>}
                    {bcNT&&<th style={{textAlign:'center',padding:'8px 10px',fontWeight:700,whiteSpace:'nowrap'}}>So sánh</th>}
                    {bcNT2&&<th style={{textAlign:'right',padding:'8px 10px',fontWeight:700,whiteSpace:'nowrap'}}>Cùng kỳ {namHienTai-2}</th>}
                    {bcNT2&&<th style={{textAlign:'center',padding:'8px 10px',fontWeight:700,whiteSpace:'nowrap'}}>So sánh</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r,i)=>(
                    <tr key={i} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                      <td style={{padding:'8px 10px',fontWeight:600}}>{r.label}</td>
                      <td style={{padding:'8px 10px',textAlign:'right',fontWeight:700,color:'var(--primary)'}}>{fVND(r.cur)}đ</td>
                      {bcNT&&<td style={{padding:'8px 10px',textAlign:'right',color:'#6B7280'}}>{fVND(r.prev)}đ</td>}
                      {bcNT&&<td style={{padding:'8px 10px',textAlign:'center'}}>{renderPct(pct(r.cur,r.prev))}</td>}
                      {bcNT2&&<td style={{padding:'8px 10px',textAlign:'right',color:'#6B7280'}}>{fVND(r.prev2)}đ</td>}
                      {bcNT2&&<td style={{padding:'8px 10px',textAlign:'center'}}>{renderPct(pct(r.cur,r.prev2))}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{fontSize:'10px',color:'#9CA3AF',marginTop:'8px',fontStyle:'italic'}}>
              * Dữ liệu cùng kỳ lấy từ báo cáo đã chốt — cần chốt hàng tháng để có dữ liệu so sánh
            </div>
          </div>
        )
      })()}
      {/* Phần 4 — Biểu đồ 6 tháng */}
      <div className="bc-card" style={{marginBottom:'16px'}}>
        <div style={{fontSize:'12px',fontWeight:700,color:'var(--text-secondary)',marginBottom:'14px',letterSpacing:'0.05em'}}>DOANH THU & CHI PHÍ 6 THÁNG GẦN NHẤT</div>
        <div style={{display:'flex',gap:'12px',alignItems:'flex-end',height:'140px'}}>
          {bieu6Thang.map((b,i)=>(
            <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',height:'100%',justifyContent:'flex-end'}}>
              <div style={{fontSize:'10px',color:'#6B7280',whiteSpace:'nowrap'}}>{fVND(Math.round(b.dt/1000000*10)/10)}M</div>
              <div style={{width:'100%',display:'flex',gap:'2px',alignItems:'flex-end',height:'100px'}}>
                <div style={{flex:1,background:'#16A34A',borderRadius:'3px 3px 0 0',height:`${Math.round(b.dt/maxBieu*100)}%`,minHeight:b.dt>0?'4px':'0',transition:'height 0.5s'}} title={`DT: ${fVND(b.dt)}đ`}></div>
                <div style={{flex:1,background:'#DC2626',borderRadius:'3px 3px 0 0',height:`${Math.round(b.chi/maxBieu*100)}%`,minHeight:b.chi>0?'4px':'0',transition:'height 0.5s'}} title={`Chi: ${fVND(b.chi)}đ`}></div>
              </div>
              <div style={{fontSize:'11px',fontWeight:600,color:'#374151'}}>{b.thang}</div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:'16px',marginTop:'10px',justifyContent:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'12px'}}>
            <div style={{width:'12px',height:'12px',background:'#16A34A',borderRadius:'2px'}}></div>Doanh thu
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'12px'}}>
            <div style={{width:'12px',height:'12px',background:'#DC2626',borderRadius:'2px'}}></div>Chi phí vận hành
          </div>
        </div>
      </div>

      {/* Phần 5 — Lịch sử báo cáo đã chốt */}
      {baoCaoList.length>0&&(
        <div className="bc-card">
          <div style={{fontSize:'12px',fontWeight:700,color:'var(--text-secondary)',marginBottom:'12px',letterSpacing:'0.05em'}}>LỊCH SỬ BÁO CÁO ĐÃ CHỐT</div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
              <thead>
                <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                  <th style={{textAlign:'left',padding:'8px 10px',fontWeight:700}}>Tháng</th>
                  <th style={{textAlign:'right',padding:'8px 10px',fontWeight:700,whiteSpace:'nowrap'}}>Doanh thu</th>
                  <th style={{textAlign:'right',padding:'8px 10px',fontWeight:700,whiteSpace:'nowrap'}}>Tổng chi</th>
                  <th style={{textAlign:'right',padding:'8px 10px',fontWeight:700,whiteSpace:'nowrap'}}>Lợi nhuận</th>
                  <th style={{textAlign:'right',padding:'8px 10px',fontWeight:700,whiteSpace:'nowrap'}}>Biên LN</th>
                  <th style={{textAlign:'left',padding:'8px 10px',fontWeight:700}}>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {baoCaoTrang.map((bc,i)=>{
                  const ln=Number(bc['Lợi nhuận gộp']||0)
                  const dt=Number(bc['Tổng doanh thu']||0)
                  const pct=dt>0?Math.round(ln/dt*100):0
                  return (
                    <tr key={i} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                      <td style={{padding:'8px 10px',fontWeight:700,color:'var(--primary)'}}>{bc['Tháng']||'—'}</td>
                      <td style={{padding:'8px 10px',textAlign:'right',fontWeight:600,color:'#16A34A'}}>{fVND(dt)}đ</td>
                      <td style={{padding:'8px 10px',textAlign:'right',color:'#DC2626'}}>{fVND(bc['Tổng chi phí']||0)}đ</td>
                      <td style={{padding:'8px 10px',textAlign:'right',fontWeight:700,color:ln>=0?'#16A34A':'#DC2626'}}>{ln>=0?'+':''}{fVND(ln)}đ</td>
                      <td style={{padding:'8px 10px',textAlign:'right',fontWeight:700,color:pct>=20?'#16A34A':pct>=10?'#D97706':'#DC2626'}}>{pct}%</td>
                      <td style={{padding:'8px 10px',fontSize:'12px',color:'#6B7280'}}>{bc['Ghi chú/nhận xét']||'—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {tongTrangLS>1&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',marginTop:'8px',flexWrap:'wrap',gap:'8px'}}>
            <span style={{fontSize:'12px',color:'var(--text-secondary)'}}>{(trangLS-1)*SO_DONG_LS+1}–{Math.min(trangLS*SO_DONG_LS,baoCaoList.length)} / {baoCaoList.length} tháng</span>
            <div style={{display:'flex',gap:'4px'}}>
              <button disabled={trangLS===1} onClick={()=>setTrangLS(t=>t-1)} style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid var(--border)',background:trangLS===1?'#F9FAFB':'white',color:trangLS===1?'#CCC':'var(--text-secondary)',cursor:trangLS===1?'not-allowed':'pointer',fontSize:'13px'}}>‹</button>
              {Array.from({length:tongTrangLS},(_,i)=>i+1).map(p=><button key={p} onClick={()=>setTrangLS(p)} style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid',borderColor:p===trangLS?'var(--primary)':'var(--border)',background:p===trangLS?'var(--primary)':'white',color:p===trangLS?'white':'var(--text-secondary)',cursor:'pointer',fontSize:'13px',fontWeight:p===trangLS?700:400}}>{p}</button>)}
              <button disabled={trangLS===tongTrangLS} onClick={()=>setTrangLS(t=>t+1)} style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid var(--border)',background:trangLS===tongTrangLS?'#F9FAFB':'white',color:trangLS===tongTrangLS?'#CCC':'var(--text-secondary)',cursor:trangLS===tongTrangLS?'not-allowed':'pointer',fontSize:'13px'}}>›</button>
            </div>
          </div>}
        </div>
      )}

      {/* Modal chốt báo cáo */}
      {showChot&&(
        <div className="ov" onClick={()=>setShowChot(false)}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'480px'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>📌 Chốt báo cáo tháng</h2>
              <button onClick={()=>setShowChot(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            <div style={{background:'#F5F3FF',borderRadius:'8px',padding:'12px 14px',marginBottom:'16px',border:'1px solid #DDD6FE'}}>
              <div style={{fontSize:'13px',fontWeight:600,marginBottom:'8px'}}>Kỳ: {tuNgay} → {denNgay}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',fontSize:'13px'}}>
                <div>💰 DT: <strong style={{color:'#16A34A'}}>{fVND(stats.tongDT)}đ</strong></div>
                <div>💸 Chi: <strong style={{color:'#DC2626'}}>{fVND(stats.tongChi)}đ</strong></div>
                <div>📈 Tổng LN: <strong style={{color:stats.loiNhuan>=0?'#16A34A':'#DC2626'}}>{fVND(stats.loiNhuan)}đ</strong></div>
                <div>📊 Biên: <strong>{phanTramLN}%</strong></div>
              </div>
            </div>
            <div style={{marginBottom:'16px'}}>
              <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'4px'}}>Ghi chú / Nhận xét tháng này</label>
              <textarea className="input" placeholder="Tháng này tốt/xấu vì lý do gì, kế hoạch tháng sau..."
                value={ghiChuChot} onChange={e=>setGhiChuChot(e.target.value)}
                style={{height:'80px',resize:'vertical'}}/>
            </div>
            <div style={{background:'#FEF9C3',borderRadius:'8px',padding:'10px',marginBottom:'16px',fontSize:'12px',color:'#92400E'}}>
              ⚠️ Sau khi chốt, số liệu sẽ được lưu vào lịch sử. Có thể chốt lại để cập nhật.
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={chotBaoCao} disabled={loading}
                style={{flex:1,padding:'12px',borderRadius:'8px',border:'none',background:loading?'#9CA3AF':'#7C3AED',color:'white',fontWeight:700,fontSize:'14px',cursor:loading?'not-allowed':'pointer'}}>
                {loading?'⏳ Đang lưu...':'📌 Xác nhận chốt'}
              </button>
              <button onClick={()=>setShowChot(false)}
                style={{padding:'12px 18px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px',fontWeight:600}}>Huỷ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


