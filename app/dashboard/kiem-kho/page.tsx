// app/dashboard/kiem-kho/page.tsx
export const dynamic = 'force-dynamic'
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import KiemKhoClient from '@/components/KiemKhoClient'

export default async function KiemKhoPage() {
  const session = await getSession()
  const [dotKiemList, sanPhamList, danhMucList, nhapKhoList, nvList] = await Promise.all([
    getRecords(TABLES.DOT_KIEM_KHO, {
      limit: 200, sort: '-Id',
      fields: 'Id,Mã đợt kiểm,Loại kiểm,Ngày kiểm,Người kiểm,Tổng SP kiểm,Tổng SP chênh,Trạng thái,Người duyệt,Ngày duyệt,Ghi chú,Danh mục kiểm'
    }),
    getRecords(TABLES.SAN_PHAM, {
      limit: 500,
      fields: 'Id,Mã SP,Tên sản phẩm,Đơn vị tính,Tồn kho,Ngưỡng cảnh báo,Danh mục,Giá nhập NCC,CPVC về kho'
    }),
    getRecords(TABLES.DANH_MUC, {
      limit: 200, sort: 'Thứ tự', fields: 'Id,Tên danh mục,Thứ tự'
    }),
    getRecords(TABLES.NHAP_KHO, {
      limit: 2000, sort: '-Id',
      fields: 'Id,Mã SP,Số lượng thực nhận,Giá nhập thực tế,Chi phí vận chuyển,Tổng tiền hóa đơn'
    }),
    getRecords(TABLES.NHAN_VIEN, {
      limit: 200, sort: 'Mã nhân viên',
      fields: 'Id,Mã nhân viên,Họ và Tên,Loại,Trạng thái'
    }),
  ])

  // Tính giá bình quân theo từng SP từ bảng nhập kho
  // Công thức: giá bình quân = (Σ Giá nhập * SL + CP VC phân bổ) / Σ SL
  // CP VC phân bổ = CP VC hóa đơn * (Giá nhập SP / Tổng tiền HĐ)
  const giaBinhQuanMap: Record<string, number> = {}
  const nhapTheoSP: Record<string, {tongTien: number, tongSL: number}> = {}

  for (const row of (nhapKhoList.list || [])) {
    const maSP = row['Mã SP'] || ''
    if (!maSP) continue
    const sl = Number(row['Số lượng thực nhận'] || 0)
    const giaNhap = Number(row['Giá nhập thực tế'] || 0)
    const cpVC = Number(row['Chi phí vận chuyển'] || 0)
    const tongHD = Number(row['Tổng tiền hóa đơn'] || 0)
    // Phân bổ CP VC theo tỷ lệ giá trị SP / tổng HĐ
    const tyLe = tongHD > 0 ? (giaNhap * sl) / tongHD : 0
    const cpVCPhanBo = cpVC * tyLe
    const tongTienSP = giaNhap * sl + cpVCPhanBo

    if (!nhapTheoSP[maSP]) nhapTheoSP[maSP] = { tongTien: 0, tongSL: 0 }
    nhapTheoSP[maSP].tongTien += tongTienSP
    nhapTheoSP[maSP].tongSL += sl
  }

  for (const [maSP, { tongTien, tongSL }] of Object.entries(nhapTheoSP)) {
    giaBinhQuanMap[maSP] = tongSL > 0 ? Math.round(tongTien / tongSL) : 0
  }

  return (
    <KiemKhoClient
      dotKiemList={dotKiemList.list || []}
      sanPhamList={sanPhamList.list || []}
      danhMucList={danhMucList.list || []}
      giaBinhQuanMap={giaBinhQuanMap}
      nvList={(nvList.list || []).filter((nv:any) => nv['Loại']==='Nhân viên' && nv['Trạng thái']==='Đang làm')}
      user={session!}
    />
  )
}
