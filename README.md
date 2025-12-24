# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1rY6eXF-ocgcyhT32xpPce9PvvC2Jpe4p

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

File system 

/ (Project Root)
│
├── components/                 # UI Components
│   ├── BottomNav.tsx           # Mobile bottom navigation bar
│   ├── Navbar.tsx              # Top navigation and search bar
│   ├── Sidebar.tsx             # Collapsible side menu
│   ├── SmartVideoPlayer.tsx    # Video player with custom controls + shortcuts
│   └── VideoCard.tsx           # Individual video thumbnail component
│
├── pages/                      # Route pages (React Router)
│   ├── AdminPage.tsx           # Admin dashboard + video management
│   ├── HelpPage.tsx            # FAQ + keyboard shortcuts
│   ├── HistoryPage.tsx         # Watch history
│   ├── LikedVideosPage.tsx     # Liked videos
│   ├── LoginPage.tsx           # Auth: login
│   ├── NotFoundPage.tsx        # 404 (doodle) fallback page
│   ├── ProfilePage.tsx         # User profile
│   ├── SettingsPage.tsx        # Playback preferences (localStorage)
│   ├── ShortsPage.tsx          # Shorts viewer
│   ├── SignupPage.tsx          # Auth: signup
│   ├── WatchLaterPage.tsx      # Saved videos
│   └── WatchPage.tsx           # Watch video + details + comments
│
├── lib/                        # Client helpers
│   ├── api.ts                  # HTTP API helpers (admin + user endpoints)
│   ├── authStorage.ts          # Token/user localStorage
│   ├── localUserData.ts        # Local likes/saves/history fallback
│   └── settingsStorage.ts      # Playback settings localStorage
│
├── App.tsx                     # Main application layout and routing logic
├── constants.ts                # Mock video data and configuration
├── index.html                  # Main HTML entry point
├── index.tsx                   # React entry point (mounts App to DOM)
├── metadata.json               # App metadata description
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── types.ts                    # TypeScript interfaces/definitions
└── vite.config.ts              # Vite build tool configuration



