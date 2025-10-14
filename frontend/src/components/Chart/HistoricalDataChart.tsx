/**
 * Historical Data Chart Component
 * 
 * Displays time-series data for IoT devices using Chart.js
 * Supports multiple time ranges, zoom/pan interactions, and data export
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';
import {
  Box,
  Card,
  CardContent,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
  Skeleton,
  Button,
  Menu,
  MenuItem,
  IconButton,
  Tooltip as MuiTooltip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  RestartAlt as ResetZoomIcon,
} from '@mui/icons-material';
import { TimeRange, HistoricalData } from '@shared/types/HistoricalData';
import { Device } from '@shared/types/Device';
import { historicalDataApi } from '../../services';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  zoomPlugin
);

export interface HistoricalDataChartProps {
  /** Device to display data for */
  device: Device;
  /** Property to chart (defaults to first available property) */
  property?: string;
  /** Initial time range */
  initialTimeRange?: TimeRange;
  /** Chart height in pixels */
  height?: number;
  /** Whether to show time range selector */
  showTimeRangeSelector?: boolean;
  /** Whether to show zoom controls */
  showZoomControls?: boolean;
  /** Whether to show export button */
  showExportButton?: boolean;
  /** Custom title for the chart */
  title?: string;
}

const HistoricalDataChart: React.FC<HistoricalDataChartProps> = ({
  device,
  property,
  initialTimeRange = '24h',
  height = 400,
  showTimeRangeSelector = true,
  showZoomControls = true,
  showExportButton = true,
  title,
}) => {
  const chartRef = useRef<ChartJS<'line'>>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);

  // Determine which property to chart
  const chartProperty = useMemo(() => {
    if (property) return property;
    if (device.properties.length > 0) return device.properties[0].key;
    return 'value';
  }, [property, device.properties]);

  // Get property unit for display
  const propertyUnit = useMemo(() => {
    const prop = device.properties.find(p => p.key === chartProperty);
    return prop?.unit || '';
  }, [device.properties, chartProperty]);

  // Fetch historical data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await historicalDataApi.getHistoricalDataByTimeRange(
        device.id,
        chartProperty,
        timeRange
      );

      setHistoricalData(response.data as HistoricalData[]);
    } catch (err) {
      console.error('Error fetching historical data:', err);
      setError('Failed to load historical data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when device, property, or time range changes
  useEffect(() => {
    fetchData();
  }, [device.id, chartProperty, timeRange]);

  // Handle time range change
  const handleTimeRangeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newTimeRange: TimeRange | null
  ) => {
    if (newTimeRange) {
      setTimeRange(newTimeRange);
    }
  };

  // Zoom control handlers
  const handleZoomIn = () => {
    if (chartRef.current) {
      chartRef.current.zoom(1.1);
    }
  };

  const handleZoomOut = () => {
    if (chartRef.current) {
      chartRef.current.zoom(0.9);
    }
  };

  const handleResetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
  };

  // Export functionality
  const handleExportClick = (event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportMenuAnchor(null);
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Timestamp', 'Value', 'Unit'].join(','),
      ...historicalData.map(point => [
        new Date(point.timestamp).toISOString(),
        point.value,
        propertyUnit || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${device.name}_${chartProperty}_${timeRange}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    handleExportClose();
  };

  const exportToJSON = () => {
    const jsonData = {
      device: {
        id: device.id,
        name: device.name,
        type: device.type,
      },
      property: chartProperty,
      unit: propertyUnit,
      timeRange,
      exportDate: new Date().toISOString(),
      data: historicalData.map(point => ({
        timestamp: point.timestamp,
        value: point.value,
      })),
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${device.name}_${chartProperty}_${timeRange}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    handleExportClose();
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    const dataPoints = historicalData.map(point => ({
      x: new Date(point.timestamp).getTime(),
      y: typeof point.value === 'number' ? point.value : parseFloat(point.value) || 0,
    }));

    return {
      datasets: [
        {
          label: `${device.name} - ${chartProperty}${propertyUnit ? ` (${propertyUnit})` : ''}`,
          data: dataPoints,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderWidth: 2,
          fill: false,
          tension: 0.1,
          pointRadius: 2,
          pointHoverRadius: 4,
        },
      ],
    };
  }, [historicalData, device.name, chartProperty, propertyUnit]);

  // Chart options with zoom and pan
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: !!title,
        text: title,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.y;
            const unit = propertyUnit ? ` ${propertyUnit}` : '';
            return `${context.dataset.label}: ${value}${unit}`;
          },
          afterLabel: (context: any) => {
            const timestamp = new Date(context.parsed.x);
            return `Time: ${timestamp.toLocaleString()}`;
          },
        },
      },
      zoom: {
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true,
          },
          mode: 'x' as const,
        },
        pan: {
          enabled: true,
          mode: 'x' as const,
        },
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          displayFormats: {
            hour: 'MMM dd, HH:mm',
            day: 'MMM dd',
            week: 'MMM dd',
            month: 'MMM yyyy',
          },
        },
        title: {
          display: true,
          text: 'Time',
        },
      },
      y: {
        title: {
          display: true,
          text: propertyUnit || 'Value',
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  }), [title, propertyUnit]);

  // Time range options
  const timeRangeOptions = [
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
  ];

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="h3">
            {title || `${device.name} History`}
          </Typography>
          
          <Box display="flex" gap={1} alignItems="center">
            {showZoomControls && !loading && !error && historicalData.length > 0 && (
              <Box display="flex" gap={0.5}>
                <MuiTooltip title="Zoom In">
                  <IconButton size="small" onClick={handleZoomIn}>
                    <ZoomInIcon />
                  </IconButton>
                </MuiTooltip>
                <MuiTooltip title="Zoom Out">
                  <IconButton size="small" onClick={handleZoomOut}>
                    <ZoomOutIcon />
                  </IconButton>
                </MuiTooltip>
                <MuiTooltip title="Reset Zoom">
                  <IconButton size="small" onClick={handleResetZoom}>
                    <ResetZoomIcon />
                  </IconButton>
                </MuiTooltip>
              </Box>
            )}

            {showExportButton && !loading && !error && historicalData.length > 0 && (
              <>
                <MuiTooltip title="Export Data">
                  <IconButton size="small" onClick={handleExportClick}>
                    <DownloadIcon />
                  </IconButton>
                </MuiTooltip>
                <Menu
                  anchorEl={exportMenuAnchor}
                  open={Boolean(exportMenuAnchor)}
                  onClose={handleExportClose}
                >
                  <MenuItem onClick={exportToCSV}>Export as CSV</MenuItem>
                  <MenuItem onClick={exportToJSON}>Export as JSON</MenuItem>
                </Menu>
              </>
            )}

            {showTimeRangeSelector && (
              <ToggleButtonGroup
                value={timeRange}
                exclusive
                onChange={handleTimeRangeChange}
                size="small"
                aria-label="time range selector"
              >
                {timeRangeOptions.map(option => (
                  <ToggleButton
                    key={option.value}
                    value={option.value}
                    aria-label={option.label}
                  >
                    {option.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            )}
          </Box>
        </Box>

        <Box height={height} position="relative">
          {loading && (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              height="100%"
              gap={2}
            >
              <CircularProgress />
              <Typography variant="body2" color="text.secondary">
                Loading historical data...
              </Typography>
            </Box>
          )}

          {error && !loading && (
            <Alert 
              severity="error" 
              action={
                <Button
                  size="small"
                  onClick={fetchData}
                >
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {!loading && !error && historicalData.length === 0 && (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              height="100%"
              textAlign="center"
            >
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Data Available
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Historical data will appear here once your device starts reporting values.
                Data collection may take a few minutes to begin.
              </Typography>
            </Box>
          )}

          {!loading && !error && historicalData.length > 0 && (
            <Line ref={chartRef} data={chartData} options={chartOptions} />
          )}

          {loading && (
            <Box position="absolute" top={0} left={0} right={0} bottom={0}>
              <Skeleton variant="rectangular" width="100%" height="100%" />
            </Box>
          )}
        </Box>

        {!loading && !error && historicalData.length > 0 && (
          <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary">
              Showing {historicalData.length} data points over the last {timeRangeOptions.find(opt => opt.value === timeRange)?.label.toLowerCase()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Use mouse wheel to zoom, drag to pan
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default HistoricalDataChart;