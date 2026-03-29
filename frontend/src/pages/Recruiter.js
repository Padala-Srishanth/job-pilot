import React, { useState, useEffect } from 'react';
import { recruiterAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineSpeakerphone, HiOutlineHeart, HiOutlineExternalLink,
  HiOutlineLocationMarker, HiOutlineBriefcase, HiOutlineChatAlt
} from 'react-icons/hi';

export default function Recruiter() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await recruiterAPI.getPosts({});
      if (res.data.posts.length === 0) {
        await recruiterAPI.seed();
        const seeded = await recruiterAPI.getPosts({});
        setPosts(seeded.data.posts);
      } else {
        setPosts(res.data.posts);
      }
    } catch {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (id) => {
    try {
      const res = await recruiterAPI.likePost(id);
      setPosts(prev => prev.map(p => p._id === id ? { ...p, likes: res.data.post.likes } : p));
    } catch {
      toast.error('Failed to like');
    }
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  const timeAgo = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now - d) / (1000 * 60 * 60));
    if (diff < 1) return 'Just now';
    if (diff < 24) return `${diff}h ago`;
    return `${Math.floor(diff / 24)}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Recruiter Posts</h1>
        <button onClick={() => recruiterAPI.seed().then(loadPosts)} className="btn-secondary text-sm">Load Sample Posts</button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="flex gap-3 mb-4"><div className="w-12 h-12 rounded-full bg-dark-700" /><div><div className="h-4 bg-dark-700 rounded w-32 mb-2" /><div className="h-3 bg-dark-700 rounded w-24" /></div></div>
              <div className="h-4 bg-dark-700 rounded w-full mb-2" />
              <div className="h-4 bg-dark-700 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl">
          {posts.map(post => (
            <div key={post._id} className="glass-card p-6 hover:border-dark-500 transition-all">
              {/* Recruiter Info */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {getInitials(post.recruiter?.name)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">{post.recruiter?.name}</p>
                  <p className="text-sm text-dark-400">{post.recruiter?.title} at {post.recruiter?.company}</p>
                  <p className="text-xs text-dark-500">{timeAgo(post.postedDate)}</p>
                </div>
              </div>

              {/* Content */}
              <p className="text-dark-200 mb-4 leading-relaxed">{post.content}</p>

              {/* Job Details */}
              <div className="flex flex-wrap gap-2 mb-4">
                {post.jobTitle && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-accent-blue/10 text-accent-blue">
                    <HiOutlineBriefcase className="w-3 h-3" /> {post.jobTitle}
                  </span>
                )}
                {post.location && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-accent-purple/10 text-accent-purple">
                    <HiOutlineLocationMarker className="w-3 h-3" /> {post.location}
                  </span>
                )}
                {post.jobType && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-dark-700 text-dark-300">
                    {post.jobType}
                  </span>
                )}
              </div>

              {/* Skills */}
              {post.skills?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {post.skills.map(skill => (
                    <span key={skill} className="text-xs px-2 py-0.5 rounded bg-accent-green/10 text-accent-green border border-accent-green/20">
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-4 pt-3 border-t border-dark-700">
                <button onClick={() => handleLike(post._id)} className="flex items-center gap-1.5 text-sm text-dark-400 hover:text-red-400 transition-all">
                  <HiOutlineHeart className="w-5 h-5" /> {post.likes}
                </button>
                <button className="flex items-center gap-1.5 text-sm text-dark-400 hover:text-accent-blue transition-all">
                  <HiOutlineChatAlt className="w-5 h-5" /> Message
                </button>
                {post.applicationLink && (
                  <a href={post.applicationLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-dark-400 hover:text-accent-green transition-all ml-auto">
                    <HiOutlineExternalLink className="w-5 h-5" /> Apply
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="text-center py-16 text-dark-400">
          <HiOutlineSpeakerphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">No recruiter posts yet</p>
        </div>
      )}
    </div>
  );
}
