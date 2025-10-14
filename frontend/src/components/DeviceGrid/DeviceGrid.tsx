import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Button,
  Paper,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { Device } from '../../../../shared/src/types/Device';
import { DeviceCard } from '../DeviceCard';
import { DeviceControlPanel } from '../DeviceControl';

export interface DeviceGridProps {
  devices: Device[];
  onDeviceClick?: (device: Device) => void;
  onControlChange: (deviceId: string, controlKey: string, value: any) => Promise<void>;
  onAddDevice?: () => void;
  loading?: boolean;
}

type SortOption = 'name' | 'room' | 'type' | 'status' | 'lastSeen';
type FilterOption = 'all' | 'online' | 'offline' | 'error';

export const DeviceGrid: React.FC<DeviceGridProps> = ({
  devices,
  onDeviceClick,
  onControlChange,
  onAddDevice,
  loading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [controlPanelOpen, setControlPanelOpen] = useState(false);

  // Get unique rooms and types for filtering
  const rooms = useMemo(() => {
    const uniqueRooms = Array.from(new Set(devices.map(device => device.room)));
    return uniqueRooms.sort();
  }, [devices]);

  const deviceTypes = useMemo(() => {
    const uniqueTypes = Array.from(new Set(devices.map(device => device.type)));
    return uniqueTypes.sort();
  }, [devices]);

  // Filter and sort devices
  const filteredAndSortedDevices = useMemo(() => {
    let filtered = devices;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(device =>
        device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.room.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(device => device.status === filterBy);
    }

    // Apply room filter
    if (selectedRoom !== 'all') {
      filtered = filtered.filter(device => device.room === selectedRoom);
    }

    // Apply type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(device => device.type === selectedType);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'room':
          return a.room.localeCompare(b.room);
        case 'type':
          return a.type.localeCompare(b.type);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'lastSeen':
          return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [devices, searchTerm, sortBy, filterBy, selectedRoom, selectedType]);

  const handleDeviceClick = (device: Device) => {
    setSelectedDevice(device);
    setControlPanelOpen(true);
    onDeviceClick?.(device);
  };

  const handleControlPanelClose = () => {
    setControlPanelOpen(false);
    setSelectedDevice(null);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSortBy('name');
    setFilterBy('all');
    setSelectedRoom('all');
    setSelectedType('all');
  };

  const hasActiveFilters = searchTerm || filterBy !== 'all' || selectedRoom !== 'all' || selectedType !== 'all';

  // Empty state when no devices
  if (!loading && devices.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          textAlign: 'center',
          p: 4,
        }}
      >
        <Typography variant="h5" gutterBottom color="text.secondary">
          No devices connected
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Get started by adding your first smart home device to the dashboard.
        </Typography>
        {onAddDevice && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAddDevice}
            size="large"
          >
            Add Device
          </Button>
        )}
      </Box>
    );
  }

  // Empty state when no devices match filters
  if (!loading && devices.length > 0 && filteredAndSortedDevices.length === 0) {
    return (
      <Box>
        {/* Filter Controls */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            <TextField
              placeholder="Search devices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{ minWidth: 200 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Sort by</InputLabel>
              <Select
                value={sortBy}
                label="Sort by"
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="room">Room</MenuItem>
                <MenuItem value="type">Type</MenuItem>
                <MenuItem value="status">Status</MenuItem>
                <MenuItem value="lastSeen">Last Seen</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterBy}
                label="Status"
                onChange={(e) => setFilterBy(e.target.value as FilterOption)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="online">Online</MenuItem>
                <MenuItem value="offline">Offline</MenuItem>
                <MenuItem value="error">Error</MenuItem>
              </Select>
            </FormControl>

            {rooms.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Room</InputLabel>
                <Select
                  value={selectedRoom}
                  label="Room"
                  onChange={(e) => setSelectedRoom(e.target.value)}
                >
                  <MenuItem value="all">All Rooms</MenuItem>
                  {rooms.map(room => (
                    <MenuItem key={room} value={room}>{room}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {deviceTypes.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={selectedType}
                  label="Type"
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  {deviceTypes.map(type => (
                    <MenuItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {hasActiveFilters && (
              <Button
                variant="outlined"
                size="small"
                onClick={clearFilters}
                startIcon={<FilterIcon />}
              >
                Clear Filters
              </Button>
            )}

            {onAddDevice && (
              <Button
                variant="contained"
                size="small"
                onClick={onAddDevice}
                startIcon={<AddIcon />}
                sx={{ ml: 'auto' }}
              >
                Add Device
              </Button>
            )}
          </Box>
        </Paper>

        {/* No results message */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '200px',
            textAlign: 'center',
            p: 4,
          }}
        >
          <Typography variant="h6" gutterBottom color="text.secondary">
            No devices match your filters
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Try adjusting your search terms or filters to find devices.
          </Typography>
          <Button variant="outlined" onClick={clearFilters}>
            Clear All Filters
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      {/* Filter Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Search devices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Sort by</InputLabel>
            <Select
              value={sortBy}
              label="Sort by"
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="room">Room</MenuItem>
              <MenuItem value="type">Type</MenuItem>
              <MenuItem value="status">Status</MenuItem>
              <MenuItem value="lastSeen">Last Seen</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterBy}
              label="Status"
              onChange={(e) => setFilterBy(e.target.value as FilterOption)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="online">Online</MenuItem>
              <MenuItem value="offline">Offline</MenuItem>
              <MenuItem value="error">Error</MenuItem>
            </Select>
          </FormControl>

          {rooms.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Room</InputLabel>
              <Select
                value={selectedRoom}
                label="Room"
                onChange={(e) => setSelectedRoom(e.target.value)}
              >
                <MenuItem value="all">All Rooms</MenuItem>
                {rooms.map(room => (
                  <MenuItem key={room} value={room}>{room}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {deviceTypes.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={selectedType}
                label="Type"
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                {deviceTypes.map(type => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {hasActiveFilters && (
            <Button
              variant="outlined"
              size="small"
              onClick={clearFilters}
              startIcon={<FilterIcon />}
            >
              Clear Filters
            </Button>
          )}

          {onAddDevice && (
            <Button
              variant="contained"
              size="small"
              onClick={onAddDevice}
              startIcon={<AddIcon />}
              sx={{ ml: 'auto' }}
            >
              Add Device
            </Button>
          )}
        </Box>

        {/* Active filters display */}
        {hasActiveFilters && (
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {searchTerm && (
              <Chip
                label={`Search: ${searchTerm}`}
                onDelete={() => setSearchTerm('')}
                size="small"
              />
            )}
            {filterBy !== 'all' && (
              <Chip
                label={`Status: ${filterBy}`}
                onDelete={() => setFilterBy('all')}
                size="small"
              />
            )}
            {selectedRoom !== 'all' && (
              <Chip
                label={`Room: ${selectedRoom}`}
                onDelete={() => setSelectedRoom('all')}
                size="small"
              />
            )}
            {selectedType !== 'all' && (
              <Chip
                label={`Type: ${selectedType}`}
                onDelete={() => setSelectedType('all')}
                size="small"
              />
            )}
          </Box>
        )}
      </Paper>

      {/* Results count */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredAndSortedDevices.length} of {devices.length} devices
        </Typography>
      </Box>

      {/* Device Grid */}
      <Grid container spacing={3}>
        {filteredAndSortedDevices.map((device) => (
          <Grid
            item
            key={device.id}
            xs={12}
            sm={6}
            md={4}
            lg={3}
            xl={2}
          >
            <DeviceCard
              device={device}
              onDeviceClick={handleDeviceClick}
              onControlChange={onControlChange}
            />
          </Grid>
        ))}
      </Grid>

      {/* Device Control Panel */}
      <DeviceControlPanel
        device={selectedDevice}
        open={controlPanelOpen}
        onClose={handleControlPanelClose}
        onUpdate={onControlChange}
      />
    </Box>
  );
};