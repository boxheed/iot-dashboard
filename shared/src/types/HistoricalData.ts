/**
 * Historical data type definitions for the IoT Dashboard
 * These interfaces define the structure for time-series data
 * storage and retrieval for device monitoring and analytics.
 */

/**
 * Time range options for historical data queries
 */
export type TimeRange = '24h' | '7d' | '30d' | 'custom';

/**
 * Data aggregation methods for historical data
 */
export type AggregationMethod = 'avg' | 'min' | 'max' | 'sum' | 'count';

/**
 * Single historical data point
 */
export interface HistoricalData {
  /** ID of the device that generated this data */
  deviceId: string;
  /** Property key that was measured */
  property: string;
  /** The measured value */
  value: any;
  /** When this measurement was taken */
  timestamp: Date;
}

/**
 * Aggregated historical data point (for charts and summaries)
 */
export interface AggregatedDataPoint {
  /** Timestamp for this aggregated point */
  timestamp: Date;
  /** Aggregated value */
  value: number;
  /** Number of raw data points used in aggregation */
  count: number;
}

/**
 * Historical data query parameters
 */
export interface HistoricalDataQuery {
  /** Device ID to query data for */
  deviceId: string;
  /** Property key to retrieve */
  property: string;
  /** Start date for the query range */
  startDate: Date;
  /** End date for the query range */
  endDate: Date;
  /** Optional aggregation method */
  aggregation?: AggregationMethod;
  /** Optional interval for aggregation (in minutes) */
  intervalMinutes?: number;
  /** Maximum number of data points to return */
  limit?: number;
}

/**
 * Historical data response with metadata
 */
export interface HistoricalDataResponse {
  /** The requested device ID */
  deviceId: string;
  /** The requested property */
  property: string;
  /** Query parameters used */
  query: HistoricalDataQuery;
  /** Array of data points */
  data: HistoricalData[] | AggregatedDataPoint[];
  /** Total number of raw data points available */
  totalCount: number;
  /** Whether the data was aggregated */
  isAggregated: boolean;
}

/**
 * Chart data format for visualization components
 */
export interface ChartDataPoint {
  /** X-axis value (typically timestamp) */
  x: Date | string | number;
  /** Y-axis value */
  y: number;
  /** Optional label for the data point */
  label?: string;
}

/**
 * Chart dataset for multi-series charts
 */
export interface ChartDataset {
  /** Dataset label */
  label: string;
  /** Array of data points */
  data: ChartDataPoint[];
  /** Optional color for the dataset */
  color?: string;
  /** Unit of measurement for this dataset */
  unit?: string;
}

/**
 * Complete chart data structure
 */
export interface ChartData {
  /** Array of datasets */
  datasets: ChartDataset[];
  /** Time range covered by the data */
  timeRange: TimeRange;
  /** Start date of the data */
  startDate: Date;
  /** End date of the data */
  endDate: Date;
}

/**
 * Data export request
 */
export interface DataExportRequest {
  /** Device ID to export data for */
  deviceId: string;
  /** Properties to include in export */
  properties: string[];
  /** Start date for export */
  startDate: Date;
  /** End date for export */
  endDate: Date;
  /** Export format */
  format: 'csv' | 'json';
}