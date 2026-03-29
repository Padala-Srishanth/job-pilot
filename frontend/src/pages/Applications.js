import React, { useState, useEffect } from 'react';
import { applicationsAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineDocumentText, HiOutlineClock, HiOutlineCheckCircle,
  HiOutlineXCircle, HiOutlineEye, HiOutlineChevronDown
} from 'react-icons/hi';

const statusConfig = {
  pending: { label: 'Pending', color: 'text-yellow-400 bg-yellow-400/10', icon: HiOutlineClock },
  applied: { label: 'Applied', color: 'text-accent-blue bg-accent-blue/10', icon: HiOutlineDocumentText },
  reviewing: { label: 'Reviewing', color: 'text-accent-cyan bg-accent-cyan/10', icon: HiOutlineEye },
  interview: { label: 'Interview', color: 'text-accent-purple bg-accent-purple/10', icon: HiOutlineCheckCircle },
  accepted: { label: 'Accepted', color: 'text-accent-green bg-accent-green/10', icon: HiOutlineCheckCircle },
  rejected: { label: 'Rejected', color: 'text-accent-red bg-accent-red/10', icon: HiOutlineXCircle },
  withdrawn: { label: 'Withdrawn', color: 'text-dark-400 bg-dark-600/50', icon: HiOutlineXCircle }
};

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await applicationsAPI.getAll(params);
      setApplications(res.data.applications);
    } catch (err) {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await applicationsAPI.updateStatus(id, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      fetchApplications();
    } catch (err) {
      toast.error('Status update failed');
    }
  };

  const handleWithdraw = async (id) => {
    try {
      await applicationsAPI.withdraw(id);
      toast.success('Application withdrawn');
      fetchApplications();
    } catch (err) {
      toast.error('Withdrawal failed');
    }
  };

  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">My Applications</h1>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            !statusFilter ? 'bg-accent-green text-white' : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
          }`}
        >
          All ({applications.length})
        </button>
        {Object.entries(statusConfig).map(([key, config]) => (
          statusCounts[key] ? (
            <button
              key={key}
              onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                statusFilter === key ? config.color + ' border border-current' : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
              }`}
            >
              {config.label} ({statusCounts[key]})
            </button>
          ) : null
        ))}
      </div>

      {/* Application List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-4 bg-dark-700 rounded w-1/3 mb-2" />
              <div className="h-3 bg-dark-700 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : applications.length > 0 ? (
        <div className="space-y-3">
          {applications.map(app => {
            const config = statusConfig[app.status] || statusConfig.pending;
            const StatusIcon = config.icon;
            const isExpanded = expandedId === app._id;

            return (
              <div key={app._id} className="glass-card overflow-hidden">
                <div
                  className="p-4 flex items-center gap-4 cursor-pointer hover:bg-dark-800/50 transition-all"
                  onClick={() => setExpandedId(isExpanded ? null : app._id)}
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-dark-600 to-dark-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {app.job?.company?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{app.job?.title || 'Unknown Job'}</p>
                    <p className="text-sm text-dark-400">{app.job?.company} · {new Date(app.appliedDate).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {app.relevanceScore > 0 && (
                      <span className="text-xs text-dark-400">{app.relevanceScore}% match</span>
                    )}
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${config.color}`}>
                      <StatusIcon className="w-3.5 h-3.5" /> {config.label}
                    </span>
                    {app.appliedVia === 'smart-apply' && (
                      <span className="text-xs px-2 py-0.5 rounded bg-accent-green/10 text-accent-green">Auto</span>
                    )}
                    <HiOutlineChevronDown className={`w-4 h-4 text-dark-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-dark-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-dark-400 mb-1">Status History</p>
                        <div className="space-y-1">
                          {(app.statusHistory || []).map((h, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className="w-2 h-2 rounded-full bg-dark-400" />
                              <span className="text-dark-300">{h.status}</span>
                              <span className="text-dark-500">{new Date(h.date).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-dark-400 mb-2">Actions</p>
                        <div className="flex flex-wrap gap-2">
                          {!['accepted', 'rejected', 'withdrawn'].includes(app.status) && (
                            <>
                              <select
                                className="input-field text-xs py-1.5"
                                value=""
                                onChange={e => handleStatusChange(app._id, e.target.value)}
                              >
                                <option value="">Update status...</option>
                                <option value="reviewing">Reviewing</option>
                                <option value="interview">Interview</option>
                                <option value="accepted">Accepted</option>
                                <option value="rejected">Rejected</option>
                              </select>
                              <button onClick={() => handleWithdraw(app._id)} className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded bg-red-400/10">
                                Withdraw
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {app.coverLetter && (
                      <div className="mt-3 pt-3 border-t border-dark-700">
                        <p className="text-xs text-dark-400 mb-1">Cover Letter</p>
                        <p className="text-sm text-dark-300 whitespace-pre-line">{app.coverLetter}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-dark-400">
          <HiOutlineDocumentText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">No applications yet</p>
          <p className="text-sm mt-1">Start applying to jobs to track them here</p>
        </div>
      )}
    </div>
  );
}
