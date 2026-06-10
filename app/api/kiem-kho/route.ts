// app/api/kiem-kho/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRecord, getRecords, updateRecord, deleteRecord, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

// ── Tạo mã đợt kiểm ─────────────────────────────────────────
async function taoMaDot(): Promise<string> {
  try {
    const nam = new Date().getFullYear()
    const r = await getRecords(TABLES.DOT_KIEM_KHO, { limit: 500, sort: '-Id', fields: 'Mã đợt kiểm' })
    let maxSo = 0
    for (const item of (r.list || [])) {
      const ma = item['Mã đợt kiểm'] as string || ''
      const parts = ma.split('-')
      const namMa = parseInt(parts[1] || '0')
      const so = parseInt(parts[parts.length - 1] || '0')
      if (!isNaN(so) && so > maxSo && namMa === nam) maxSo = so
    }
    return `DKK-${nam}-${String(maxSo + 1).padStart(3, '0')}`
  } catch { return `DKK-${Date.now().toString().slice(-6)}` }
}

// ── Tạo mã chi tiết ─────────────────────────────────────────
async function taoMaCT(): Promise<string> {
  try {
    const r = await getRecords(TABLES.CT_KIEM_KHO, { limit: 500, sort: '-Id', fields: 'Mã chi tiết' })
    let maxSo = 0
    for (const item of (r.list || [])) {
      const ma = item['Mã chi tiết'] as string || ''
      const so = parseInt(ma.replace('CTKI-', '') || '0')
      if (!isNaN(so) && so > maxSo) maxSo = so
    }
    return `CTKI-${String(maxSo + 1).padStart(4, '0')}`
  } catch { return `CTKI-${Date.now().toString().slice(-6)}` }
}

// ── Tạo mã chi phí ──────────────────────────────────────────
async function taoMaCP(): Promise<string> {
  try {
    const existing = await getRecords(TABLES.CHI_PHI, { limit: 1, sort: '-Id', fields: 'Mã chi phí' })
    const lastMa = existing.list?.[0]?.['Mã chi phí'] || 'CP-2026-000'
    const lastNum = parseInt(lastMa.split('-').pop() || '0')
    const year = new Date().getFullYear()
    return `CP-${year}-${String(lastNum + 1).padStart(3, '0')}`
  } catch { return `CP-${Date.now().toString().slice(-6)}` }
}

// ── GET: lấy danh sách đợt kiểm hoặc chi tiết 1 đợt ─────────
export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const maDot = searchParams.get('maDot')
    const loai  = searchParams.get('loai')

    if (loai === 'ct' && maDot) {
      const r = await getRecords(TABLES.CT_KIEM_KHO, {
        where: `(Mã đợt kiểm,eq,${maDot})`,
        limit: 500,
        fields: 'Id,Mã chi tiết,Mã đợt kiểm,Mã SP,Tên SP,Tồn hệ thống,Tồn thực tế,Chênh lệch,Hàng hỏng,Tồn sau điều chỉnh,Nguyên nhân,Người chịu trách nhiệm,Ghi chú,Đã điều chỉnh'
      })
      return NextResponse.json(r)
    }

    const r = await getRecords(TABLES.DOT_KIEM_KHO, {
      limit: 200, sort: '-Id',
      fields: 'Id,Mã đợt kiểm,Loại kiểm,Ngày kiểm,Người kiểm,Tổng SP kiểm,Tổng SP chênh,Trạng thái,Người duyệt,Ngày duyệt,Ghi chú,Danh mục kiểm'
    })
    return NextResponse.json(r)
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 500 }) }
}

