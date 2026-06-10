// app/api/xu-ly-hang/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRecord, getRecords, updateRecord, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

async function taoMaXL(): Promise<string> {
  try {
    const nam = new Date().getFullYear()
    const r = await getRecords(TABLES.XU_LY_HANG, { limit:500, sort:'-Id', fields:'Mã xử lý' })
    let maxSo = 0
    for (const item of (r.list||[])) {
      const ma = item['Mã xử lý'] as string||''
      const parts = ma.split('-')
      const namMa = parseInt(parts[1]||'0')
      const so = parseInt(parts[parts.length-1]||'0')
      if (!isNaN(so) && so > maxSo && namMa===nam) maxSo = so
    }
    return `XL-${nam}-${String(maxSo+1).padStart(3,'0')}`
  } catch { return `XL-${Date.now().toString().slice(-6)}` }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    const { searchParams } = new URL(req.url)
    const maPhieu = searchParams.get('maPhieu')
    const where = maPhieu ? `(Mã phiếu nhập,eq,${maPhieu})` : undefined
    const r = await getRecords(TABLES.XU_LY_HANG, {
      limit:500, sort:'-Id', where,
      fields:'Id,Mã xử lý,Ngày xử lý,Mã phiếu nhập,Mã NCC,Mã SP,Số lượng,Loại vấn đề,Hướng xử lý,Trạng thái,Ghi chú,Người báo cáo,Người xử lý,Ngày hoàn thành'
    })
    return NextResponse.json(r)
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    const body = await req.json()
    const maXL = await taoMaXL()
    const r = await createRecord(TABLES.XU_LY_HANG, {
      'Mã xử lý': maXL,
      'Ngày xử lý': body.ngayXuLy || new Date().toISOString().split('T')[0],
      'Mã phiếu nhập': body.maPhieuNhap||'',
      'Mã NCC': body.maNCC||'',
      'Mã SP': body.maSP||'',
      'Số lượng': Number(body.soLuong||0),
      'Loại vấn đề': body.loaiVanDe||'',
      'Hướng xử lý': body.huongXuLy||'',
      'Trạng thái': 'Chờ xử lý',
      'Ghi chú': body.ghiChu||'',
      'Người báo cáo': body.nguoiBaoCao||'',
      'Người xử lý': '',
      'Ngày hoàn thành': null,
    })
    return NextResponse.json({ success:true, maXL, data:r })
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    const { id, ...data } = await req.json()
    if (!id) return NextResponse.json({message:'Thiếu id'},{status:400})

    // Nếu đổi sang Đã xử lý thì ghi ngày hoàn thành
    if (data['Trạng thái']==='Đã xử lý' && !data['Ngày hoàn thành']) {
      data['Ngày hoàn thành'] = new Date().toISOString().split('T')[0]
    }

    const r = await updateRecord(TABLES.XU_LY_HANG, Number(id), data)

    // ── MỚI: Khi xử lý xong → cập nhật Tình trạng hàng trong bảng Nhập kho ──
    if (data['Trạng thái']==='Đã xử lý' && data['Mã phiếu nhập']) {
      try {
        // Tìm bản ghi nhập kho theo Mã phiếu nhập
        const nhapKhoResult = await getRecords(TABLES.NHAP_KHO, {
          where: `(Mã phiếu nhập,eq,${data['Mã phiếu nhập']})`,
          limit: 1,
          fields: 'Id,Tình trạng hàng'
        })
        const phieu = nhapKhoResult.list?.[0]
        // Chỉ cập nhật nếu tình trạng hiện tại là "Có hàng lỗi"
        if (phieu && phieu['Tình trạng hàng'] === 'Có hàng lỗi') {
          await updateRecord(TABLES.NHAP_KHO, Number(phieu['Id']||phieu['id']), {
            'Tình trạng hàng': 'Đã xử lý'
          })
        }
      } catch(e) {
        // Không throw — lỗi cập nhật nhập kho không được chặn kết quả chính
        console.error('Lỗi cập nhật tình trạng nhập kho:', e)
      }
    }

    return NextResponse.json({ success:true, data:r })
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}
