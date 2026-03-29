import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { applicationsAPI, jobsAPI, analyticsAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineSparkles, HiOutlineUsers, HiOutlineSpeakerphone,
  HiOutlineBriefcase, HiOutlineCheckCircle, HiOutlineClock,
  HiOutlineArrowRight, HiOutlineLightningBolt, HiOutlinePlay
} from 'react-icons/hi';

const featureCards = [
  {
    title: 'Smart Apply',
    description: 'Automatically apply to relevant jobs with one click.',
    icon: HiOutlineSparkles,
    color: 'from-accent-green to-emerald-600',
    link: '/jobs',
    enabled: true
  },
  {
    title: 'Referral',
    description: 'Easily reach out and request referrals from people in our platform.',
    icon: HiOutlineUsers,
    color: 'from-accent-blue to-blue-600',
    link: '/referrals',
    enabled: true
  },
  {
    title: 'Recruiter',
    description: 'View posts directly from recruiters and connect with them instantly.',
    icon: HiOutlineSpeakerphone,
    color: 'from-accent-purple to-purple-600',
    link: '/recruiter',
    enabled: true
  }
];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [smartApplyLoading, setSmartApplyLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      analyticsAPI.getDashboard().catch(() => ({ data: null })),
      jobsAPI.getRecommended().catch(() => ({ data: { jobs: [] } }))
    ]).then(([analyticsRes, jobsRes]) => {
      if (analyticsRes.data) setStats(analyticsRes.data.overview);
      setRecentJobs(jobsRes.data.jobs?.slice(0, 5) || []);
    });
  }, []);

  const handleSmartApply = async () => {
    setSmartApplyLoading(true);
    try {
      const res = await applicationsAPI.runSmartApply();
      if (res.data.applied > 0) {
        toast.success(`Applied to ${res.data.applied} jobs!`);
      } else {
        toast.success(res.data.message || 'No matching jobs found right now');
      }
    } catch (err) {
      toast.error('Smart apply failed');
    } finally {
      setSmartApplyLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome back, {user?.name?.split(' ')[0]}!</h1>
          <p className="text-dark-400 mt-1">Here's your job search overview</p>
        </div>
        <button onClick={handleSmartApply} disabled={smartApplyLoading} className="btn-primary flex items-center gap-2">
          <HiOutlineLightningBolt className="w-4 h-4" />
          {smartApplyLoading ? 'Running...' : 'Run Smart Apply'}
        </button>
      </div>

      {/* Feature Cards - Matching the screenshot */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {featureCards.map((card) => (
          <Link key={card.title} to={card.link} className="glass-card p-5 hover:border-dark-500 transition-all group">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">{card.title}</h3>
                <p className="text-sm text-dark-400 leading-relaxed">{card.description}</p>
              </div>
              <div className="flex-shrink-0 ml-4">
                <div className="w-8 h-8 rounded-full bg-accent-green/20 flex items-center justify-center">
                  <HiOutlineCheckCircle className="w-5 h-5 text-accent-green" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Applied', value: stats?.totalApplications || 0, icon: HiOutlineBriefcase, color: 'text-accent-blue' },
          { label: 'Pending', value: stats?.pending || 0, icon: HiOutlineClock, color: 'text-accent-orange' },
          { label: 'Interviews', value: stats?.interviewing || 0, icon: HiOutlinePlay, color: 'text-accent-purple' },
          { label: 'Accepted', value: stats?.accepted || 0, icon: HiOutlineCheckCircle, color: 'text-accent-green' }
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4">
            <div className="flex items-center gap-3">
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-dark-400">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recommended Jobs */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recommended for You</h2>
          <Link to="/jobs" className="text-sm text-accent-green hover:underline flex items-center gap-1">
            View all <HiOutlineArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {recentJobs.length > 0 ? (
          <div className="space-y-3">
            {recentJobs.map((job) => (
              <div key={job._id} className="flex items-center justify-between p-3 rounded-lg bg-dark-900/50 hover:bg-dark-900 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-dark-600 to-dark-700 flex items-center justify-center text-white font-semibold text-sm">
                    {job.company?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{job.title}</p>
                    <p className="text-xs text-dark-400">{job.company} · {job.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {job.relevanceScore && (
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      job.relevanceScore >= 80 ? 'bg-accent-green/20 text-accent-green' :
                      job.relevanceScore >= 60 ? 'bg-accent-blue/20 text-accent-blue' :
                      'bg-dark-600 text-dark-300'
                    }`}>
                      {job.relevanceScore}% match
                    </span>
                  )}
                  <span className="text-xs text-dark-400">{job.jobType}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-dark-400">
            <HiOutlineBriefcase className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No recommendations yet. Upload your resume to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}