// ── POST: tạo đợt kiểm mới kèm danh sách SP ─────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    const body = await req.json()
    const { loaiKiem, ngayKiem, nguoiKiem, ghiChu, trangThai, danhMucKiem, dsSP } = body

    if (!dsSP || !dsSP.length) return NextResponse.json({ message: 'Cần ít nhất 1 sản phẩm' }, { status: 400 })

    const maDot = await taoMaDot()
    const tongChenh = dsSP.filter((sp: any) => Number(sp.tonTT ?? sp.tonHT) !== Number(sp.tonHT)).length

    const dot = await createRecord(TABLES.DOT_KIEM_KHO, {
      'Mã đợt kiểm':   maDot,
      'Loại kiểm':     loaiKiem || 'Tháng',
      'Ngày kiểm':     ngayKiem || new Date().toISOString().split('T')[0],
      'Người kiểm':    nguoiKiem || session.hoTen || session.tenDangNhap,
      'Tổng SP kiểm':  dsSP.length,
      'Tổng SP chênh': tongChenh,
      'Trạng thái':    trangThai || 'Nháp',
      'Ghi chú':       ghiChu || '',
      'Danh mục kiểm': danhMucKiem || '',
      'Người duyệt':   '',
      'Ngày duyệt':    null,
    })
    if (!dot) return NextResponse.json({ message: 'Lỗi tạo đợt kiểm' }, { status: 500 })

    for (const sp of dsSP) {
      const tonHT    = Number(sp.tonHT || 0)
      const tonTT    = sp.tonTT !== undefined && sp.tonTT !== '' ? Number(sp.tonTT) : tonHT
      const hangHong = Number(sp.hangHong || 0)
      const chenh    = tonTT - tonHT
      const tonSauDC = tonTT - hangHong
      const maCT = await taoMaCT()
      await createRecord(TABLES.CT_KIEM_KHO, {
        'Mã chi tiết':           maCT,
        'Mã đợt kiểm':           maDot,
        'Mã SP':                  sp.maSP || '',
        'Tên SP':                 sp.tenSP || '',
        'Tồn hệ thống':           tonHT,
        'Tồn thực tế':            tonTT,
        'Chênh lệch':             chenh,
        'Hàng hỏng':              hangHong,
        'Tồn sau điều chỉnh':     tonSauDC,
        'Nguyên nhân':            chenh === 0 ? 'Không chênh lệch' : (sp.nguyenNhan || 'Không rõ nguyên nhân'),
        'Người chịu trách nhiệm': sp.nguoiChiuTN || '',
        'Ghi chú':                sp.ghiChuCT || '',
        'Đã điều chỉnh':          false,
      })
    }

    return NextResponse.json({ success: true, maDot, soSP: dsSP.length })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 500 }) }
}

