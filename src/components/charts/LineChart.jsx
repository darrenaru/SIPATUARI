import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function LineChart({ labels, datasets, height = 280, title }) {
  const data = {
    labels,
    datasets: datasets.map((ds, i) => ({
      label: ds.label,
      data: ds.data,
      borderColor: ds.color || (i === 0 ? '#1E6091' : '#00BCD4'),
      backgroundColor: ds.bgColor || (i === 0 ? 'rgba(30, 96, 145, 0.08)' : 'rgba(0, 188, 212, 0.08)'),
      borderWidth: 2.5,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: '#fff',
      pointBorderColor: ds.color || (i === 0 ? '#1E6091' : '#00BCD4'),
      pointBorderWidth: 2,
      tension: 0.4,
      fill: true,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: { family: 'Inter', size: 12, weight: 500 },
          color: '#64748B',
        },
      },
      title: title ? {
        display: true,
        text: title,
        align: 'start',
        font: { family: 'Plus Jakarta Sans', size: 14, weight: 700 },
        color: '#0A1628',
        padding: { bottom: 16 },
      } : { display: false },
      tooltip: {
        backgroundColor: '#0A1628',
        titleFont: { family: 'Inter', size: 12, weight: 600 },
        bodyFont: { family: 'Inter', size: 12 },
        cornerRadius: 8,
        padding: 12,
        displayColors: true,
        usePointStyle: true,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Inter', size: 11 }, color: '#94A3B8' },
        border: { display: false },
      },
      y: {
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: { font: { family: 'Inter', size: 11 }, color: '#94A3B8' },
        border: { display: false },
        beginAtZero: true,
      },
    },
  };

  return (
    <div style={{ height }}>
      <Line data={data} options={options} />
    </div>
  );
}
