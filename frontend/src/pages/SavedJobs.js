import React, { useState, useEffect } from 'react';
import { savedJobsAPI, applicationsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineBookmark, HiOutlineTrash, HiOutlineExternalLink, HiOutlineLocationMarker, HiOutlineBriefcase, HiOutlineLightningBolt } from 'react-icons/hi';

export default function SavedJobs() {
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSaved(); }, []);

  const loadSaved = async () => {
    setLoading(true);
    try {
      const res = await savedJobsAPI.getAll();
      setSaved(res.data.savedJobs || []);
    } catch { toast.error('Failed to load saved jobs'); }
    finally { setLoading(false); }
  };

  const handleUnsave = async (jobId) => {
    try {
      await savedJobsAPI.unsave(jobId);
      setSaved(prev => prev.filter(s => s.jobId !== jobId));
      toast.success('Removed from saved');
    } catch { toast.error('Failed to remove'); }
  };

  const handleApply = async (jobId) => {
    try {
      await applicationsAPI.apply(jobId, {});
      toast.success('Application submitted!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to apply'); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Saved Jobs</h1>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="glass-card p-5 animate-pulse"><div className="h-4 bg-dark-700 rounded w-3/4 mb-2"/><div className="h-3 bg-dark-700 rounded w-1/2"/></div>)}</div>
      ) : saved.length > 0 ? (
        <div className="space-y-3">
          {saved.map(item => {
            const job = item.job;
            if (!job) return null;
            return (
              <div key={item._id} className="glass-card p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-dark-600 to-dark-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {job.company?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{job.title}</h3>
                  <p className="text-sm text-dark-400">{job.company}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 text-xs text-dark-300 bg-dark-900 px-2 py-0.5 rounded">
                      <HiOutlineLocationMarker className="w-3 h-3" /> {job.location}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-dark-300 bg-dark-900 px-2 py-0.5 rounded">
                      <HiOutlineBriefcase className="w-3 h-3" /> {job.jobType}
                    </span>
                    {job.source && <span className="text-xs text-dark-500">via {job.source}</span>}
                  </div>
                  <p className="text-xs text-dark-500 mt-1">Saved {new Date(item.savedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {job.applicationUrl && job.applicationUrl !== '#' && (
                    <a href={job.applicationUrl} target="_blank" rel="noopener noreferrer" className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
                      <HiOutlineExternalLink className="w-3 h-3" /> Apply
                    </a>
                  )}
                  <button onClick={() => handleApply(job._id)} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1">
                    <HiOutlineLightningBolt className="w-3 h-3" /> Track
                  </button>
                  <button onClick={() => handleUnsave(item.jobId)} className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded bg-red-400/10 flex items-center gap-1">
                    <HiOutlineTrash className="w-3 h-3" /> Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-dark-400">
          <HiOutlineBookmark className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">No saved jobs yet</p>
          <p className="text-sm mt-1">Bookmark jobs from the Jobs page or use the Chrome Extension</p>
        </div>
      )}
    </div>
  );
}