// ── PATCH: cập nhật đợt kiểm hoặc chi tiết SP ───────────────
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    const body = await req.json()
    const { loai, id, ...data } = body
    if (!id) return NextResponse.json({ message: 'Thiếu id' }, { status: 400 })

    if (loai === 'ct') {
      const tonTT    = Number(data['Tồn thực tế'] ?? 0)
      const tonHT    = Number(data['Tồn hệ thống'] ?? 0)
      const hangHong = Number(data['Hàng hỏng'] ?? 0)
      data['Chênh lệch']         = tonTT - tonHT
      data['Tồn sau điều chỉnh'] = tonTT - hangHong
      if (data['Chênh lệch'] === 0) data['Nguyên nhân'] = 'Không chênh lệch'
      const r = await updateRecord(TABLES.CT_KIEM_KHO, Number(id), data)
      return NextResponse.json({ success: true, data: r })
    }

    // Cập nhật đợt kiểm
    if (data['Trạng thái'] === 'Đã duyệt' && !data['Ngày duyệt']) {
      data['Ngày duyệt']  = new Date().toISOString().split('T')[0]
      data['Người duyệt'] = session.hoTen || session.tenDangNhap

      // ── TỰ ĐỘNG TẠO PHIẾU CHI THẤT THOÁT ───────────────────
      // Lấy chi tiết đợt kiểm để tính giá trị thất thoát
      const dotR = await getRecords(TABLES.DOT_KIEM_KHO, {
        where: `(Id,eq,${id})`, limit: 1, fields: 'Mã đợt kiểm,Ngày kiểm,Người kiểm'
      })
      const dot = dotR.list?.[0]
      if (dot) {
        const maDot = dot['Mã đợt kiểm'] || ''
        const ctR = await getRecords(TABLES.CT_KIEM_KHO, {
          where: `(Mã đợt kiểm,eq,${maDot})`,
          limit: 500,
          fields: 'Mã SP,Tên SP,Chênh lệch,Hàng hỏng,Giá bình quân'
        })

        // Lấy giá bình quân từ bảng nhập kho
        const nhapR = await getRecords(TABLES.NHAP_KHO, {
          limit: 2000,
          fields: 'Mã SP,Số lượng thực nhận,Giá nhập thực tế,Chi phí vận chuyển,Tổng tiền hóa đơn'
        })
        const nhapTheoSP: Record<string, {tongTien: number, tongSL: number}> = {}
        for (const row of (nhapR.list || [])) {
          const maSP = row['Mã SP'] || ''
          if (!maSP) continue
          const sl = Number(row['Số lượng thực nhận'] || 0)
          const giaNhap = Number(row['Giá nhập thực tế'] || 0)
          const cpVC = Number(row['Chi phí vận chuyển'] || 0)
          const tongHD = Number(row['Tổng tiền hóa đơn'] || 0)
          const tyLe = tongHD > 0 ? (giaNhap * sl) / tongHD : 0
          const cpVCPhanBo = cpVC * tyLe
          if (!nhapTheoSP[maSP]) nhapTheoSP[maSP] = { tongTien: 0, tongSL: 0 }
          nhapTheoSP[maSP].tongTien += giaNhap * sl + cpVCPhanBo
          nhapTheoSP[maSP].tongSL  += sl
        }
        const giaBQ: Record<string, number> = {}
        for (const [maSP, { tongTien, tongSL }] of Object.entries(nhapTheoSP)) {
          giaBQ[maSP] = tongSL > 0 ? Math.round(tongTien / tongSL) : 0
        }

        // Tính tổng thất thoát
        let tongThatThoat = 0
        const chiTietTT: string[] = []
        for (const ct of (ctR.list || [])) {
          const maSP   = ct['Mã SP'] || ''
          const tenSP  = ct['Tên SP'] || maSP
          const chenh  = Number(ct['Chênh lệch'] || 0)
          const hong   = Number(ct['Hàng hỏng'] || 0)
          const gia    = giaBQ[maSP] || 0
          if (gia === 0) continue
          // Thất thoát = hàng mất (chenh < 0) + hàng hỏng
          const slThatThoat = Math.abs(chenh < 0 ? chenh : 0) + hong
          if (slThatThoat > 0) {
            const gt = slThatThoat * gia
            tongThatThoat += gt
            chiTietTT.push(`${tenSP}: ${slThatThoat} × ${gia.toLocaleString('vi-VN')}đ`)
          }
        }

        // Chỉ tạo phiếu chi nếu có thất thoát
        if (tongThatThoat > 0) {
          const maCP = await taoMaCP()
          const noiDung = `Thất thoát kiểm kho ${maDot}${chiTietTT.length > 0 ? ': ' + chiTietTT.slice(0, 3).join('; ') + (chiTietTT.length > 3 ? '...' : '') : ''}`
          await createRecord(TABLES.CHI_PHI, {
            'Mã chi phí':           maCP,
            'Ngày phát sinh':       dot['Ngày kiểm'] || new Date().toISOString().split('T')[0],
            'Loại chi phí':         'Thất thoát',
            'Nội dung':             noiDung,
            'Số tiền':              tongThatThoat,
            'Hình thức thanh toán': 'Khác',
            'Người chi':            dot['Người kiểm'] || session.hoTen || '',
            'Trạng thái':           'Đã thanh toán',
            'Ghi chú':              `Tự động từ duyệt kiểm kho ${maDot}`,
          })
        }
      }
      // ────────────────────────────────────────────────────────
    }

    const r = await updateRecord(TABLES.DOT_KIEM_KHO, Number(id), data)
    return NextResponse.json({ success: true, data: r })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 500 }) }
}

// ── DELETE: xóa đợt kiểm + toàn bộ chi tiết ────────────────
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    if (session.vaiTro !== 'Chủ cửa hàng') return NextResponse.json({ message: 'Chỉ chủ cửa hàng mới được xóa' }, { status: 403 })
    const { searchParams } = new URL(req.url)
    const id    = searchParams.get('id')
    const maDot = searchParams.get('maDot')
    if (!id) return NextResponse.json({ message: 'Thiếu id' }, { status: 400 })

    if (maDot) {
      const cts = await getRecords(TABLES.CT_KIEM_KHO, {
        where: `(Mã đợt kiểm,eq,${maDot})`, limit: 500, fields: 'Id'
      })
      for (const ct of (cts.list || [])) {
        await deleteRecord(TABLES.CT_KIEM_KHO, Number(ct['Id'] || ct['id']))
      }
    }
    await deleteRecord(TABLES.DOT_KIEM_KHO, Number(id))
    return NextResponse.json({ success: true })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 500 }) }
}
