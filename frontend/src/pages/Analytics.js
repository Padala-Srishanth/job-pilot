import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineChartBar, HiOutlineTrendingUp, HiOutlineCheckCircle,
  HiOutlineBriefcase, HiOutlineClock, HiOutlineXCircle
} from 'react-icons/hi';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const res = await analyticsAPI.getDashboard();
      setData(res.data);
    } catch {
      // No applications yet, show empty state
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-5 animate-pulse"><div className="h-8 bg-dark-700 rounded w-16 mb-2" /><div className="h-3 bg-dark-700 rounded w-20" /></div>
          ))}
        </div>
      </div>
    );
  }

  const overview = data?.overview || {};
  const topSkills = data?.topSkillMatches || [];
  const recentActivity = data?.recentActivity || [];

  const statCards = [
    { label: 'Total Applications', value: overview.totalApplications || 0, icon: HiOutlineBriefcase, color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
    { label: 'Response Rate', value: `${overview.responseRate || 0}%`, icon: HiOutlineTrendingUp, color: 'text-accent-green', bg: 'bg-accent-green/10' },
    { label: 'Success Rate', value: `${overview.successRate || 0}%`, icon: HiOutlineCheckCircle, color: 'text-accent-purple', bg: 'bg-accent-purple/10' },
    { label: 'Interviews', value: overview.interviewing || 0, icon: HiOutlineClock, color: 'text-accent-orange', bg: 'bg-accent-orange/10' }
  ];

  const statusBreakdown = [
    { label: 'Applied', value: overview.applied || 0, color: 'bg-accent-blue' },
    { label: 'Pending', value: overview.pending || 0, color: 'bg-yellow-400' },
    { label: 'Interviewing', value: overview.interviewing || 0, color: 'bg-accent-purple' },
    { label: 'Accepted', value: overview.accepted || 0, color: 'bg-accent-green' },
    { label: 'Rejected', value: overview.rejected || 0, color: 'bg-accent-red' }
  ];

  const total = statusBreakdown.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(stat => (
          <div key={stat.label} className="glass-card p-5">
            <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-dark-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application Pipeline */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Application Pipeline</h3>
          {total > 0 ? (
            <>
              {/* Pipeline Bar */}
              <div className="flex rounded-full h-4 overflow-hidden mb-4">
                {statusBreakdown.filter(s => s.value > 0).map(s => (
                  <div key={s.label} className={`${s.color} transition-all`} style={{ width: `${(s.value / total) * 100}%` }} />
                ))}
              </div>
              {/* Legend */}
              <div className="space-y-3">
                {statusBreakdown.map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${s.color}`} />
                      <span className="text-sm text-dark-300">{s.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-white">{s.value}</span>
                      <span className="text-xs text-dark-500 w-10 text-right">
                        {total > 0 ? Math.round((s.value / total) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-dark-400">
              <HiOutlineChartBar className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Apply to jobs to see your pipeline</p>
            </div>
          )}
        </div>

        {/* Top Skills */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Most Applied Skills</h3>
          {topSkills.length > 0 ? (
            <div className="space-y-3">
              {topSkills.map((skill, i) => {
                const maxCount = topSkills[0]?.count || 1;
                return (
                  <div key={skill.skill} className="flex items-center gap-3">
                    <span className="text-xs text-dark-500 w-5">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-dark-200">{skill.skill}</span>
                        <span className="text-xs text-dark-400">{skill.count} apps</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-dark-700">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent-green to-accent-cyan transition-all"
                          style={{ width: `${(skill.count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-dark-400">
              <p>Skill data will appear after applications</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        {recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.map(activity => (
              <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-dark-900/50">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  activity.status === 'accepted' ? 'bg-accent-green' :
                  activity.status === 'rejected' ? 'bg-accent-red' :
                  activity.status === 'interview' ? 'bg-accent-purple' :
                  'bg-accent-blue'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{activity.jobTitle} at {activity.company}</p>
                </div>
                <span className="text-xs text-dark-400">{activity.status}</span>
                <span className="text-xs text-dark-500">{new Date(activity.date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-dark-400">
            <p>Your application activity will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
