const fs = require('fs')

// 1. DonHangClient — thêm 'Hủy' vào badgeColor + đổi tên hiển thị
const f1 = 'components/DonHangClient.tsx'
let c1 = fs.readFileSync(f1, 'utf8')

// Thêm Hủy vào map màu
const old1 = `  'Huỷ':             { bg:'#FEE2E2', color:'#991B1B' },`
const new1 = `  'Huỷ':             { bg:'#FEE2E2', color:'#991B1B' },
    'Hủy':             { bg:'#FEE2E2', color:'#991B1B' },`
if (c1.includes(old1)) { c1 = c1.replace(old1, new1); console.log('OK 1a. badgeColor Hủy') }
else console.log('FAIL 1a.')

// Hiển thị "Đã hủy" thay vì "Hủy"/"Huỷ" trong badge
const old2 = `              <span style={{ padding:'3px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:700, background:c.bg, color:c.color, whiteSpace:'nowrap' }}>
                        {tt}
                      </span>`
const new2 = `              <span style={{ padding:'3px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:700, background:c.bg, color:c.color, whiteSpace:'nowrap' }}>
                        {(tt==='Hủy'||tt==='Huỷ')?'Đã hủy':tt}
                      </span>`
if (c1.includes(old2)) { c1 = c1.replace(old2, new2); console.log('OK 1b. hiển thị Đã hủy') }
else console.log('FAIL 1b.')

// isHuy nhận cả 2 cách viết
const old3 = `                const isHuy  = tt === 'Huỷ' || tt === 'Hủy'`
if (!c1.includes(old3)) {
  c1 = c1.replace(`const isHuy  = tt === 'Huỷ'`, `const isHuy  = tt === 'Huỷ' || tt === 'Hủy'`)
  console.log('OK 1c. isHuy')
} else console.log('OK 1c. isHuy already')

fs.writeFileSync(f1, c1, 'utf8')

// 2. route.ts — thêm revalidatePath sau PATCH
const f2 = 'app/api/don-hang/route.ts'
let c2 = fs.readFileSync(f2, 'utf8')

// Thêm import revalidatePath
if (!c2.includes('revalidatePath')) {
  c2 = c2.replace(
    `import { NextRequest, NextResponse } from 'next/server'`,
    `import { NextRequest, NextResponse } from 'next/server'\nimport { revalidatePath } from 'next/cache'`
  )
  console.log('OK 2a. import revalidatePath')
}

// Thêm revalidatePath vào PATCH response
const old4 = `    const result = await updateRecord(TABLES.DON_HANG, id, updateData)
    return NextResponse.json({success:true,data:result})`
const new4 = `    const result = await updateRecord(TABLES.DON_HANG, id, updateData)
    revalidatePath('/dashboard/don-hang')
    return NextResponse.json({success:true,data:result})`
if (c2.includes(old4)) { c2 = c2.replace(old4, new4); console.log('OK 2b. revalidatePath PATCH') }
else console.log('FAIL 2b.')

// Xóa debug log
c2 = c2.replace(
  `    console.log('[PATCH don-hang id]', id, 'data:', JSON.stringify(updateData).substring(0,300))\n`,
  ''
)
console.log('OK 2c. xóa debug log')

fs.writeFileSync(f2, c2, 'utf8')
console.log('Done!')
