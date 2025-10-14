/**
 * API service for making HTTP requests to the backend
 * Handles device management, historical data, and other REST API calls
 */

import axios, { AxiosResponse } from 'axios';
import { Device, DeviceCommand, DeviceRegistration } from '@shared/types/Device';
import { HistoricalDataQuery, HistoricalDataResponse, TimeRange } from '@shared/types/HistoricalData';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response wrapper interface
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

/**
 * Device API methods
 */
export const deviceApi = {
  /**
   * Get all devices
   */
  async getDevices(): Promise<Device[]> {
    const response: AxiosResponse<ApiResponse<Device[]>> = await api.get('/devices');
    return response.data.data;
  },

  /**
   * Get a specific device by ID
   */
  async getDevice(id: string): Promise<Device> {
    const response: AxiosResponse<ApiResponse<Device>> = await api.get(`/devices/${id}`);
    return response.data.data;
  },

  /**
   * Register a new device
   */
  async addDevice(registration: DeviceRegistration): Promise<Device> {
    const response: AxiosResponse<ApiResponse<Device>> = await api.post('/devices', registration);
    return response.data.data;
  },

  /**
   * Update device information
   */
  async updateDevice(id: string, updates: Partial<Device>): Promise<Device> {
    const response: AxiosResponse<ApiResponse<Device>> = await api.put(`/devices/${id}`, updates);
    return response.data.data;
  },

  /**
   * Send a command to a device
   */
  async sendCommand(command: DeviceCommand): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await api.put(`/devices/${command.deviceId}`, {
      command: {
        controlKey: command.controlKey,
        value: command.value,
      },
    });
    return response.data.data;
  },

  /**
   * Remove a device
   */
  async removeDevice(id: string): Promise<void> {
    await api.delete(`/devices/${id}`);
  },

  /**
   * Get devices by room
   */
  async getDevicesByRoom(room: string): Promise<Device[]> {
    const response: AxiosResponse<ApiResponse<Device[]>> = await api.get(`/devices/room/${room}`);
    return response.data.data;
  },

  /**
   * Get devices by type
   */
  async getDevicesByType(type: string): Promise<Device[]> {
    const response: AxiosResponse<ApiResponse<Device[]>> = await api.get(`/devices/type/${type}`);
    return response.data.data;
  },
};

/**
 * Historical data API methods
 */
export const historicalDataApi = {
  /**
   * Get historical data for a device
   */
  async getHistoricalData(query: HistoricalDataQuery): Promise<HistoricalDataResponse> {
    const params = new URLSearchParams({
      property: query.property,
      startDate: query.startDate.toISOString(),
      endDate: query.endDate.toISOString(),
    });

    if (query.limit) {
      params.append('limit', query.limit.toString());
    }

    const response: AxiosResponse<ApiResponse<any>> = await api.get(
      `/devices/${query.deviceId}/history?${params.toString()}`
    );

    return {
      deviceId: query.deviceId,
      property: query.property,
      query,
      data: response.data.data,
      totalCount: response.data.count || 0,
      isAggregated: false,
    };
  },

  /**
   * Get historical data for a specific time range
   */
  async getHistoricalDataByTimeRange(
    deviceId: string,
    property: string,
    timeRange: TimeRange
  ): Promise<HistoricalDataResponse> {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    return this.getHistoricalData({
      deviceId,
      property,
      startDate,
      endDate: now,
    });
  },
};

// Export the configured axios instance for custom requests
export { api };