

Run and Deploy your app
This repository contains everything you need to run your AI-powered application locally and deploy it.


🚀 Getting Started
Prerequisites
Node.js (Latest LTS recommended)

An active Gemini API Key

Local Installation
Clone the repository and install dependencies:

Bash

npm install
Configure Environment Variables: Create a .env.local file in the root directory (if not already present) and add your API key:

Code snippet

GEMINI_API_KEY=your_api_key_here
Launch the Development Server:

Bash

npm run dev
The app should now be running at http://localhost:5173 (or the port specified in your terminal).

📂 Project Structure
Plaintext

/ (Project Root)
├── components/           # Reusable UI Components
│   ├── BottomNav.tsx     # Mobile bottom navigation bar
│   ├── Navbar.tsx        # Top navigation and search bar
│   ├── Sidebar.tsx       # Collapsible side menu
│   ├── SmartVideoPlayer.tsx # Video player with custom controls + shortcuts
│   └── VideoCard.tsx     # Individual video thumbnail component
│
├── pages/                # Route pages (React Router)
│   ├── AdminPage.tsx      # Admin dashboard + video management
│   ├── HelpPage.tsx       # FAQ + keyboard shortcuts
│   ├── HistoryPage.tsx    # Watch history
│   ├── LikedVideosPage.tsx # Liked videos
│   ├── LoginPage.tsx      # Auth: login
│   ├── NotFoundPage.tsx   # 404 (doodle) fallback page
│   ├── ProfilePage.tsx    # User profile
│   ├── SettingsPage.tsx   # Playback preferences (localStorage)
│   ├── ShortsPage.tsx     # Shorts viewer
│   ├── SignupPage.tsx     # Auth: signup
│   ├── WatchLaterPage.tsx # Saved videos
│   └── WatchPage.tsx      # Watch video + details + comments
│
├── lib/                  # Client-side Utilities & Helpers
│   ├── api.ts            # HTTP API helpers (admin + user endpoints)
│   ├── authStorage.ts    # Token/user localStorage management
│   ├── localUserData.ts  # Local likes/saves/history fallback
│   └── settingsStorage.ts # Playback settings localStorage
│
├── App.tsx               # Main application layout and routing logic
├── constants.ts          # Mock video data and configuration
├── index.html            # Main HTML entry point
├── index.tsx             # React entry point (mounts App to DOM)
├── metadata.json         # App metadata description
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── types.ts              # TypeScript interfaces/definitions
└── vite.config.ts        # Vite build tool configuration
🛠️ Built With
Vite - Frontend Tooling

React - UI Framework

TypeScript - Type Safety

Google Gemini API - AI Integration
