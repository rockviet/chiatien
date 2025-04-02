export function formatVietnameseCurrency(amount: number): string {
    return amount.toLocaleString('vi-VN').replace(/,/g, '.') + 'K';
}
