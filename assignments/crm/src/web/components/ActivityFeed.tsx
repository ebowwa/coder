import React, { useState, useEffect } from 'react';
import type { Activity, APIResponse } from '../types';

const activityIcons: Record<Activity['type'], string> = {
  call: '📞',
  email: '📧',
  meeting: '🗓️',
  note: '📝',
  deal: '💼',
  contact: '👤',
};

const activityColors: Record<Activity['type'], string> = {
  call: 'bg-blue-500',
  email: 'bg-purple-500',
  meeting: 'bg-orange-500',
  note: 'bg-gray-500',
  deal: 'bg-green-500',
  contact: 'bg-cyan-500',
};

export default function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/activities?limit=100');
      const data: APIResponse<Activity[]> = await response.json();

      if (data.success) {
        setActivities(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredActivities = filter
    ? activities.filter(a => a.type === filter)
    : activities;

  const groupedActivities = filteredActivities.reduce((groups, activity) => {
    const date = new Date(activity.timestamp).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, Activity[]>);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="crm-spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Activity Feed</h2>
          <p className="text-gray-400">{activities.length} total activities</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            filter === '' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          All
        </button>
        {Object.entries(activityIcons).map(([type, icon]) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
              filter === type ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <span>{icon}</span>
            <span className="capitalize">{type}</span>
          </button>
        ))}
      </div>

      {/* Activity List */}
      <div className="space-y-6">
        {Object.entries(groupedActivities).map(([date, dateActivities]) => (
          <div key={date}>
            {/* Date Header */}
            <div className="flex items-center gap-4 mb-4">
              <h3 className="text-lg font-semibold text-gray-300">
                {formatDate(date)}
              </h3>
              <div className="flex-1 h-px bg-gray-700" />
              <span className="text-sm text-gray-500">
                {dateActivities.length} activities
              </span>
            </div>

            {/* Activities for this date */}
            <div className="space-y-3">
              {dateActivities.map(activity => (
                <div
                  key={activity.id}
                  className="activity-item bg-gray-800/50 rounded-lg border border-gray-700/50"
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full ${activityColors[activity.type]} flex items-center justify-center text-lg flex-shrink-0`}>
                    {activityIcons[activity.type]}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{activity.description}</p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                          <span className="capitalize">{activity.type}</span>
                          {activity.contactId && (
                            <>
                              <span className="text-gray-600">•</span>
                              <span>Contact: {activity.contactId}</span>
                            </>
                          )}
                          {activity.dealId && (
                            <>
                              <span className="text-gray-600">•</span>
                              <span>Deal: {activity.dealId}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-gray-500 flex-shrink-0">
                        {formatTime(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredActivities.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No activities found</p>
            <p className="text-sm mt-2">Activities will appear here as you interact with contacts and deals</p>
          </div>
        )}
      </div>
    </div>
  );
}
