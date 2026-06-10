const fs = require('fs')
const f = 'app/api/don-hang/route.ts'
let c = fs.readFileSync(f, 'utf8')

const old1 = `    const result = await updateRecord(TABLES.DON_HANG, id, updateData)
    revalidatePath('/dashboard/don-hang')
    return NextResponse.json({success:true,data:result})`
const new1 = `    const result = await updateRecord(TABLES.DON_HANG, id, updateData)
    revalidatePath('/dashboard/don-hang')
    revalidatePath('/dashboard/khach-hang')
    return NextResponse.json({success:true,data:result})`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK') }
else console.log('FAIL')

fs.writeFileSync(f, c, 'utf8')
console.log('Done')
