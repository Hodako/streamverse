import React from 'react';
import { Link } from 'react-router-dom';

export default function HelpPage() {
  return (
    <div className="min-h-[calc(100vh-56px)] p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-bold">Help</h1>
        <div className="text-sm text-yt-textSec mt-1">FAQs, tips, and keyboard shortcuts.</div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-yt-gray/60 border border-white/10 rounded-2xl p-4">
            <div className="font-semibold">Keyboard shortcuts (Video player)</div>
            <div className="mt-3 text-sm">
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <div className="text-yt-textSec">Play / Pause</div>
                <div className="font-mono text-xs">Space / K</div>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <div className="text-yt-textSec">Mute</div>
                <div className="font-mono text-xs">M</div>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <div className="text-yt-textSec">Fullscreen</div>
                <div className="font-mono text-xs">F</div>
              </div>
              <div className="flex items-center justify-between py-1">
                <div className="text-yt-textSec">Seek</div>
                <div className="font-mono text-xs">Arrow Left / Arrow Right</div>
              </div>
            </div>
          </div>

          <div className="bg-yt-gray/60 border border-white/10 rounded-2xl p-4">
            <div className="font-semibold">Keyboard shortcuts (Shorts)</div>
            <div className="mt-3 text-sm">
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <div className="text-yt-textSec">Next short</div>
                <div className="font-mono text-xs">Arrow Down / J</div>
              </div>
              <div className="flex items-center justify-between py-1">
                <div className="text-yt-textSec">Previous short</div>
                <div className="font-mono text-xs">Arrow Up / K</div>
              </div>
            </div>
          </div>

          <div className="bg-yt-gray/60 border border-white/10 rounded-2xl p-4">
            <div className="font-semibold">Common questions</div>
            <div className="mt-3 space-y-3 text-sm text-yt-textSec">
              <div>
                <div className="text-white font-medium">Why does a video fail to play?</div>
                <div className="mt-1">Some sources block cross-origin streaming. Try another video source URL in Admin.</div>
              </div>
              <div>
                <div className="text-white font-medium">How do I create Shorts?</div>
                <div className="mt-1">
                  Go to <Link className="text-blue-300 hover:underline" to="/adminpageofthesiteforthesite">Admin</Link> and toggle “Short” on a video.
                </div>
              </div>
              <div>
                <div className="text-white font-medium">Where are my settings saved?</div>
                <div className="mt-1">Settings are stored locally in your browser. They stay after refresh.</div>
              </div>
            </div>
          </div>

          <div className="bg-yt-gray/60 border border-white/10 rounded-2xl p-4">
            <div className="font-semibold">Tips</div>
            <div className="mt-3 space-y-2 text-sm text-yt-textSec">
              <div>Click the player and use the keyboard shortcuts above.</div>
              <div>Use mouse wheel or swipe on Shorts to switch videos.</div>
              <div>
                Configure autoplay, volume and speed in <Link className="text-blue-300 hover:underline" to="/settings">Settings</Link>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
