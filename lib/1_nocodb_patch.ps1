$file = "C:\Users\Lam Phuong\Desktop\qlbh-nttt\lib\nocodb.ts"
$content = Get-Content $file -Raw -Encoding UTF8
$old = "  KIEM_KHO:       '17_Kiểm kho',"
$new = "  KIEM_KHO:       '17_Kiểm kho',
  DOT_KIEM_KHO:   '17_Đợt kiểm kho',
  CT_KIEM_KHO:    '17b_Chi tiết kiểm kho',"
$result = $content.Replace($old, $new)
if ($result -eq $content) {
  Write-Host "❌ Không tìm thấy đoạn cần thay" -ForegroundColor Red
} else {
  [System.IO.File]::WriteAllText($file, $result, [System.Text.Encoding]::UTF8)
  Write-Host "✅ Đã thêm DOT_KIEM_KHO và CT_KIEM_KHO vào TABLES" -ForegroundColor Green
}
