# Project Structure & Organization

## Root Structure

```
iot-dashboard/
├── frontend/                 # React TypeScript application
├── backend/                  # Node.js Express server
├── shared/                   # Shared TypeScript interfaces and utilities
├── docs/                     # Project documentation
├── .kiro/                    # Kiro configuration and specs
└── package.json              # Root package.json for workspace management
```

## Frontend Structure (`frontend/`)

```
frontend/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── DeviceCard/       # Individual device display
│   │   ├── DeviceControl/    # Device control panels
│   │   ├── NotificationCenter/ # Notification management
│   │   ├── Chart/            # Data visualization components
│   │   └── Layout/           # Layout and navigation components
│   ├── pages/                # Route-level components
│   │   ├── Dashboard/        # Main dashboard view
│   │   ├── DeviceManagement/ # Device setup and management
│   │   └── Settings/         # Application settings
│   ├── services/             # API and WebSocket clients
│   ├── hooks/                # Custom React hooks
│   ├── utils/                # Helper functions and utilities
│   ├── types/                # TypeScript type definitions
│   └── App.tsx               # Main application component
├── public/                   # Static assets
└── package.json
```

## Backend Structure (`backend/`)

```
backend/
├── src/
│   ├── controllers/          # Request handlers
│   ├── services/             # Business logic
│   │   ├── DeviceManager/    # Device management and MQTT
│   │   ├── DataStorage/      # Database operations
│   │   ├── NotificationService/ # Alert and notification logic
│   │   └── WebSocketHandler/ # Real-time communication
│   ├── models/               # Data models and interfaces
│   ├── middleware/           # Express middleware
│   ├── routes/               # API route definitions
│   ├── utils/                # Helper functions
│   └── server.ts             # Main server entry point
├── database/                 # SQLite database files
└── package.json
```

## Shared Structure (`shared/`)

```
shared/
├── types/                    # Common TypeScript interfaces
│   ├── Device.ts             # Device model definitions
│   ├── Notification.ts       # Notification interfaces
│   └── HistoricalData.ts     # Time-series data types
├── utils/                    # Shared utility functions
└── constants/                # Application constants
```

## Component Organization Guidelines

### Component Structure
- Each component gets its own folder with `index.ts`, `Component.tsx`, and `Component.test.tsx`
- Use barrel exports (`index.ts`) for clean imports
- Co-locate component-specific types and utilities

### Naming Conventions
- **Components**: PascalCase (`DeviceCard`, `NotificationCenter`)
- **Files**: PascalCase for components, camelCase for utilities
- **Folders**: PascalCase for component folders, camelCase for others
- **API Routes**: kebab-case (`/api/devices`, `/api/historical-data`)

### Import Organization
1. React and third-party libraries
2. Internal components and hooks
3. Services and utilities
4. Types and interfaces
5. Relative imports

### File Naming Patterns
- **Components**: `ComponentName.tsx`
- **Tests**: `ComponentName.test.tsx`
- **Types**: `types.ts` or `ComponentName.types.ts`
- **Services**: `serviceName.service.ts`
- **Utilities**: `utilityName.util.ts`

## Database Organization

### SQLite Schema
- **devices**: Device registry and configuration
- **historical_data**: Time-series device readings
- **notifications**: Alert and notification history
- **user_settings**: Application preferences

### Migration Strategy
- Use numbered migration files: `001_initial_schema.sql`
- Store migrations in `backend/database/migrations/`
- Implement rollback capabilities for schema changes