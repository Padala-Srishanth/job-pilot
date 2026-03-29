import React, { useState, useEffect, useCallback } from 'react';
import { jobsAPI, applicationsAPI, scraperAPI, savedJobsAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineSearch, HiOutlineLocationMarker, HiOutlineBriefcase,
  HiOutlineFilter, HiOutlineLightningBolt, HiOutlineCurrencyDollar,
  HiOutlineGlobeAlt, HiOutlineRefresh, HiOutlineExternalLink, HiOutlineBookmark
} from 'react-icons/hi';
import SmartInput from '../components/common/SmartInput';

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '', location: '', workType: 'any', jobType: 'any', sort: 'relevance'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showScraper, setShowScraper] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [applying, setApplying] = useState(null);
  const [scraping, setScraping] = useState(false);
  const [scrapeForm, setScrapeForm] = useState({
    query: 'web development', sources: ['linkedin', 'indeed'], location: 'India', pages: 1
  });

  const fetchJobs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { ...filters, page, limit: 12 };
      Object.keys(params).forEach(k => { if (params[k] === 'any' || params[k] === '') delete params[k]; });
      const res = await jobsAPI.getAll(params);
      setJobs(res.data.jobs);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleApply = async (jobId) => {
    setApplying(jobId);
    try {
      await applicationsAPI.apply(jobId, {});
      toast.success('Application submitted!');
      setJobs(prev => prev.map(j => j._id === jobId ? { ...j, applied: true } : j));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Application failed');
    } finally {
      setApplying(null);
    }
  };

  const handleSaveJob = async (jobId) => {
    try {
      await savedJobsAPI.save(jobId);
      toast.success('Job saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
  };

  const handleSeed = async () => {
    try {
      await jobsAPI.seed();
      toast.success('Sample jobs loaded!');
      fetchJobs();
    } catch (err) {
      toast.error('Failed to seed jobs');
    }
  };

  const handleScrape = async () => {
    setScraping(true);
    try {
      const res = await scraperAPI.runSync({
        sources: scrapeForm.sources,
        query: scrapeForm.query,
        location: scrapeForm.location,
        pages: scrapeForm.pages
      });
      const data = res.data;
      toast.success(`Scraped ${data.total} jobs! ${data.new} new added.`);
      fetchJobs();
    } catch (err) {
      if (err.response?.status === 429) {
        toast.error('A scrape is already running. Please wait.');
      } else {
        toast.error(err.response?.data?.message || 'Scraping failed');
      }
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Browse Jobs</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowScraper(!showScraper)} className="btn-primary text-sm flex items-center gap-1.5">
            <HiOutlineGlobeAlt className="w-4 h-4" /> Scrape Real Jobs
          </button>
          <button onClick={handleSeed} className="btn-secondary text-sm">Load Sample Jobs</button>
        </div>
      </div>

      {/* Scraper Panel */}
      {showScraper && (
        <div className="glass-card p-5 border-accent-green/30">
          <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
            <HiOutlineGlobeAlt className="w-5 h-5 text-accent-green" /> Scrape Jobs from Real Websites
          </h3>
          <p className="text-xs text-dark-400 mb-4">Puppeteer opens a headless browser, visits real job sites, and extracts listings into your database.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs text-dark-400 mb-1">Search Keyword</label>
              <SmartInput
                className="input-field text-sm"
                placeholder="e.g. react developer"
                value={scrapeForm.query}
                onChange={val => setScrapeForm(p => ({ ...p, query: val }))}
              />
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">Location</label>
              <SmartInput
                className="input-field text-sm"
                placeholder="e.g. India, Bangalore"
                value={scrapeForm.location}
                onChange={val => setScrapeForm(p => ({ ...p, location: val }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-dark-400 mb-1">Pages (max 3)</label>
                <input
                  type="number" className="input-field text-sm" min="1" max="3"
                  value={scrapeForm.pages}
                  onChange={e => setScrapeForm(p => ({ ...p, pages: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleScrape}
                  disabled={scraping || scrapeForm.sources.length === 0}
                  className="btn-primary w-full text-sm flex items-center justify-center gap-1.5"
                >
                  {scraping ? (
                    <><HiOutlineRefresh className="w-4 h-4 animate-spin" /> Scraping...</>
                  ) : (
                    <><HiOutlineLightningBolt className="w-4 h-4" /> Scrape</>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs text-dark-400 mb-2">Job Sources</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'linkedin', label: 'LinkedIn', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
                { id: 'indeed', label: 'Indeed', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
                { id: 'internshala', label: 'Internshala', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
                { id: 'naukri', label: 'Naukri', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
                { id: 'glassdoor', label: 'Glassdoor', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
                { id: 'foundit', label: 'Foundit', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
                { id: 'timesjobs', label: 'TimesJobs', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
              ].map(src => {
                const isSelected = scrapeForm.sources.includes(src.id);
                return (
                  <button
                    key={src.id}
                    onClick={() => {
                      setScrapeForm(p => ({
                        ...p,
                        sources: isSelected
                          ? p.sources.filter(s => s !== src.id)
                          : [...p.sources, src.id]
                      }));
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      isSelected ? src.color : 'bg-dark-900 text-dark-400 border-dark-600 hover:border-dark-500'
                    }`}
                  >
                    {isSelected ? '✓ ' : ''}{src.label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setScrapeForm(p => ({ ...p, sources: ['linkedin', 'indeed', 'internshala', 'naukri', 'glassdoor', 'foundit', 'timesjobs'] }))}
              className="text-xs text-accent-green hover:underline mt-2"
            >
              Select All
            </button>
            <span className="text-xs text-dark-500 mx-2">|</span>
            <button
              onClick={() => setScrapeForm(p => ({ ...p, sources: [] }))}
              className="text-xs text-dark-400 hover:underline mt-2"
            >
              Clear All
            </button>
          </div>
          {scraping && (
            <div className="bg-dark-900 rounded-lg p-3 text-sm text-dark-400 flex items-center justify-between">
              <div>
                <HiOutlineRefresh className="w-4 h-4 animate-spin inline mr-2" />
                Scraping in progress... This may take 30-60 seconds per source.
              </div>
              <button
                onClick={async () => {
                  try {
                    await scraperAPI.stop();
                    toast.success('Scrape stopped');
                    setScraping(false);
                    fetchJobs();
                  } catch { toast.error('Failed to stop'); }
                }}
                className="px-4 py-1.5 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-all flex-shrink-0"
              >
                Stop Scraping
              </button>
            </div>
          )}
        </div>
      )}

      {/* Search Bar */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SmartInput
              icon={HiOutlineSearch}
              className="input-field"
              placeholder="Search jobs, skills, companies..."
              value={filters.search}
              onChange={val => setFilters({ ...filters, search: val })}
              onSubmit={() => fetchJobs()}
            />
          </div>
          <div className="flex-1 sm:max-w-[200px]">
            <SmartInput
              icon={HiOutlineLocationMarker}
              className="input-field"
              placeholder="Location"
              value={filters.location}
              onChange={val => setFilters({ ...filters, location: val })}
            />
          </div>
          <button onClick={() => fetchJobs()} className="btn-primary">Search</button>
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary flex items-center gap-1">
            <HiOutlineFilter className="w-4 h-4" /> Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-dark-700">
            <select className="input-field" value={filters.workType} onChange={e => setFilters({ ...filters, workType: e.target.value })}>
              <option value="any">All Work Types</option>
              <option value="remote">Remote</option>
              <option value="on-site">On-site</option>
              <option value="hybrid">Hybrid</option>
            </select>
            <select className="input-field" value={filters.jobType} onChange={e => setFilters({ ...filters, jobType: e.target.value })}>
              <option value="any">All Job Types</option>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="internship">Internship</option>
              <option value="contract">Contract</option>
            </select>
            <select className="input-field" value={filters.sort} onChange={e => setFilters({ ...filters, sort: e.target.value })}>
              <option value="relevance">Sort by Relevance</option>
              <option value="date">Sort by Date</option>
            </select>
          </div>
        )}
      </div>

      {/* Results */}
      <p className="text-sm text-dark-400">{pagination.total} jobs found</p>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-4 bg-dark-700 rounded w-3/4 mb-3" />
              <div className="h-3 bg-dark-700 rounded w-1/2 mb-4" />
              <div className="h-3 bg-dark-700 rounded w-full mb-2" />
              <div className="h-3 bg-dark-700 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : jobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map(job => (
            <div key={job._id} className="glass-card p-5 hover:border-dark-500 transition-all flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-dark-600 to-dark-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {job.company?.charAt(0)}
                </div>
                {job.relevanceScore != null && (
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    job.relevanceScore >= 80 ? 'bg-accent-green/20 text-accent-green' :
                    job.relevanceScore >= 60 ? 'bg-accent-blue/20 text-accent-blue' :
                    'bg-dark-600 text-dark-300'
                  }`}>
                    {job.relevanceScore}%
                  </span>
                )}
              </div>

              <h3 className="text-base font-semibold text-white mb-1">{job.title}</h3>
              <p className="text-sm text-dark-400 mb-3">{job.company}</p>

              <div className="flex flex-wrap gap-2 mb-3">
                <span className="inline-flex items-center gap-1 text-xs text-dark-300 bg-dark-900 px-2 py-1 rounded">
                  <HiOutlineLocationMarker className="w-3 h-3" /> {job.location}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-dark-300 bg-dark-900 px-2 py-1 rounded">
                  <HiOutlineBriefcase className="w-3 h-3" /> {job.jobType}
                </span>
                {job.salaryMax && (
                  <span className="inline-flex items-center gap-1 text-xs text-dark-300 bg-dark-900 px-2 py-1 rounded">
                    <HiOutlineCurrencyDollar className="w-3 h-3" /> {job.salaryCurrency || 'USD'} {job.salaryMin?.toLocaleString()}-{job.salaryMax?.toLocaleString()}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {(job.skills || []).slice(0, 4).map(skill => (
                  <span key={skill} className="text-xs px-2 py-0.5 rounded bg-accent-green/10 text-accent-green border border-accent-green/20">
                    {skill}
                  </span>
                ))}
                {(job.skills?.length || 0) > 4 && <span className="text-xs text-dark-400">+{job.skills.length - 4}</span>}
              </div>

              {/* Source badge */}
              {job.source && (
                <div className="mb-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-dark-700 text-dark-400">
                    via {job.source}
                  </span>
                </div>
              )}

              <div className="mt-auto flex gap-2">
                {job.applicationUrl && job.applicationUrl !== '#' ? (
                  <a
                    href={job.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-sm py-2 rounded-lg font-medium transition-all btn-primary text-center flex items-center justify-center gap-1.5"
                  >
                    <HiOutlineExternalLink className="w-4 h-4" /> Apply on {job.source || 'Site'}
                  </a>
                ) : (
                  <button
                    onClick={() => handleApply(job._id)}
                    disabled={applying === job._id || job.applied}
                    className={`flex-1 text-sm py-2 rounded-lg font-medium transition-all ${
                      job.applied
                        ? 'bg-dark-700 text-dark-400 cursor-not-allowed'
                        : 'btn-primary'
                    }`}
                  >
                    {job.applied ? 'Applied' : applying === job._id ? 'Applying...' : (
                      <span className="flex items-center justify-center gap-1.5">
                        <HiOutlineLightningBolt className="w-4 h-4" /> Quick Apply
                      </span>
                    )}
                  </button>
                )}
                <button
                  onClick={() => handleSaveJob(job._id)}
                  className="px-3 py-2 rounded-lg text-sm bg-dark-700 text-dark-300 hover:bg-dark-600 hover:text-accent-blue transition-all"
                  title="Save job"
                >
                  <HiOutlineBookmark className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-dark-400">
          <HiOutlineBriefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">No jobs found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pagination.pages }, (_, i) => (
            <button
              key={i} onClick={() => fetchJobs(i + 1)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                pagination.page === i + 1 ? 'bg-accent-green text-white' : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
