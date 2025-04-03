// Các màu có độ tương phản tốt cho giao diện
export const memberColors = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber/Orange
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#14B8A6', // Teal
  '#D946EF', // Fuchsia
  '#6366F1', // Indigo
  '#0EA5E9', // Sky
  '#000000', // Black
  '#84CC16', // Lime
  '#22C55E', // Green
  '#EAB308', // Yellow
  '#DC2626', // Red
  '#9333EA', // Purple
  '#BE185D', // Pink
  '#0891B2', // Cyan
  '#EA580C', // Orange
  '#0D9488', // Teal
  '#C026D3', // Fuchsia
  '#4F46E5', // Indigo
  '#0284C7', // Sky
  '#171717', // Gray
];

// Tạo map lưu trữ màu sắc cho các thành viên
const colorMap = new Map<number, string>();

/**
 * Lấy màu cho thành viên bằng id, đảm bảo mỗi thành viên có màu duy nhất
 */
export function getMemberColor(memberId: number): string {
  // Nếu đã có màu trong map, trả về màu đó
  if (colorMap.has(memberId)) {
    return colorMap.get(memberId)!;
  }
  
  // Nếu chưa có màu, gán màu mới
  const usedColors = Array.from(colorMap.values());
  const availableColors = memberColors.filter(color => !usedColors.includes(color));
  
  // Nếu hết màu chưa dùng, quay lại dùng màu đầu tiên
  const color = availableColors.length > 0 
    ? availableColors[0] 
    : memberColors[memberId % memberColors.length];
    
  colorMap.set(memberId, color);
  return color;
}

/**
 * Tạo màu text phù hợp để hiển thị trên màu nền
 */
export function getContrastTextColor(backgroundColor: string): string {
  // Chuyển đổi hex màu thành RGB
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Tính độ sáng của màu (công thức YIQ)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Nếu màu nền sáng, trả về màu chữ tối và ngược lại
  return brightness > 128 ? '#000000' : '#FFFFFF';
}

/**
 * Reset lại toàn bộ map màu (gọi khi tạo session mới)
 */
export function resetColorMap(): void {
  colorMap.clear();
}