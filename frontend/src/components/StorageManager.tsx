/**
 * Storage Manager component for Google Drive integration
 */
import React, { useState } from 'react';
import { Cloud, CloudOff, Save, FolderOpen, Download, Trash2 } from 'lucide-react';
import apiClient from '@/utils/api';
import { useAppStore } from '@/services/store';
import { formatDate } from '@/utils/helpers';

interface StorageFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
}

interface StorageManagerProps {
  onClose: () => void;
}

export default function StorageManager({ onClose }: StorageManagerProps) {
  const { memoryPalace, setMemoryPalace } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [activeTab, setActiveTab] = useState<'save' | 'load'>('save');
  const [filename, setFilename] = useState('memory-palace-backup.json');

  // Load list of files from Google Drive
  const loadFileList = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiClient.listFiles('/Memory-Palace');
      setFiles(result.files || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load files from Google Drive');
    } finally {
      setIsLoading(false);
    }
  };

  // Save Memory Palace to Google Drive
  const handleSave = async () => {
    if (!memoryPalace) {
      setError('No Memory Palace to save');
      return;
    }

    if (!filename.trim()) {
      setError('Please enter a filename');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const content = JSON.stringify(memoryPalace, null, 2);
      const result = await apiClient.saveFile({
        filename: filename.endsWith('.json') ? filename : `${filename}.json`,
        content,
        content_type: 'application/json',
        folder_path: '/Memory-Palace',
      });

      setSuccess(`Successfully saved to Google Drive: ${result.filename}`);

      // Refresh file list
      if (activeTab === 'load') {
        await loadFileList();
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Google Drive not connected. Please reconnect your account.');
      } else {
        setError(err.response?.data?.detail || 'Failed to save to Google Drive');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load Memory Palace from Google Drive
  const handleLoad = async (fileId?: string, filename?: string) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await apiClient.loadFile({
        file_id: fileId,
        filename: filename,
        folder_path: '/Memory-Palace',
      });

      // Parse and set the Memory Palace structure
      const structure = JSON.parse(result.content);
      setMemoryPalace(structure);
      setSuccess(`Successfully loaded: ${result.filename}`);

      // Close modal after successful load
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Google Drive not connected. Please reconnect your account.');
      } else if (err.response?.status === 404) {
        setError('File not found in Google Drive');
      } else {
        setError(err.response?.data?.detail || 'Failed to load from Google Drive');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Download locally
  const handleDownloadLocal = () => {
    if (!memoryPalace) return;

    const content = JSON.stringify(memoryPalace, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.json') ? filename : `${filename}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSuccess('Downloaded to your device');
  };

  // Load files when switching to load tab
  React.useEffect(() => {
    if (activeTab === 'load' && files.length === 0) {
      loadFileList();
    }
  }, [activeTab]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <Cloud className="w-6 h-6 text-primary-600" />
            <h2 className="heading-3">Cloud Storage</h2>
          </div>
          <button onClick={onClose} className="btn-ghost">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-4 border-b border-[var(--border-color)]">
          <button
            onClick={() => setActiveTab('save')}
            className={activeTab === 'save' ? 'btn-primary' : 'btn-secondary'}
          >
            <Save size={18} className="inline mr-2" />
            Save
          </button>
          <button
            onClick={() => setActiveTab('load')}
            className={activeTab === 'load' ? 'btn-primary' : 'btn-secondary'}
          >
            <FolderOpen size={18} className="inline mr-2" />
            Load
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-green-800 dark:text-green-200 text-sm">{success}</p>
            </div>
          )}

          {/* Save Tab */}
          {activeTab === 'save' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Filename</label>
                <input
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="memory-palace-backup.json"
                  className="input"
                />
              </div>

              <div className="card p-4 bg-[var(--bg-tertiary)]">
                <h4 className="font-semibold mb-2">Current Memory Palace</h4>
                {memoryPalace ? (
                  <div className="text-sm text-[var(--text-secondary)] space-y-1">
                    <p>• {memoryPalace.rooms.length} rooms</p>
                    <p>• {Object.keys(memoryPalace.notes_index).length} notes</p>
                    <p>• Last updated: {formatDate(memoryPalace.updated_at)}</p>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">
                    No Memory Palace to save. Upload some notes first.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleSave}
                  disabled={isLoading || !memoryPalace}
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="spinner" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Cloud size={18} />
                      Save to Google Drive
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadLocal}
                  disabled={!memoryPalace}
                  className="btn-secondary flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  Download Locally
                </button>
              </div>

              <div className="text-xs text-[var(--text-tertiary)] space-y-1">
                <p>💡 Files are saved to /Memory-Palace folder in your Google Drive</p>
                <p>🔒 Only you can access your files via Google OAuth</p>
              </div>
            </div>
          )}

          {/* Load Tab */}
          {activeTab === 'load' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--text-secondary)]">
                  Select a backup to restore
                </p>
                <button
                  onClick={loadFileList}
                  disabled={isLoading}
                  className="btn-ghost text-sm"
                >
                  {isLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {isLoading && files.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="spinner !w-8 !h-8" />
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-8">
                  <CloudOff className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
                  <p className="text-[var(--text-secondary)]">No backups found</p>
                  <p className="text-sm text-[var(--text-tertiary)] mt-1">
                    Save your Memory Palace to create a backup
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="card-hover p-4 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{file.name}</h4>
                        <p className="text-sm text-[var(--text-tertiary)]">
                          Modified: {formatDate(file.modifiedTime)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleLoad(file.id)}
                        disabled={isLoading}
                        className="btn-primary"
                      >
                        <FolderOpen size={18} className="mr-2" />
                        Load
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-xs text-[var(--text-tertiary)] space-y-1">
                <p>⚠️ Loading a backup will replace your current Memory Palace</p>
                <p>💡 Consider saving your current state before loading</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
