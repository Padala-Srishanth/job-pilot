import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineUpload, HiOutlineDocumentText, HiOutlineAcademicCap,
  HiOutlineBriefcase, HiOutlineCode, HiOutlineLightBulb,
  HiOutlineCog, HiOutlineCheck, HiOutlinePlus, HiOutlineX, HiOutlineSparkles
} from 'react-icons/hi';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState('resume');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [newSkill, setNewSkill] = useState('');
  const [preferences, setPreferences] = useState({
    roles: [], locations: [], salaryMin: 0, salaryMax: 0, workType: 'any', jobType: 'any', industries: []
  });
  const [smartApply, setSmartApply] = useState({ enabled: false, dailyLimit: 10 });
  const [newPrefRole, setNewPrefRole] = useState('');
  const [newPrefLocation, setNewPrefLocation] = useState('');

  useEffect(() => {
    if (user?.preferences) setPreferences(prev => ({ ...prev, ...user.preferences }));
    if (user?.smartApply) setSmartApply(user.smartApply);
  }, [user]);

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      const res = await profileAPI.uploadResume(formData);
      updateUser({ resume: res.data.resume });
      toast.success('Resume uploaded and parsed!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleAddSkill = async () => {
    if (!newSkill.trim()) return;
    const skills = [...(user?.resume?.parsedData?.skills || []), newSkill.trim()];
    try {
      await profileAPI.updateSkills(skills);
      updateUser({ resume: { ...user.resume, parsedData: { ...user.resume?.parsedData, skills } } });
      setNewSkill('');
      toast.success('Skill added');
    } catch (err) {
      toast.error('Failed to add skill');
    }
  };

  const handleRemoveSkill = async (skillToRemove) => {
    const skills = (user?.resume?.parsedData?.skills || []).filter(s => s !== skillToRemove);
    try {
      await profileAPI.updateSkills(skills);
      updateUser({ resume: { ...user.resume, parsedData: { ...user.resume?.parsedData, skills } } });
    } catch (err) {
      toast.error('Failed to remove skill');
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      await profileAPI.update({ preferences });
      updateUser({ preferences });
      toast.success('Preferences saved');
    } catch (err) {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSmartApplyToggle = async () => {
    try {
      const res = await profileAPI.toggleSmartApply({
        enabled: !smartApply.enabled,
        dailyLimit: smartApply.dailyLimit
      });
      setSmartApply(res.data.smartApply);
      updateUser({ smartApply: res.data.smartApply });
      toast.success(res.data.smartApply.enabled ? 'Smart Apply enabled' : 'Smart Apply disabled');
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  const [aiInsights, setAiInsights] = useState(null);

  const loadSuggestions = async () => {
    try {
      const res = await profileAPI.getResumeSuggestions();
      setSuggestions(res.data.suggestions);
      if (res.data.aiAnalysis) setAiInsights(res.data.aiAnalysis);
    } catch (err) {
      toast.error('Failed to load suggestions');
    }
  };

  const parsedData = user?.resume?.parsedData || {};
  const aiAnalysis = parsedData.aiAnalysis || aiInsights;
  const tabs = [
    { id: 'resume', label: 'Resume', icon: HiOutlineDocumentText },
    { id: 'preferences', label: 'Preferences', icon: HiOutlineCog },
    { id: 'smart-apply', label: 'Smart Apply', icon: HiOutlineLightBulb }
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Profile</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-700 pb-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              tab === t.id ? 'border-accent-green text-accent-green' : 'border-transparent text-dark-400 hover:text-dark-200'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Resume Tab */}
      {tab === 'resume' && (
        <div className="space-y-6">
          {/* Upload Section */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Resume</h3>
            <div className="border-2 border-dashed border-dark-600 rounded-xl p-8 text-center hover:border-accent-green/50 transition-all">
              <HiOutlineUpload className="w-10 h-10 text-dark-400 mx-auto mb-3" />
              <p className="text-dark-300 mb-2">
                {user?.resume?.originalName || 'Drop your resume here or click to upload'}
              </p>
              <p className="text-xs text-dark-500 mb-4">PDF, DOC, DOCX (max 5MB)</p>
              <label className="btn-primary cursor-pointer inline-block">
                {uploading ? 'Uploading...' : 'Upload Resume'}
                <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleResumeUpload} disabled={uploading} />
              </label>
            </div>
          </div>

          {/* Parsed Skills */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <HiOutlineCode className="w-5 h-5" /> Skills
              </h3>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {(parsedData.skills || []).map(skill => (
                <span key={skill} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent-green/10 text-accent-green text-sm border border-accent-green/20">
                  {skill}
                  <button onClick={() => handleRemoveSkill(skill)} className="hover:text-red-400 ml-1">
                    <HiOutlineX className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              {(!parsedData.skills || parsedData.skills.length === 0) && (
                <p className="text-dark-400 text-sm">No skills detected. Upload a resume or add manually.</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text" className="input-field flex-1" placeholder="Add a skill..."
                value={newSkill}
                onChange={e => setNewSkill(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddSkill()}
              />
              <button onClick={handleAddSkill} className="btn-primary flex items-center gap-1">
                <HiOutlinePlus className="w-4 h-4" /> Add
              </button>
            </div>
          </div>

          {/* Experience & Education */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <HiOutlineBriefcase className="w-5 h-5" /> Experience
              </h3>
              {(parsedData.experience || []).length > 0 ? (
                <div className="space-y-3">
                  {parsedData.experience.map((exp, i) => (
                    <div key={i} className="p-3 rounded-lg bg-dark-900">
                      <p className="font-medium text-white text-sm">{exp.title}</p>
                      <p className="text-xs text-dark-400">{exp.company} {exp.duration && `· ${exp.duration}`}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-dark-400 text-sm">Upload resume to detect experience</p>
              )}
            </div>

            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <HiOutlineAcademicCap className="w-5 h-5" /> Education
              </h3>
              {(parsedData.education || []).length > 0 ? (
                <div className="space-y-3">
                  {parsedData.education.map((edu, i) => (
                    <div key={i} className="p-3 rounded-lg bg-dark-900">
                      <p className="font-medium text-white text-sm">{edu.degree}</p>
                      <p className="text-xs text-dark-400">{edu.institution} {edu.year && `· ${edu.year}`}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-dark-400 text-sm">Upload resume to detect education</p>
              )}
            </div>
          </div>

          {/* AI Resume Analysis */}
          {aiAnalysis && (
            <div className="glass-card p-6 border border-accent-purple/20">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <HiOutlineSparkles className="w-5 h-5 text-accent-purple" /> AI Resume Analysis
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent-purple/20 text-accent-purple ml-2">
                  {aiAnalysis.method === 'ai' ? 'GPT-powered' : 'NLP'}
                </span>
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-dark-900 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-white capitalize">{aiAnalysis.domain || '—'}</p>
                  <p className="text-xs text-dark-400">Domain</p>
                </div>
                <div className="bg-dark-900 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-accent-green capitalize">{aiAnalysis.experienceLevel || '—'}</p>
                  <p className="text-xs text-dark-400">Level</p>
                </div>
                <div className="bg-dark-900 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-accent-blue">{aiAnalysis.years || 0}+</p>
                  <p className="text-xs text-dark-400">Years Exp</p>
                </div>
                <div className="bg-dark-900 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-accent-orange">{(parsedData.skills || []).length}</p>
                  <p className="text-xs text-dark-400">Skills Found</p>
                </div>
              </div>

              {(aiAnalysis.strengths || []).length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-dark-400 mb-2">Strengths Detected</p>
                  <div className="flex flex-wrap gap-2">
                    {aiAnalysis.strengths.map((s, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-accent-green/10 text-accent-green border border-accent-green/20">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {(aiAnalysis.missingSkills || []).length > 0 && (
                <div>
                  <p className="text-xs text-dark-400 mb-2">Consider Adding</p>
                  <div className="flex flex-wrap gap-2">
                    {aiAnalysis.missingSkills.map((s, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-accent-orange/10 text-accent-orange border border-accent-orange/20">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Suggestions */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <HiOutlineLightBulb className="w-5 h-5 text-accent-orange" /> Resume Suggestions
              </h3>
              <button onClick={loadSuggestions} className="btn-secondary text-sm">
                {aiAnalysis ? 'Refresh Analysis' : 'Analyze Resume'}
              </button>
            </div>
            {suggestions.length > 0 ? (
              <ul className="space-y-2">
                {suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-dark-300">
                    <HiOutlineCheck className="w-4 h-4 text-accent-green mt-0.5 flex-shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-dark-400 text-sm">Upload your resume and click "Analyze Resume" to get AI-powered insights</p>
            )}
          </div>
        </div>
      )}

      {/* Preferences Tab */}
      {tab === 'preferences' && (
        <div className="glass-card p-6 space-y-6">
          <h3 className="text-lg font-semibold text-white">Job Preferences</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-dark-300 mb-2">Preferred Roles</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(preferences.roles || []).map(role => (
                  <span key={role} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-accent-blue/10 text-accent-blue text-xs">
                    {role}
                    <button onClick={() => setPreferences(p => ({ ...p, roles: p.roles.filter(r => r !== role) }))}>
                      <HiOutlineX className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" className="input-field text-sm" placeholder="e.g. Frontend Developer" value={newPrefRole} onChange={e => setNewPrefRole(e.target.value)} />
                <button onClick={() => { if (newPrefRole.trim()) { setPreferences(p => ({ ...p, roles: [...p.roles, newPrefRole.trim()] })); setNewPrefRole(''); }}} className="btn-secondary text-sm">Add</button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-dark-300 mb-2">Preferred Locations</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(preferences.locations || []).map(loc => (
                  <span key={loc} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-accent-purple/10 text-accent-purple text-xs">
                    {loc}
                    <button onClick={() => setPreferences(p => ({ ...p, locations: p.locations.filter(l => l !== loc) }))}>
                      <HiOutlineX className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" className="input-field text-sm" placeholder="e.g. San Francisco" value={newPrefLocation} onChange={e => setNewPrefLocation(e.target.value)} />
                <button onClick={() => { if (newPrefLocation.trim()) { setPreferences(p => ({ ...p, locations: [...p.locations, newPrefLocation.trim()] })); setNewPrefLocation(''); }}} className="btn-secondary text-sm">Add</button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-dark-300 mb-2">Work Type</label>
              <select className="input-field" value={preferences.workType} onChange={e => setPreferences(p => ({ ...p, workType: e.target.value }))}>
                <option value="any">Any</option>
                <option value="remote">Remote</option>
                <option value="on-site">On-site</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-dark-300 mb-2">Job Type</label>
              <select className="input-field" value={preferences.jobType} onChange={e => setPreferences(p => ({ ...p, jobType: e.target.value }))}>
                <option value="any">Any</option>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="internship">Internship</option>
                <option value="contract">Contract</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-dark-300 mb-2">Min Salary</label>
              <input type="number" className="input-field" placeholder="0" value={preferences.salaryMin || ''} onChange={e => setPreferences(p => ({ ...p, salaryMin: parseInt(e.target.value) || 0 }))} />
            </div>

            <div>
              <label className="block text-sm text-dark-300 mb-2">Max Salary</label>
              <input type="number" className="input-field" placeholder="0" value={preferences.salaryMax || ''} onChange={e => setPreferences(p => ({ ...p, salaryMax: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>

          <button onClick={handleSavePreferences} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      )}

      {/* Smart Apply Tab */}
      {tab === 'smart-apply' && (
        <div className="glass-card p-6 space-y-6">
          <h3 className="text-lg font-semibold text-white">Smart Apply Settings</h3>

          <div className="flex items-center justify-between p-4 rounded-lg bg-dark-900">
            <div>
              <p className="font-medium text-white">Auto Apply</p>
              <p className="text-sm text-dark-400">Automatically apply to matching jobs</p>
            </div>
            <button
              onClick={handleSmartApplyToggle}
              className={`relative w-12 h-6 rounded-full transition-all ${smartApply.enabled ? 'bg-accent-green' : 'bg-dark-600'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${smartApply.enabled ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div>
            <label className="block text-sm text-dark-300 mb-2">Daily Application Limit</label>
            <input
              type="number" className="input-field max-w-[200px]" min="1" max="50"
              value={smartApply.dailyLimit}
              onChange={e => setSmartApply(s => ({ ...s, dailyLimit: parseInt(e.target.value) || 10 }))}
            />
            <p className="text-xs text-dark-500 mt-1">Max 50 applications per day</p>
          </div>

          <div className="p-4 rounded-lg bg-dark-900">
            <p className="text-sm text-dark-400">
              Applied today: <span className="text-white font-medium">{smartApply.appliedToday || 0}</span> / {smartApply.dailyLimit}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
