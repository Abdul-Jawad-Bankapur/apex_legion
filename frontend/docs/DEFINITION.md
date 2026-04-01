# Project Structure and Definitions

This file maps the codebase to its functional components.

## Core Files

- `/src/App.tsx`: The main application entry point. Contains the routing logic, state management, and all primary view components (Home, Market, LostFound, etc.).
- `/src/lib/firebase.ts`: Firebase initialization and authentication helpers.
- `/src/lib/gemini.ts`: Integration with Google Gemini API for image analysis, merit scoring, and chat support.
- `/src/types.ts`: TypeScript interfaces and enums used across the app.
- `/src/index.css`: Global Tailwind CSS styles and theme configuration.

## Component Definitions (within App.tsx)

- `HomeView`: The landing dashboard showing featured items and quick stats.
- `MarketplaceView`: The P2P commerce interface with category filtering and cart management.
- `LostFoundView`: The campus lost and found reporting system.
- `MeetupView`: The secure hotspot scheduler for physical handovers.
- `WorkspaceView`: The student profile and academic data management center.
- `InvestmentView`: The P2P "Human Equity" bidding platform.
- `SupportView`: The AI-powered chat interface.

## Database & Configuration

- `/firebase-blueprint.json`: The intermediate representation of the Firestore schema.
- `/firestore.rules`: The security rules governing data access.
- `/firebase-applet-config.json`: The project-specific Firebase credentials.
- `/requirements.txt`: A list of all required npm modules for easy reference.
- `/metadata.json`: Application metadata (name, description, permissions).
