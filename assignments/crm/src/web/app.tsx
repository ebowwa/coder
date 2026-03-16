import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import Dashboard from './components/Dashboard';
import ContactList from './components/ContactList';
import DealPipeline from './components/DealPipeline';
import ActivityFeed from './components/ActivityFeed';
import MediaGallery from './components/MediaGallery';
import type { WSMessage } from './types';

type Tab = 'dashboard' | 'contacts' | 'deals' | 'activity' | 'media';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);

  // WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };

    websocket.onmessage = (event) => {
      const message: WSMessage = JSON.parse(event.data);
      console.log('WebSocket message:', message);

      if (message.type === 'activity') {
        addNotification('New activity update');
      } else if (message.type === 'deal_update') {
        addNotification('Deal updated');
      } else if (message.type === 'contact_update') {
        addNotification('Contact updated');
      }
    };

    websocket.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, []);

  const addNotification = useCallback((message: string) => {
    setNotifications(prev => [...prev, message]);
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 3000);
  }, []);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'contacts', label: 'Contacts', icon: '👥' },
    { id: 'deals', label: 'Deals', icon: '💼' },
    { id: 'activity', label: 'Activity', icon: '📝' },
    { id: 'media', label: 'Media', icon: '🖼️' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-indigo-400">CRM Dashboard</h1>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
              Settings
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="flex px-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'contacts' && <ContactList />}
        {activeTab === 'deals' && <DealPipeline />}
        {activeTab === 'activity' && <ActivityFeed />}
        {activeTab === 'media' && <MediaGallery />}
      </main>

      {/* Notifications */}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {notifications.map((notification, index) => (
          <div
            key={index}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 shadow-lg animate-slide-in"
          >
            <p className="text-sm">{notification}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
