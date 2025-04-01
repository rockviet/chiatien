import { useEffect, useRef } from 'react';
import { useSessionData } from '@/hooks/useSessionData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Chart, ChartConfiguration, ChartData, registerables } from 'chart.js';

Chart.register(...registerables);

export function ExpenseChart() {
  const { summary } = useSessionData();
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    
    // Clean up previous chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;
    
    const categoryData = summary.expensesByCategory;
    
    // If no data, display empty chart
    if (categoryData.length === 0) {
      chartInstance.current = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: ['Chưa có chi tiêu'],
          datasets: [{
            data: [1],
            backgroundColor: ['#e5e5e5'],
            hoverBackgroundColor: ['#e5e5e5']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      });
      return;
    }
    
    // Create chart with real data
    const data: ChartData = {
      labels: categoryData.map(cat => cat.name),
      datasets: [{
        data: categoryData.map(cat => cat.amount),
        backgroundColor: [
          '#3B82F6',
          '#10B981',
          '#F59E0B',
          '#EF4444',
          '#8B5CF6',
          '#EC4899'
        ]
      }]
    };
    
    const config: ChartConfiguration = {
      type: 'pie',
      data: data,
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
                return `${context.label}: ${value} nghìn VNĐ`;
              }
            }
          }
        }
      }
    };
    
    chartInstance.current = new Chart(ctx, config);
    
    // Clean up
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [summary]);

  return (
    <div className="p-4 flex justify-center">
      <div style={{ height: '250px', width: '100%' }}>
        <canvas ref={chartRef} />
      </div>
    </div>
  );
}
