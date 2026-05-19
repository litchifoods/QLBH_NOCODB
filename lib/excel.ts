// lib/excel.ts
// Tiện ích xuất/nhập Excel dùng chung — không cần thư viện ngoài
// Dùng định dạng CSV (mở được bằng Excel) và xuất file xlsx đơn giản

// ── XUẤT CSV (mở được bằng Excel) ──────────────────────────────
export function xuatCSV(tenFile: string, headers: string[], rows: any[][]) {
  // Thêm BOM để Excel đọc được tiếng Việt
  const BOM = '\uFEFF'
  const escapeCell = (val: any) => {
    if (val === null || val === undefined) return ''
    const s = String(val)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(',')),
  ]
  const content = BOM + lines.join('\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `${tenFile}.csv`)
}

// ── TẢI FILE ────────────────────────────────────────────────────
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ── ĐỌC FILE CSV/EXCEL ──────────────────────────────────────────
export function docCSV(file: File): Promise<{headers: string[], rows: Record<string,string>[]}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        let text = e.target?.result as string
        // Bỏ BOM nếu có
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)

        const lines = text.split(/\r?\n/).filter(l => l.trim())
        if (lines.length < 2) { reject(new Error('File không có dữ liệu')); return }

        const parseRow = (line: string): string[] => {
          const cells: string[] = []
          let cur = '', inQ = false
          for (let i = 0; i < line.length; i++) {
            const c = line[i]
            if (c === '"') {
              if (inQ && line[i+1] === '"') { cur += '"'; i++ }
              else inQ = !inQ
            } else if (c === ',' && !inQ) {
              cells.push(cur.trim()); cur = ''
            } else {
              cur += c
            }
          }
          cells.push(cur.trim())
          return cells
        }

        const headers = parseRow(lines[0])
        const rows = lines.slice(1).map(line => {
          const vals = parseRow(line)
          const obj: Record<string,string> = {}
          headers.forEach((h, i) => { obj[h] = vals[i] || '' })
          return obj
        }).filter(row => Object.values(row).some(v => v.trim()))

        resolve({ headers, rows })
      } catch (err: any) {
        reject(new Error('Lỗi đọc file: ' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('Không đọc được file'))
    reader.readAsText(file, 'UTF-8')
  })
}

// ── ĐỊNH NGHĨA CỘT CHO TỪNG BẢNG ───────────────────────────────
export const EXCEL_SCHEMAS = {
  DON_HANG: {
    headers: ['Mã đơn hàng','Ngày bán','Mã KH','Tên khách hàng','Kênh bán','Hình thức giao hàng','Ngày hẹn giao','Địa chỉ giao','Tổng tiền đơn','Đặt cọc','Hình thức cọc','Còn phải thu','Trạng thái','Nhân viên bán','Xuất hóa đơn','Ghi chú'],
    mau: [
      ['DH-2025-001','2025-05-01','KH-001','Nguyễn Văn A','Trực tiếp','Giao hàng cho khách','2025-05-05','123 Lê Lợi, Q1','15000000','3000000','Tiền mặt','12000000','Chờ giao','Trần Bình','Không',''],
      ['DH-2025-002','2025-05-02','KH-002','Trần Thị B','Zalo','Khách mang hàng về','','','8500000','0','','8500000','Hoàn thành','Phạm Dung','Không','Khách lấy tại cửa hàng'],
    ],
  },
  KHACH_HANG: {
    headers: ['Mã KH','Tên khách hàng','Số điện thoại','Địa chỉ','Đối tượng khách hàng','Ghi chú'],
    mau: [
      ['KH-001','Nguyễn Văn An','0901234567','123 Lê Lợi, Quận 1, TP.HCM','Cá nhân','Khách thân thiết'],
      ['KH-002','Trần Thị Bình','0912345678','456 Trần Hưng Đạo, Quận 5','Cá nhân',''],
      ['KH-003','Công ty TNHH ABC','0909876543','789 Nguyễn Huệ, Quận 1','Công ty','Mua sỉ thường xuyên'],
    ],
  },
  SAN_PHAM: {
    headers: ['Mã SP','Tên sản phẩm','Đơn vị tính','Loại SP','Giá nhập','Giá bán lẻ','Giá bán buôn','Tồn kho','Ngưỡng cảnh báo','Mô tả'],
    mau: [
      ['SP-001','Bàn làm việc gỗ sồi','Cái','Phổ thông','1500000','2500000','2200000','10','3','Kích thước 120x60cm'],
      ['SP-002','Ghế văn phòng lưới','Cái','Phổ thông','800000','1500000','1300000','15','5','Ghế xoay có tựa lưng'],
      ['SP-003','Tủ hồ sơ 3 ngăn','Cái','Phổ thông','1200000','2000000','1800000','8','3','Màu trắng/đen/gỗ'],
    ],
  },
  NHA_CUNG_CAP: {
    headers: ['Mã NCC','Tên NCC','Số điện thoại','Địa chỉ','Email','Số tài khoản','Ngân hàng','Công nợ hiện tại','Ghi chú'],
    mau: [
      ['NCC-001','Công ty Gỗ Việt','0281234567','KCN Bình Dương','goviet@email.com','1234567890','Vietcombank','0','Đối tác lâu năm'],
      ['NCC-002','Nội thất Minh Long','0291234567','Hà Nội','minhlong@email.com','0987654321','BIDV','5000000',''],
    ],
  },
  NHAN_VIEN: {
    headers: ['Mã NV','Họ tên','Số điện thoại','Vai trò','Ngày vào làm','Lương cơ bản','% Thưởng doanh số','Telegram ID','Ghi chú'],
    mau: [
      ['NV-001','Trần Văn Bình','0901111111','Nhân viên bán hàng','2024-01-01','8000000','2','',''],
      ['NV-002','Phạm Thị Dung','0902222222','Nhân viên kho','2024-03-01','7000000','0','',''],
    ],
  },
}
