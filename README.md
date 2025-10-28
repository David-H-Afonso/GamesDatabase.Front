# Games Database - Frontend

A modern web application for managing and organizing your personal game collection. Built with React 19 and TypeScript, this application provides an intuitive interface for cataloging games, tracking playtime, managing ratings, and organizing your gaming library.

## Features

- **Comprehensive Game Management**: Add, edit, and organize your game collection with detailed information
- **Advanced Filtering & Search**: Search by title with accent-insensitive matching, filter by platform, status, play mode, and more
- **Custom Views**: Create and save custom filtered views for quick access to specific game lists
- **Ratings & Reviews**: Track personal grades, critic scores, story ratings, and completion percentages
- **Visual Organization**: Card and row view modes with cover art and logo support
- **Price Tracking**: Mark games as cheaper via key stores with optional store URLs
- **Multi-User Support**: User authentication with JWT tokens and personalized game libraries
- **Data Export**: Export your game data in JSON or CSV formats
- **Responsive Design**: Optimized for desktop and mobile devices
- **Dark/Light Themes**: Customizable appearance with theme support

## Tech Stack

- **Frontend Framework**: React 19 with TypeScript
- **State Management**: Redux Toolkit with RTK Query
- **Routing**: React Router DOM 7
- **Styling**: SCSS with custom themes
- **Build Tool**: Vite 7
- **Package Manager**: npm

## Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- A compatible backend API (see [GamesDatabase.Api](https://github.com/David-H-Afonso/GamesDatabase.Api))

## Local Installation

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/David-H-Afonso/GamesDatabase.Front
   cd GamesDatabase.Front
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment**

   Create a `.env` file in the root directory:

   ```env
   VITE_API_URL=http://localhost:8080/api
   ```

## Development

### Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Available Scripts

```bash
# Type checking and build
npm run build

# Linting
npm run lint

# Preview production build
npm run preview
```

## Production Build

### Create Production Build

```bash
npm run build
```

The build output will be generated in the `dist/` directory, ready for deployment to any static hosting service.

### Environment Configuration

For production deployments, ensure the `VITE_API_URL` environment variable points to your backend API endpoint.

## Project Structure

```
src/
├── assets/          # Static assets (images, icons, styles)
├── components/      # React components
│   ├── elements/    # Reusable UI elements
│   └── Home/        # Main application views
├── hooks/           # Custom React hooks
├── layouts/         # Layout components
├── models/          # TypeScript interfaces and types
├── navigation/      # Routing configuration
├── providers/       # Context providers
├── services/        # API services
├── store/           # Redux store configuration
└── utils/           # Utility functions
```

## Key Features

### Game Cataloging

- Add games with comprehensive metadata (title, release date, platforms, etc.)
- Upload or link cover art and logos
- Track played status, completion dates, and playtime
- Organize games with custom tags and categories

### Filtering and Search

- Real-time search with accent-insensitive matching
- Multi-criteria filtering (status, platform, year, ratings)
- Exclude specific statuses from results
- Save custom filter combinations as views

### User Management

- Secure authentication with JWT tokens
- User-specific game libraries and preferences
- Remember recent users for quick switching

### Data Management

- Export game data in JSON or CSV formats
- Batch operations for multiple games
- Duplicate detection and management

## Upcoming Features

The following features are planned for future releases:

- First-time setup wizard for new users
- Enhanced card UI with better overflow handling
- Custom score calculation formulas
- Game duplication functionality
- Internationalization (i18n) support
- Keyboard shortcuts for common actions

For a detailed list of pending features, see [PENDING_FEATURES.md](PENDING_FEATURES.md).

## API Integration

This frontend application requires the Games Database API backend. Ensure the API is running and accessible at the URL specified in your environment configuration.

For backend setup instructions, visit: [GamesDatabase.Api](https://github.com/David-H-Afonso/GamesDatabase.Api)

## Contributing

Contributions are welcome. Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -m 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE.md](LICENSE.md) file for details.

---

**Built with ❤️ for Gamers worldwide**
