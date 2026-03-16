import React, { useState, useRef } from 'react';
import type { Media, APIResponse } from '../types';

const mediaTypeIcons: Record<string, string> = {
  'image': '🖼️',
  'video': '🎬',
  'audio': '🎵',
  'application': '📄',
};

const getMediaType = (mimetype: string): string => {
  return mimetype.split('/')[0];
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export default function MediaGallery() {
  const [mediaFiles, setMediaFiles] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would fetch from /api/media
      // For now, we'll use mock data
      setMediaFiles([]);
    } catch (error) {
      console.error('Failed to fetch media:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', files[0]);

      const response = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      });

      const data: APIResponse<Media> = await response.json();

      if (data.success && data.data) {
        setMediaFiles([data.data, ...mediaFiles]);
      }
    } catch (error) {
      console.error('Failed to upload media:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const filteredMedia = filter === 'all'
    ? mediaFiles
    : mediaFiles.filter(m => getMediaType(m.mimetype) === filter);

  const renderMediaPreview = (media: Media) => {
    const type = getMediaType(media.mimetype);

    if (type === 'image') {
      return (
        <img
          src={media.url}
          alt={media.filename}
          className="w-full h-full object-cover"
        />
      );
    }

    if (type === 'video') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-900">
          <video
            src={media.url}
            className="max-w-full max-h-full"
            controls={false}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl">{mediaTypeIcons.video}</span>
          </div>
        </div>
      );
    }

    if (type === 'audio') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-900">
          <span className="text-4xl">{mediaTypeIcons.audio}</span>
        </div>
      );
    }

    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <span className="text-4xl">{mediaTypeIcons.application}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Media Gallery</h2>
          <p className="text-gray-400">{mediaFiles.length} files</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="crm-btn crm-btn-primary"
        >
          + Upload
        </button>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragOver
            ? 'border-indigo-500 bg-indigo-500/10'
            : 'border-gray-700 bg-gray-800/50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
        />

        {uploading ? (
          <div className="flex items-center justify-center gap-3">
            <div className="crm-spinner" />
            <span>Uploading...</span>
          </div>
        ) : (
          <>
            <div className="text-4xl mb-4">📁</div>
            <p className="text-lg font-medium mb-2">Drop files here or click to upload</p>
            <p className="text-sm text-gray-400">
              Supports images, videos, audio, and documents
            </p>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'image', 'video', 'audio', 'application'].map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filter === type
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {type === 'all' ? 'All' : (
              <span className="flex items-center gap-2">
                <span>{mediaTypeIcons[type] || '📄'}</span>
                <span className="capitalize">{type}</span>
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="crm-spinner" />
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-lg">No media files</p>
          <p className="text-sm mt-2">Upload files to see them here</p>
        </div>
      ) : (
        <div className="media-grid">
          {filteredMedia.map(media => (
            <div
              key={media.id}
              onClick={() => setSelectedMedia(media)}
              className="media-item aspect-square overflow-hidden relative group"
            >
              {renderMediaPreview(media)}

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-sm font-medium truncate">{media.filename}</p>
                  <p className="text-xs text-gray-400">{formatFileSize(media.size)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {selectedMedia && (
        <div
          className="crm-modal-backdrop"
          onClick={() => setSelectedMedia(null)}
        >
          <div
            className="bg-gray-800 rounded-xl border border-gray-700 max-w-4xl w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div>
                <h3 className="font-medium">{selectedMedia.filename}</h3>
                <p className="text-sm text-gray-400">
                  {formatFileSize(selectedMedia.size)} • {selectedMedia.mimetype}
                </p>
              </div>
              <button
                onClick={() => setSelectedMedia(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4">
              {getMediaType(selectedMedia.mimetype) === 'image' && (
                <img
                  src={selectedMedia.url}
                  alt={selectedMedia.filename}
                  className="max-w-full max-h-[60vh] mx-auto rounded-lg"
                />
              )}

              {getMediaType(selectedMedia.mimetype) === 'video' && (
                <video
                  src={selectedMedia.url}
                  controls
                  className="max-w-full max-h-[60vh] mx-auto rounded-lg"
                />
              )}

              {getMediaType(selectedMedia.mimetype) === 'audio' && (
                <audio
                  src={selectedMedia.url}
                  controls
                  className="w-full"
                />
              )}

              {getMediaType(selectedMedia.mimetype) === 'application' && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">{mediaTypeIcons.application}</div>
                  <p className="text-lg">{selectedMedia.filename}</p>
                  <a
                    href={selectedMedia.url}
                    download
                    className="crm-btn crm-btn-primary inline-block mt-4"
                  >
                    Download
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-700 bg-gray-800/50">
              <div className="text-sm text-gray-400">
                Uploaded: {new Date(selectedMedia.uploadedAt).toLocaleString()}
              </div>
              <div className="flex gap-2">
                <a
                  href={selectedMedia.url}
                  download
                  className="crm-btn crm-btn-secondary"
                >
                  Download
                </a>
                <button
                  onClick={() => {
                    // Delete logic would go here
                    setSelectedMedia(null);
                  }}
                  className="crm-btn crm-btn-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
