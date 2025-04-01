import * as React from "react"

// Breakpoints theo Tailwind CSS
const BREAKPOINTS = {
  sm: 640,   // Small (mobile)
  md: 768,   // Medium (tablet landscape)
  lg: 1024,  // Large (desktop)
  xl: 1280,  // Extra large
}

/**
 * Hook kiểm tra kích thước màn hình và trả về loại thiết bị
 * @returns {Object} Các giá trị boolean cho mỗi loại thiết bị
 */
export function useResponsive() {
  const [windowSize, setWindowSize] = React.useState<{
    width: number | undefined;
    height: number | undefined;
  }>({
    width: undefined,
    height: undefined,
  });

  React.useEffect(() => {
    // Hàm cập nhật kích thước cửa sổ
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    
    // Thêm event listener
    window.addEventListener("resize", handleResize);
    
    // Gọi ngay lần đầu để set giá trị ban đầu
    handleResize();
    
    // Cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Kiểm tra các loại thiết bị
  const isMobile = typeof windowSize.width === 'number' && windowSize.width < BREAKPOINTS.sm;
  const isTablet = typeof windowSize.width === 'number' && windowSize.width >= BREAKPOINTS.sm && windowSize.width < BREAKPOINTS.lg;
  const isDesktop = typeof windowSize.width === 'number' && windowSize.width >= BREAKPOINTS.lg;
  
  // isMobileOrTablet bao gồm cả mobile và tablet
  const isMobileOrTablet = isMobile || isTablet;

  return {
    isMobile,
    isTablet,
    isDesktop,
    isMobileOrTablet,
    windowSize
  };
}