import React, { useState, useEffect } from 'react';
import type { DashboardStats, Activity, Deal } from '../types';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: string;
  color: string;
}

function StatCard({ title, value, change, icon, color }: StatCardProps) {
  return (
    <div className="crm-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
              {change}
            </p>
          )}
        </div>
        <div className={`text-4xl ${color}`}>{icon}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [topDeals, setTopDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, activitiesRes, dealsRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/activities?limit=5'),
          fetch('/api/deals'),
        ]);

        const statsData = await statsRes.json();
        const activitiesData = await activitiesRes.json();
        const dealsData = await dealsRes.json();

        if (statsData.success) setStats(statsData.data);
        if (activitiesData.success) setRecentActivities(activitiesData.data);
        if (dealsData.success) {
          const sorted = dealsData.data
            .filter((d: Deal) => !d.stage.startsWith('closed_'))
            .sort((a: Deal, b: Deal) => b.value - a.value)
            .slice(0, 5);
          setTopDeals(sorted);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="crm-spinner" />
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Contacts"
          value={stats?.totalContacts || 0}
          icon="👥"
          color="text-blue-400"
        />
        <StatCard
          title="Active Deals"
          value={stats?.activeDeals || 0}
          icon="💼"
          color="text-indigo-400"
        />
        <StatCard
          title="Pipeline Value"
          value={formatCurrency(stats?.pipelineValue || 0)}
          icon="📈"
          color="text-green-400"
        />
        <StatCard
          title="Won This Month"
          value={formatCurrency(stats?.wonThisMonth || 0)}
          change="+12%"
          icon="🏆"
          color="text-yellow-400"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="crm-card">
          <h3 className="text-lg font-semibold mb-4">Activities Today</h3>
          <div className="flex items-center justify-between">
            <span className="text-4xl font-bold text-indigo-400">
              {stats?.activitiesToday || 0}
            </span>
            <div className="text-right">
              <p className="text-sm text-gray-400">vs yesterday</p>
              <p className="text-green-400">+5</p>
            </div>
          </div>
        </div>

        <div className="crm-card">
          <h3 className="text-lg font-semibold mb-4">Conversion Rate</h3>
          <div className="flex items-center justify-between">
            <span className="text-4xl font-bold text-green-400">
              {(stats?.conversionRate || 0).toFixed(1)}%
            </span>
            <div className="text-right">
              <p className="text-sm text-gray-400">30-day avg</p>
              <p className="text-green-400">+2.3%</p>
            </div>
          </div>
        </div>

        <div className="crm-card">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="flex gap-2">
            <button className="crm-btn crm-btn-primary flex-1">
              + Contact
            </button>
            <button className="crm-btn crm-btn-secondary flex-1">
              + Deal
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity & Top Deals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div className="crm-card">
          <h3 className="text-lg font-semibold mb-4">Recent Activities</h3>
          <div className="space-y-3">
            {recentActivities.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No recent activities</p>
            ) : (
              recentActivities.map(activity => (
                <div key={activity.id} className="activity-item">
                  <div className={`activity-dot ${
                    activity.type === 'deal' ? 'bg-green-500' :
                    activity.type === 'contact' ? 'bg-blue-500' :
                    'bg-gray-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Deals */}
        <div className="crm-card">
          <h3 className="text-lg font-semibold mb-4">Top Deals</h3>
          <div className="space-y-3">
            {topDeals.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No active deals</p>
            ) : (
              topDeals.map((deal, index) => (
                <div key={deal.id} className="flex items-center gap-4 p-3 bg-gray-700/50 rounded-lg">
                  <span className="text-lg font-bold text-gray-500">#{index + 1}</span>
                  <div className="flex-1">
                    <p className="font-medium">{deal.title}</p>
                    <p className="text-sm text-gray-400">{deal.stage}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-400">
                      {formatCurrency(deal.value)}
                    </p>
                    <p className="text-xs text-gray-500">{deal.probability}% prob</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
