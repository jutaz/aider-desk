import { useCallback, useEffect, useRef, useState } from 'react';

// Types for performance metrics
export interface PerformanceMetrics {
  memoryUsage: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    timestamp: number;
  }[];
  renderTimes: {
    componentName: string;
    phase: 'mount' | 'update' | 'unmount';
    actualDuration: number;
    baseDuration: number;
    startTime: number;
    commitTime: number;
    timestamp: number;
  }[];
  lazyLoadingMetrics: {
    componentName: string;
    action: 'expand' | 'collapse' | 'load-start' | 'load-end';
    duration?: number;
    itemCount?: number;
    timestamp: number;
  }[];
  componentMetrics: {
    componentName: string;
    mountTime: number;
    renderCount: number;
    lastRenderTime: number;
    averageRenderTime: number;
    timestamp: number;
  }[];
}

export interface PerformanceMonitorConfig {
  trackMemory?: boolean;
  trackRenders?: boolean;
  trackLazyLoading?: boolean;
  maxMetricsHistory?: number;
  memorySampleInterval?: number;
}

const DEFAULT_CONFIG: Required<PerformanceMonitorConfig> = {
  trackMemory: true,
  trackRenders: true,
  trackLazyLoading: true,
  maxMetricsHistory: 1000,
  memorySampleInterval: 5000, // 5 seconds
};

// Global metrics store
let globalMetrics: PerformanceMetrics = {
  memoryUsage: [],
  renderTimes: [],
  lazyLoadingMetrics: [],
  componentMetrics: [],
};

let globalConfig: Required<PerformanceMonitorConfig> = DEFAULT_CONFIG;
let memorySamplingInterval: NodeJS.Timeout | null = null;

// Utility functions
const getMemoryUsage = () => {
  if ('memory' in performance) {
    const mem = (performance as any).memory;
    return {
      usedJSHeapSize: mem.usedJSHeapSize,
      totalJSHeapSize: mem.totalJSHeapSize,
      jsHeapSizeLimit: mem.jsHeapSizeLimit,
      timestamp: Date.now(),
    };
  }
  return null;
};

const addMetric = <K extends keyof PerformanceMetrics>(
  key: K,
  metric: PerformanceMetrics[K][0]
) => {
  globalMetrics[key].push(metric);
  // Keep only the last maxMetricsHistory items
  if (globalMetrics[key].length > globalConfig.maxMetricsHistory) {
    globalMetrics[key] = globalMetrics[key].slice(-globalConfig.maxMetricsHistory);
  }
};

const startMemorySampling = () => {
  if (memorySamplingInterval || !globalConfig.trackMemory) return;

  memorySamplingInterval = setInterval(() => {
    const memory = getMemoryUsage();
    if (memory) {
      addMetric('memoryUsage', memory);
    }
  }, globalConfig.memorySampleInterval);
};

const stopMemorySampling = () => {
  if (memorySamplingInterval) {
    clearInterval(memorySamplingInterval);
    memorySamplingInterval = null;
  }
};

// Export functions for external access
export const getPerformanceMetrics = (): PerformanceMetrics => ({ ...globalMetrics });

export const clearPerformanceMetrics = () => {
  globalMetrics = {
    memoryUsage: [],
    renderTimes: [],
    lazyLoadingMetrics: [],
    componentMetrics: [],
  };
};

export const configurePerformanceMonitor = (config: Partial<PerformanceMonitorConfig>) => {
  globalConfig = { ...globalConfig, ...config };

  if (globalConfig.trackMemory) {
    startMemorySampling();
  } else {
    stopMemorySampling();
  }
};

// Hook for component-level performance monitoring
export const usePerformanceMonitor = (componentName: string) => {
  const mountTimeRef = useRef<number>(Date.now());
  const renderCountRef = useRef<number>(0);
  const renderTimesRef = useRef<number[]>([]);
  const [isEnabled, setIsEnabled] = useState(globalConfig.trackRenders);

  useEffect(() => {
    mountTimeRef.current = Date.now();
    addMetric('componentMetrics', {
      componentName,
      mountTime: mountTimeRef.current,
      renderCount: 0,
      lastRenderTime: 0,
      averageRenderTime: 0,
      timestamp: mountTimeRef.current,
    });

    return () => {
      // Cleanup on unmount
      addMetric('renderTimes', {
        componentName,
        phase: 'unmount',
        actualDuration: 0,
        baseDuration: 0,
        startTime: 0,
        commitTime: 0,
        timestamp: Date.now(),
      });
    };
  }, [componentName]);

  const onRender = useCallback(
    (
      id: string,
      phase: 'mount' | 'update',
      actualDuration: number,
      baseDuration: number,
      startTime: number,
      commitTime: number
    ) => {
      if (!isEnabled) return;

      renderCountRef.current++;
      renderTimesRef.current.push(actualDuration);

      addMetric('renderTimes', {
        componentName,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime,
        timestamp: Date.now(),
      });

      // Update component metrics
      const averageRenderTime = renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length;
      addMetric('componentMetrics', {
        componentName,
        mountTime: mountTimeRef.current,
        renderCount: renderCountRef.current,
        lastRenderTime: actualDuration,
        averageRenderTime,
        timestamp: Date.now(),
      });
    },
    [componentName, isEnabled]
  );

  const trackLazyLoading = useCallback(
    (action: 'expand' | 'collapse' | 'load-start' | 'load-end', duration?: number, itemCount?: number) => {
      if (!globalConfig.trackLazyLoading) return;

      addMetric('lazyLoadingMetrics', {
        componentName,
        action,
        duration,
        itemCount,
        timestamp: Date.now(),
      });
    },
    [componentName]
  );

  const getComponentMetrics = useCallback(() => {
    return globalMetrics.componentMetrics.filter((m) => m.componentName === componentName);
  }, [componentName]);

  const getRenderMetrics = useCallback(() => {
    return globalMetrics.renderTimes.filter((m) => m.componentName === componentName);
  }, [componentName]);

  const getLazyLoadingMetrics = useCallback(() => {
    return globalMetrics.lazyLoadingMetrics.filter((m) => m.componentName === componentName);
  }, [componentName]);

  return {
    onRender,
    trackLazyLoading,
    getComponentMetrics,
    getRenderMetrics,
    getLazyLoadingMetrics,
    isEnabled,
    setIsEnabled,
  };
};

// Profiler wrapper component
export const PerformanceProfiler: React.FC<{
  componentName: string;
  children: React.ReactNode;
  onRender?: (
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => void;
}> = ({ componentName, children, onRender }) => {
  const { onRender: hookOnRender } = usePerformanceMonitor(componentName);

  const handleRender = useCallback(
    (
      id: string,
      phase: 'mount' | 'update',
      actualDuration: number,
      baseDuration: number,
      startTime: number,
      commitTime: number
    ) => {
      hookOnRender(id, phase, actualDuration, baseDuration, startTime, commitTime);
      onRender?.(id, phase, actualDuration, baseDuration, startTime, commitTime);
    },
    [hookOnRender, onRender]
  );

  return (
    <React.Profiler id={componentName} onRender={handleRender}>
      {children}
    </React.Profiler>
  );
};