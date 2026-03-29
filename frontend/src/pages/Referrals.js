import React, { useState, useEffect } from 'react';
import { referralsAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineUsers, HiOutlineSearch, HiOutlineMail,
  HiOutlineLink, HiOutlineOfficeBuilding, HiOutlineSparkles
} from 'react-icons/hi';

export default function Referrals() {
  const [referrals, setReferrals] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('browse');
  const [messageModal, setMessageModal] = useState(null);
  const [message, setMessage] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [refRes, reqRes] = await Promise.all([
        referralsAPI.getAll({ company: search }),
        referralsAPI.getMyRequests()
      ]);
      setReferrals(refRes.data.referrals);
      setMyRequests(reqRes.data.requests);
    } catch {
      // Try seeding first
      try {
        await referralsAPI.seed();
        const refRes = await referralsAPI.getAll({});
        setReferrals(refRes.data.referrals);
      } catch {
        toast.error('Failed to load referrals');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await referralsAPI.getAll({ company: search });
      setReferrals(res.data.referrals);
    } catch {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMessage = async (referral) => {
    setMessageModal(referral);
    setGenerating(true);
    try {
      const res = await referralsAPI.generateMessage({ referralId: referral._id });
      setMessage(res.data.message);
    } catch {
      setMessage(`Hi ${referral.name},\n\nI'd love to connect regarding opportunities at ${referral.company}. Would you be open to a brief chat?\n\nBest regards`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSendRequest = async () => {
    if (!messageModal) return;
    try {
      await referralsAPI.request({ referralId: messageModal._id, customMessage: message });
      toast.success('Referral request sent!');
      setMessageModal(null);
      setMessage('');
      loadData();
    } catch (err) {
      toast.error('Failed to send request');
    }
  };

  const connectionColors = { '1st': 'text-accent-green', '2nd': 'text-accent-blue', '3rd': 'text-accent-purple', 'none': 'text-dark-400' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Referrals</h1>
        <button onClick={() => referralsAPI.seed().then(loadData)} className="btn-secondary text-sm">Load Sample Data</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-dark-700">
        <button onClick={() => setTab('browse')} className={`pb-2 text-sm font-medium border-b-2 -mb-px ${tab === 'browse' ? 'border-accent-green text-accent-green' : 'border-transparent text-dark-400'}`}>
          Browse Contacts
        </button>
        <button onClick={() => setTab('requests')} className={`pb-2 text-sm font-medium border-b-2 -mb-px ${tab === 'requests' ? 'border-accent-green text-accent-green' : 'border-transparent text-dark-400'}`}>
          My Requests ({myRequests.length})
        </button>
      </div>

      {tab === 'browse' && (
        <>
          {/* Search */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <HiOutlineSearch className="absolute left-3 top-3 w-5 h-5 text-dark-400" />
              <input type="text" className="input-field pl-10" placeholder="Search by company..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
            </div>
            <button onClick={handleSearch} className="btn-primary">Search</button>
          </div>

          {/* Contacts Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass-card p-5 animate-pulse"><div className="h-4 bg-dark-700 rounded w-3/4 mb-3" /><div className="h-3 bg-dark-700 rounded w-1/2" /></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {referrals.map(ref => (
                <div key={ref._id} className="glass-card p-5 hover:border-dark-500 transition-all">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-white font-semibold">
                      {ref.name?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{ref.name}</p>
                      <p className="text-sm text-dark-400">{ref.position}</p>
                    </div>
                    <span className={`text-xs font-medium ${connectionColors[ref.connectionStrength] || 'text-dark-400'}`}>
                      {ref.connectionStrength}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <HiOutlineOfficeBuilding className="w-4 h-4 text-dark-400" />
                    <span className="text-sm text-dark-300">{ref.company}</span>
                    {ref.industry && (
                      <span className="text-xs text-dark-500">· {ref.industry}</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => handleGenerateMessage(ref)} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1">
                      <HiOutlineMail className="w-4 h-4" /> Request Referral
                    </button>
                    {ref.linkedinUrl && ref.linkedinUrl !== '#' && (
                      <a href={ref.linkedinUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary p-2.5">
                        <HiOutlineLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'requests' && (
        <div className="space-y-3">
          {myRequests.length > 0 ? myRequests.map(req => (
            <div key={req._id} className="glass-card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-white font-semibold text-sm">
                {req.referral?.name?.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">{req.referral?.name} at {req.referral?.company}</p>
                <p className="text-xs text-dark-400">{new Date(req.createdAt).toLocaleDateString()}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                req.status === 'accepted' ? 'bg-accent-green/10 text-accent-green' :
                req.status === 'declined' ? 'bg-red-400/10 text-red-400' :
                'bg-accent-orange/10 text-accent-orange'
              }`}>
                {req.status}
              </span>
            </div>
          )) : (
            <div className="text-center py-12 text-dark-400">
              <HiOutlineUsers className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No referral requests yet</p>
            </div>
          )}
        </div>
      )}

      {/* Message Modal */}
      {messageModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Referral Message</h3>
              <button onClick={() => setMessageModal(null)} className="text-dark-400 hover:text-white">
                <HiOutlineUsers className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-dark-400 mb-3">
              To: <span className="text-white">{messageModal.name}</span> at {messageModal.company}
            </p>
            {generating ? (
              <div className="flex items-center gap-2 text-sm text-dark-400 py-4">
                <HiOutlineSparkles className="w-4 h-4 animate-pulse" /> Generating AI message...
              </div>
            ) : (
              <textarea
                className="input-field h-40 resize-none"
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
            )}
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setMessageModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleSendRequest} disabled={generating} className="btn-primary">Send Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
