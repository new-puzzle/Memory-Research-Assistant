/**
 * Main App component
 */
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Moon, Sun, LogOut, Upload, Library, Brain, Home, Cloud } from 'lucide-react';
import { useAuthStore, useAppStore } from './services/store';
import LoginPage from './components/LoginPage';
import MemoryPalace3D from './components/MemoryPalace3D';
import ResearchAssistant from './components/ResearchAssistant';
import StorageManager from './components/StorageManager';
import ModelSelector from './components/ModelSelector';
import apiClient from './utils/api';
import { generateId } from './utils/helpers';

function App() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { isDarkMode, toggleDarkMode, memoryPalace, setMemoryPalace, currentRoom, selectedModel } = useAppStore();
  const [activeView, setActiveView] = useState<'palace' | 'research'>('palace');
  const [showUpload, setShowUpload] = useState(false);
  const [showStorage, setShowStorage] = useState(false);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] safe-top">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Library className="w-6 h-6 text-primary-600" />
            <h1 className="text-xl font-bold hidden sm:block">Memory Palace</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Toggle */}
            <button
              onClick={() => setActiveView('palace')}
              className={activeView === 'palace' ? 'btn-primary' : 'btn-ghost'}
              title="Memory Palace"
            >
              <Home size={18} />
              <span className="hidden sm:inline ml-2">Palace</span>
            </button>
            <button
              onClick={() => setActiveView('research')}
              className={activeView === 'research' ? 'btn-primary' : 'btn-ghost'}
              title="Research"
            >
              <Brain size={18} />
              <span className="hidden sm:inline ml-2">Research</span>
            </button>

            {/* AI Model Selector */}
            <ModelSelector className="hidden lg:block" />

            {/* Upload Notes */}
            <button
              onClick={() => setShowUpload(true)}
              className="btn-secondary hidden md:flex items-center gap-2"
            >
              <Upload size={18} />
              Upload
            </button>

            {/* Cloud Storage */}
            <button
              onClick={() => setShowStorage(true)}
              className="btn-secondary hidden md:flex items-center gap-2"
              title="Cloud Storage"
            >
              <Cloud size={18} />
              <span className="hidden lg:inline">Storage</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="btn-ghost"
              title="Toggle dark mode"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              {user?.picture && (
                <img
                  src={user.picture}
                  alt={user.name || user.email}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <button
                onClick={logout}
                className="btn-ghost text-red-600"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {activeView === 'palace' ? (
          <MemoryPalace3D onRoomClick={(roomId) => console.log('Room clicked:', roomId)} />
        ) : (
          <ResearchAssistant />
        )}
      </main>

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUpload={(notes) => {
            // Handle note upload and organization
            apiClient.organizeNotes({ notes }, selectedModel).then((result: any) => {
              setMemoryPalace(result.structure);
              setShowUpload(false);
            });
          }}
        />
      )}

      {/* Storage Manager Modal */}
      {showStorage && <StorageManager onClose={() => setShowStorage(false)} />}

      {/* Room Details Panel */}
      {currentRoom && memoryPalace && (
        <RoomDetailsPanel
          room={memoryPalace.rooms.find((r) => r.id === currentRoom)}
          notes={memoryPalace.notes_index}
        />
      )}
    </div>
  );
}

// Upload Modal Component
interface UploadModalProps {
  onClose: () => void;
  onUpload: (notes: any[]) => void;
}

function UploadModal({ onClose, onUpload }: UploadModalProps) {
  const [noteText, setNoteText] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteTags, setNoteTags] = useState('');

  const handleSubmit = () => {
    if (!noteTitle.trim() || !noteText.trim()) return;

    const note = {
      id: generateId(),
      title: noteTitle,
      content: noteText,
      content_type: 'text',
      tags: noteTags.split(',').map((t) => t.trim()).filter(Boolean),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onUpload([note]);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card max-w-2xl w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="heading-3">Add Note</h2>
          <button onClick={onClose} className="btn-ghost">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Note title"
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Content</label>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Your notes here..."
              className="textarea h-40"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
            <input
              type="text"
              value={noteTags}
              onChange={(e) => setNoteTags(e.target.value)}
              placeholder="machine learning, physics, quantum"
              className="input"
            />
          </div>

          <div className="flex gap-2">
            <button onClick={handleSubmit} className="btn-primary flex-1">
              Add Note
            </button>
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Room Details Panel
interface RoomDetailsPanelProps {
  room: any;
  notes: Record<string, any>;
}

function RoomDetailsPanel({ room, notes }: RoomDetailsPanelProps) {
  const { setCurrentRoom } = useAppStore();

  if (!room) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-full md:w-96 bg-[var(--bg-secondary)] border-l border-[var(--border-color)] shadow-xl overflow-y-auto safe-right z-40">
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="heading-3">{room.name}</h2>
            <p className="text-[var(--text-secondary)] text-sm mt-1">{room.description}</p>
          </div>
          <button onClick={() => setCurrentRoom(null)} className="btn-ghost">
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold">Notes ({room.notes.length})</h3>
          {room.notes.map((noteId: string) => {
            const note = notes[noteId];
            if (!note) return null;

            return (
              <div key={noteId} className="card-hover p-4">
                <h4 className="font-medium mb-2">{note.title}</h4>
                <p className="text-sm text-[var(--text-secondary)] line-clamp-3">
                  {note.content}
                </p>
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {note.tags.map((tag: string) => (
                      <span key={tag} className="badge-primary text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default App;
