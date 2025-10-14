# Technology Stack & Development Guidelines

## Architecture

**Frontend**: React 18 SPA with TypeScript
**Backend**: Node.js with Express
**Database**: SQLite (local storage for home users)
**Real-time**: WebSocket via Socket.io
**IoT Communication**: MQTT protocol

## Tech Stack

### Frontend
- **React 18** with TypeScript for type safety
- **Material-UI (MUI)** for consistent, accessible components
- **Chart.js** for data visualization
- **Socket.io-client** for real-time communication
- **React Router** for navigation
- **Vite** for fast development builds

### Backend
- **Node.js** with Express framework
- **Socket.io** for WebSocket communication
- **SQLite** for data persistence
- **MQTT client** for IoT device communication
- **JWT** for session management

### Development Tools
- **ESLint** and **Prettier** for code quality
- **TypeScript** throughout the stack
- **Jest** for unit testing
- **Cypress** for end-to-end testing

## Common Commands

### Development
```bash
# Frontend development server
npm run dev

# Backend development server
npm run dev:server

# Run both frontend and backend
npm run dev:full
```

### Testing
```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run end-to-end tests
npm run test:e2e

# Run all tests with coverage
npm run test:coverage
```

### Build & Deploy
```bash
# Build frontend for production
npm run build

# Build backend
npm run build:server

# Start production server
npm start
```

## Code Quality Standards

- **TypeScript**: Strict mode enabled, no `any` types
- **ESLint**: Airbnb config with React and TypeScript rules
- **Test Coverage**: Minimum 80% for critical paths
- **Component Testing**: Every React component must have unit tests
- **API Testing**: All endpoints require integration tests

## Performance Requirements

- Initial page load: < 3 seconds
- Device updates: < 10 seconds
- Control actions: < 5 seconds
- WebSocket reconnection: Automatic with exponential backoff
- Mobile performance: 60fps animations, touch-optimized