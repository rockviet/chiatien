import { useEffect, useRef } from 'react';
import { useSession } from '@/context/SessionContext';
import { useSessionData } from '@/hooks/useSessionData';
import { Chart, registerables } from 'chart.js';
import { memberColors } from '@/utils/colors';

// Lazy load Chart.js
Chart.register(...registerables);

export function ExpenseChart() {
  const { summary } = useSessionData();
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    
    // Clean up previous chart if it exists
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }
    
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Prepare data
    const categoryData = summary.expensesByCategory || [];
    
    // If no data, display empty chart
    if (categoryData.length === 0) {
      chartInstanceRef.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Chưa có chi tiêu'],
          datasets: [{
            data: [1],
            backgroundColor: ['#e5e7eb']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            },
            tooltip: {
              enabled: false
            }
          }
        }
      });
      return;
    }
    
    // Create chart with real data
    chartInstanceRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: categoryData.map(cat => cat.name),
        datasets: [{
          data: categoryData.map(cat => cat.amount),
          backgroundColor: memberColors
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.raw as number;
                return ` ${context.label}: ${new Intl.NumberFormat('vi-VN', { 
                  style: 'currency', 
                  currency: 'VND',
                  maximumFractionDigits: 0
                }).format(value)}`;
              }
            }
          }
        }
      }
    });
    
    // Clean up
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [summary]);

  return (
    <div className="h-[300px] w-full">
      <canvas ref={chartRef}></canvas>
    </div>
  );
}
