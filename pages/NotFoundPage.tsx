import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function NotFoundPage() {
  const location = useLocation();

  return (
    <div className="min-h-[calc(100vh-56px)] p-4 sm:p-6 flex items-center justify-center">
      <div className="w-full max-w-3xl bg-yt-gray/60 border border-white/10 rounded-2xl p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <div className="text-xs text-yt-textSec">404</div>
            <h1 className="text-2xl font-bold mt-1">Page not found</h1>
            <div className="text-sm text-yt-textSec mt-2">
              The page <span className="font-mono text-white/90">{location.pathname}</span> doesn’t exist.
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/" className="px-4 py-2 rounded-xl bg-white text-black font-semibold hover:bg-white/90">
                Go Home
              </Link>
              <Link to="/help" className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15">
                Help
              </Link>
              <Link to="/settings" className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15">
                Settings
              </Link>
            </div>
          </div>

          <div className="w-full">
            <div className="w-full aspect-square rounded-2xl bg-black/30 border border-white/10 overflow-hidden flex items-center justify-center">
              <svg viewBox="0 0 360 360" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="360" height="360" fill="rgba(0,0,0,0)" />

                <path
                  d="M70 250c25 22 54 35 90 35 58 0 92-28 121-60"
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d="M80 120c40-22 85-30 130-16 34 10 55 32 66 57"
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                <path
                  d="M118 214c-10-28 6-60 36-72 30-12 64 1 77 30 13 29-1 63-31 76"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M186 188l-12-7"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path
                  d="M199 208l-13 9"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />

                <path
                  d="M60 78c12 6 19 16 20 31"
                  stroke="rgba(239,68,68,0.55)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path
                  d="M296 288c-8-6-13-14-13-26"
                  stroke="rgba(239,68,68,0.45)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />

                <path
                  d="M108 52c-2 20 4 32 18 44"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d="M250 78c16 10 24 24 22 44"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d="M90 300c18-4 30-14 38-30"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                <text x="180" y="326" textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="12" fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace">
                  lost in the tubes
                </text>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
