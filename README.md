# IoT Dashboard

A web-based smart home dashboard for monitoring and controlling IoT devices.

## Features

- Real-time device monitoring and control
- Smart notifications and alerts
- Historical data visualization
- Mobile-responsive design
- Simple device setup and management

## Tech Stack

- **Frontend**: React 18 + TypeScript + Material-UI + Vite
- **Backend**: Node.js + Express + Socket.io
- **Database**: SQLite
- **IoT Communication**: MQTT

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd iot-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration
```

4. Start the development servers:
```bash
npm run dev:full
```

This will start both the frontend (http://localhost:3000) and backend (http://localhost:3001) servers.

### Development Commands

- `npm run dev` - Start frontend development server
- `npm run dev:server` - Start backend development server
- `npm run dev:full` - Start both frontend and backend
- `npm test` - Run tests
- `npm run lint` - Run linting
- `npm run build` - Build for production

## Project Structure

```
iot-dashboard/
├── frontend/          # React TypeScript application
├── backend/           # Node.js Express server
├── shared/            # Shared TypeScript interfaces
└── docs/              # Documentation
```

## Contributing

1. Follow the existing code style and conventions
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass before submitting

## License

This project is licensed under the MIT License.