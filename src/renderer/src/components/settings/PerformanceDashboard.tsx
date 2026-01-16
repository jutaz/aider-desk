import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { getPerformanceMetrics, clearPerformanceMetrics, PerformanceMetrics } from '@/hooks/usePerformanceMonitor';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const PerformanceDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refreshMetrics = () => {
    setMetrics(getPerformanceMetrics());
  };

  useEffect(() => {
    refreshMetrics();
    if (autoRefresh) {
      const interval = setInterval(refreshMetrics, 2000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const formatMemory = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const formatTime = (ms: number) => {
    return ms.toFixed(2) + ' ms';
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (!metrics) {
    return <div className="p-4">{t('performance.loading')}</div>;
  }

  // Prepare memory usage data
  const memoryData = metrics.memoryUsage.map((m, i) => ({
    time: formatTimestamp(m.timestamp),
    used: m.usedJSHeapSize / 1024 / 1024,
    total: m.totalJSHeapSize / 1024 / 1024,
    limit: m.jsHeapSizeLimit / 1024 / 1024,
  }));

  // Prepare render time data
  const renderTimeData = metrics.renderTimes.slice(-50).map((r, i) => ({
    time: formatTimestamp(r.timestamp),
    component: r.componentName,
    duration: r.actualDuration,
  }));

  // Prepare component metrics
  const componentData = metrics.componentMetrics.reduce((acc, m) => {
    const existing = acc.find(c => c.component === m.componentName);
    if (existing) {
      existing.renderCount = Math.max(existing.renderCount, m.renderCount);
      existing.averageRenderTime = m.averageRenderTime;
    } else {
      acc.push({
        component: m.componentName,
        renderCount: m.renderCount,
        averageRenderTime: m.averageRenderTime,
      });
    }
    return acc;
  }, [] as { component: string; renderCount: number; averageRenderTime: number }[]);

  // Prepare lazy loading metrics
  const lazyLoadingStats = metrics.lazyLoadingMetrics.reduce((acc, m) => {
    if (!acc[m.componentName]) {
      acc[m.componentName] = { expand: 0, collapse: 0, loadStart: 0, loadEnd: 0, totalLoadTime: 0, loadCount: 0 };
    }
    switch (m.action) {
      case 'expand':
        acc[m.componentName].expand++;
        break;
      case 'collapse':
        acc[m.componentName].collapse++;
        break;
      case 'load-start':
        acc[m.componentName].loadStart++;
        break;
      case 'load-end':
        acc[m.componentName].loadEnd++;
        if (m.duration) {
          acc[m.componentName].totalLoadTime += m.duration;
          acc[m.componentName].loadCount++;
        }
        break;
    }
    return acc;
  }, {} as Record<string, { expand: number; collapse: number; loadStart: number; loadEnd: number; totalLoadTime: number; loadCount: number }>);

  const lazyLoadingChartData = Object.entries(lazyLoadingStats).map(([component, stats]) => ({
    component,
    expand: stats.expand,
    collapse: stats.collapse,
    averageLoadTime: stats.loadCount > 0 ? stats.totalLoadTime / stats.loadCount : 0,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('performance.title')}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1 rounded ${autoRefresh ? 'bg-primary text-white' : 'bg-gray-200'}`}
          >
            {autoRefresh ? t('performance.autoRefreshOn') : t('performance.autoRefreshOff')}
          </button>
          <button
            onClick={refreshMetrics}
            className="px-3 py-1 bg-primary text-white rounded"
          >
            {t('performance.refresh')}
          </button>
          <button
            onClick={clearPerformanceMetrics}
            className="px-3 py-1 bg-red-500 text-white rounded"
          >
            {t('performance.clear')}
          </button>
        </div>
      </div>

      {/* Memory Usage Chart */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">{t('performance.memoryUsage')}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={memoryData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis label={{ value: 'Memory (MB)', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value: number) => formatMemory(value * 1024 * 1024)} />
            <Legend />
            <Line type="monotone" dataKey="used" stroke="#8884d8" name="Used Heap" />
            <Line type="monotone" dataKey="total" stroke="#82ca9d" name="Total Heap" />
            <Line type="monotone" dataKey="limit" stroke="#ff7300" name="Heap Limit" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Render Times Chart */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">{t('performance.renderTimes')}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={renderTimeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis label={{ value: 'Duration (ms)', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value: number) => formatTime(value)} />
            <Legend />
            <Line type="monotone" dataKey="duration" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Component Performance */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">{t('performance.componentPerformance')}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={componentData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="component" />
            <YAxis yAxisId="left" label={{ value: 'Render Count', angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" label={{ value: 'Avg Render Time (ms)', angle: 90, position: 'insideRight' }} />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="renderCount" fill="#8884d8" name="Render Count" />
            <Bar yAxisId="right" dataKey="averageRenderTime" fill="#82ca9d" name="Avg Render Time" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Lazy Loading Effectiveness */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">{t('performance.lazyLoading')}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={lazyLoadingChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="component" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="expand" fill="#8884d8" name="Expands" />
            <Bar dataKey="collapse" fill="#82ca9d" name="Collapses" />
            <Bar dataKey="averageLoadTime" fill="#ffc658" name="Avg Load Time (ms)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="font-semibold">{t('performance.totalRenders')}</h4>
          <p className="text-2xl">{metrics.renderTimes.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="font-semibold">{t('performance.averageRenderTime')}</h4>
          <p className="text-2xl">
            {metrics.renderTimes.length > 0
              ? formatTime(metrics.renderTimes.reduce((sum, r) => sum + r.actualDuration, 0) / metrics.renderTimes.length)
              : '0 ms'
            }
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="font-semibold">{t('performance.memorySamples')}</h4>
          <p className="text-2xl">{metrics.memoryUsage.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="font-semibold">{t('performance.lazyLoadActions')}</h4>
          <p className="text-2xl">{metrics.lazyLoadingMetrics.length}</p>
        </div>
      </div>
    </div>
  );
};