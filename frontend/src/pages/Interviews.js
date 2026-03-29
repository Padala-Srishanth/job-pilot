import React, { useState, useEffect } from 'react';
import { interviewsAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineCalendar, HiOutlinePlus, HiOutlineVideoCamera, HiOutlinePhone,
  HiOutlineOfficeBuilding, HiOutlineCode, HiOutlineTrash, HiOutlinePencil,
  HiOutlineCheck, HiOutlineX, HiOutlineClipboardList
} from 'react-icons/hi';

const typeIcons = {
  video: HiOutlineVideoCamera, phone: HiOutlinePhone,
  onsite: HiOutlineOfficeBuilding, 'take-home': HiOutlineCode
};
const typeLabels = { video: 'Video Call', phone: 'Phone', onsite: 'On-site', 'take-home': 'Take Home' };
const statusColors = {
  scheduled: 'text-accent-blue bg-accent-blue/10', completed: 'text-accent-green bg-accent-green/10',
  cancelled: 'text-red-400 bg-red-400/10', rescheduled: 'text-accent-orange bg-accent-orange/10'
};

export default function Interviews() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ jobTitle: '', company: '', date: '', time: '', type: 'video', link: '', location: '', notes: '' });

  useEffect(() => { loadInterviews(); }, []);

  const loadInterviews = async () => {
    setLoading(true);
    try {
      const res = await interviewsAPI.getAll();
      setInterviews(res.data.interviews || []);
    } catch { /* empty */ }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await interviewsAPI.update(editId, form);
        toast.success('Interview updated');
      } else {
        await interviewsAPI.create(form);
        toast.success('Interview scheduled!');
      }
      setShowForm(false);
      setEditId(null);
      setForm({ jobTitle: '', company: '', date: '', time: '', type: 'video', link: '', location: '', notes: '' });
      loadInterviews();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleEdit = (interview) => {
    setForm({
      jobTitle: interview.jobTitle, company: interview.company,
      date: interview.date?.split('T')[0] || '', time: interview.time,
      type: interview.type, link: interview.meetingLink,
      location: interview.location, notes: interview.notes
    });
    setEditId(interview._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      await interviewsAPI.remove(id);
      setInterviews(prev => prev.filter(i => i._id !== id));
      toast.success('Interview deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await interviewsAPI.update(id, { status });
      loadInterviews();
    } catch { toast.error('Failed to update'); }
  };

  const upcoming = interviews.filter(i => i.status === 'scheduled' && new Date(i.date) >= new Date());
  const past = interviews.filter(i => i.status !== 'scheduled' || new Date(i.date) < new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Interviews</h1>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ jobTitle: '', company: '', date: '', time: '', type: 'video', link: '', location: '', notes: '' }); }} className="btn-primary text-sm flex items-center gap-1.5">
          <HiOutlinePlus className="w-4 h-4" /> Schedule Interview
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">{editId ? 'Edit Interview' : 'Schedule New Interview'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-dark-400 mb-1">Job Title</label>
              <input className="input-field" placeholder="e.g. Frontend Developer" value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">Company</label>
              <input className="input-field" placeholder="e.g. Google" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">Date</label>
              <input type="date" className="input-field" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">Time</label>
              <input type="time" className="input-field" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">Type</label>
              <select className="input-field" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="video">Video Call</option>
                <option value="phone">Phone</option>
                <option value="onsite">On-site</option>
                <option value="take-home">Take Home</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">Meeting Link / Location</label>
              <input className="input-field" placeholder="Zoom/Meet link or address" value={form.link || form.location} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1">Notes / Prep</label>
            <textarea className="input-field h-20 resize-none" placeholder="Interviewer name, topics to prepare..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary">{editId ? 'Update' : 'Schedule'}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Upcoming</h2>
          <div className="space-y-3">
            {upcoming.map(iv => {
              const TypeIcon = typeIcons[iv.type] || HiOutlineCalendar;
              return (
                <div key={iv._id} className="glass-card p-5 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-lg bg-accent-purple/10 flex items-center justify-center flex-shrink-0">
                    <TypeIcon className="w-5 h-5 text-accent-purple" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white">{iv.jobTitle}</h3>
                    <p className="text-sm text-dark-400">{iv.company}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-dark-300">
                      <span>{new Date(iv.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      {iv.time && <span>{iv.time}</span>}
                      <span>{typeLabels[iv.type] || iv.type}</span>
                    </div>
                    {iv.meetingLink && <a href={iv.meetingLink} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-blue hover:underline mt-1 block">Join Meeting</a>}
                    {iv.notes && <p className="text-xs text-dark-500 mt-2">{iv.notes}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button onClick={() => handleStatusChange(iv._id, 'completed')} className="text-xs text-accent-green hover:bg-accent-green/10 px-2 py-1 rounded flex items-center gap-1"><HiOutlineCheck className="w-3 h-3" /> Done</button>
                    <button onClick={() => handleEdit(iv)} className="text-xs text-dark-400 hover:bg-dark-700 px-2 py-1 rounded flex items-center gap-1"><HiOutlinePencil className="w-3 h-3" /> Edit</button>
                    <button onClick={() => handleDelete(iv._id)} className="text-xs text-red-400 hover:bg-red-400/10 px-2 py-1 rounded flex items-center gap-1"><HiOutlineTrash className="w-3 h-3" /> Del</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Past Interviews</h2>
          <div className="space-y-3">
            {past.map(iv => (
              <div key={iv._id} className="glass-card p-4 flex items-center gap-4 opacity-70">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">{iv.jobTitle} — {iv.company}</p>
                  <p className="text-xs text-dark-500">{new Date(iv.date).toLocaleDateString()} · {typeLabels[iv.type]}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[iv.status] || 'text-dark-400'}`}>{iv.status}</span>
                <button onClick={() => handleDelete(iv._id)} className="text-dark-500 hover:text-red-400"><HiOutlineTrash className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && interviews.length === 0 && !showForm && (
        <div className="text-center py-16 text-dark-400">
          <HiOutlineCalendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">No interviews scheduled</p>
          <p className="text-sm mt-1">Click "Schedule Interview" to add one</p>
        </div>
      )}
    </div>
  );
}
