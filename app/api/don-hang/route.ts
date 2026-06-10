// app/api/don-hang/route.ts — v5.0
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createRecord, getRecords, updateRecord, deleteRecord, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

async function taoMaDonMoi(): Promise<string> {
  const nam = new Date().getFullYear()
  try {
    const result = await getRecords(TABLES.DON_HANG, { limit:1, sort:'-Id', fields:'Mã đơn hàng,Id' })
    const donCuoi = result.list?.[0]
    if (donCuoi?.['Mã đơn hàng']) {
      const ma = donCuoi['Mã đơn hàng'] as string
      const parts = ma.split('-')
      const namCu = parseInt(parts[1]||'0')
      const soHienTai = parseInt(parts[parts.length-1]||'0')
      const soMoi = namCu===nam ? soHienTai+1 : 1
      return `DH-${nam}-${String(soMoi).padStart(3,'0')}`
    }
    return `DH-${nam}-001`
  } catch {
    return `DH-${nam}-${Date.now().toString().slice(-4)}`
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    const { searchParams } = new URL(request.url)
    const where  = searchParams.get('where')  || undefined
    const limit  = Number(searchParams.get('limit')  || 100)
    const offset = Number(searchParams.get('offset') || 0)
    const sort   = searchParams.get('sort')   || '-Ngày bán'
    const result = await getRecords(TABLES.DON_HANG, {where,limit,offset,sort})
    return NextResponse.json(result)
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    const body = await request.json()
    const maDon = await taoMaDonMoi()
    console.log('[CREATE don-hang] fields:', Object.keys({...body,'Mã đơn hàng':maDon}).join(', '))
    const result = await createRecord(TABLES.DON_HANG, {...body,'Mã đơn hàng':maDon})
    if (!result) return NextResponse.json({message:'Lỗi tạo đơn hàng'},{status:500})
    return NextResponse.json({success:true,data:result,maDon:result['Mã đơn hàng']||maDon})
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    const body = await request.json()
    const {id,...updateData} = body
    console.log('[PATCH don-hang id]', id, 'data:', JSON.stringify(updateData).substring(0,300))
    if (!id) return NextResponse.json({message:'Thiếu id'},{status:400})
    const result = await updateRecord(TABLES.DON_HANG, id, updateData)
    revalidatePath('/dashboard/don-hang')
    revalidatePath('/dashboard/khach-hang')
    return NextResponse.json({success:true,data:result})
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    if (session.vaiTro !== 'Chủ cửa hàng')
      return NextResponse.json({message:'Chỉ chủ cửa hàng mới được xóa đơn hàng'},{status:403})

    const {searchParams} = new URL(request.url)
    const id    = searchParams.get('id')
    const maDon = searchParams.get('maDon')
    if (!id) return NextResponse.json({message:'Thiếu id'},{status:400})

    // Kiểm tra trạng thái đơn — chỉ xóa Nháp hoặc Huỷ
    if (maDon) {
      const donR = await getRecords(TABLES.DON_HANG, {
        where:`(Mã đơn hàng,eq,${maDon})`, limit:1, fields:'Id,Trạng thái'
      })
      const don = donR.list?.[0]
      if (don) {
        const tt = don['Trạng thái']||''
        if (!['Nháp',''].includes(tt))
          return NextResponse.json({
            message:`Không thể xóa đơn "${tt}" — chỉ xóa được đơn Nháp hoặc Huỷ.`
          },{status:400})
      }
      // Xóa chi tiết đơn hàng liên quan (bảng 6)
      const ctR = await getRecords(TABLES.CHI_TIET_DON, {
        where:`(Mã đơn hàng,eq,${maDon})`, limit:100, fields:'Id'
      })
      for (const ct of (ctR.list||[])) {
        await deleteRecord(TABLES.CHI_TIET_DON, Number(ct['Id']||ct['id']))
      }
    }

    await deleteRecord(TABLES.DON_HANG, Number(id))
    return NextResponse.json({success:true})
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}

