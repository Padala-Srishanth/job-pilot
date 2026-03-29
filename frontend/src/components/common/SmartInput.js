import React, { useState, useEffect, useRef } from 'react';
import { correctQuery, getSuggestions } from '../../utils/spellCorrect';

/**
 * Smart Input with spell-check, autocomplete suggestions, and "Did you mean?" correction
 */
export default function SmartInput({
  value, onChange, placeholder, className = '', icon: Icon, onSubmit
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [correction, setCorrection] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  // Autocomplete suggestions on typing
  useEffect(() => {
    if (value && value.length >= 2) {
      const sug = getSuggestions(value, 6);
      setSuggestions(sug);
      setSelectedIdx(-1);
    } else {
      setSuggestions([]);
    }
  }, [value]);

  // Spell check on blur or pause
  useEffect(() => {
    const timer = setTimeout(() => {
      if (value && value.length >= 3) {
        const result = correctQuery(value);
        if (result.hasCorrections) {
          setCorrection(result);
        } else {
          setCorrection(null);
        }
      } else {
        setCorrection(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [value]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(prev => Math.min(prev + 1, suggestions.length - 1));
      setShowSuggestions(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      if (selectedIdx >= 0 && suggestions[selectedIdx]) {
        applySuggestion(suggestions[selectedIdx]);
      } else if (onSubmit) {
        onSubmit();
      }
      setShowSuggestions(false);
    } else if (e.key === 'Tab' && suggestions.length > 0) {
      e.preventDefault();
      applySuggestion(suggestions[selectedIdx >= 0 ? selectedIdx : 0]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const applySuggestion = (suggestion) => {
    // Replace the last word with the suggestion
    const words = value.split(/\s+/);
    words[words.length - 1] = suggestion;
    onChange(words.join(' '));
    setShowSuggestions(false);
    setCorrection(null);
    inputRef.current?.focus();
  };

  const applyCorrection = () => {
    if (correction?.corrected) {
      onChange(correction.corrected);
      setCorrection(null);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-3 w-5 h-5 text-dark-400" />}
        <input
          ref={inputRef}
          type="text"
          className={`${className} ${Icon ? 'pl-10' : ''}`}
          placeholder={placeholder}
          value={value}
          onChange={e => { onChange(e.target.value); setShowSuggestions(true); }}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck="false"
        />
      </div>

      {/* Spell correction banner */}
      {correction && correction.hasCorrections && (
        <div className="mt-1.5 flex items-center gap-1 text-xs">
          <span className="text-dark-400">Did you mean:</span>
          <button
            onClick={applyCorrection}
            className="text-accent-green font-medium hover:underline"
          >
            {correction.corrected}
          </button>
          <span className="text-dark-500">?</span>
          <button onClick={() => setCorrection(null)} className="text-dark-500 hover:text-dark-300 ml-1">
            ✕
          </button>
        </div>
      )}

      {/* Autocomplete dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-dark-800 border border-dark-600 rounded-lg shadow-xl overflow-hidden">
          {suggestions.map((sug, i) => (
            <button
              key={sug}
              onMouseDown={() => applySuggestion(sug)}
              className={`w-full text-left px-3 py-2 text-sm transition-all ${
                i === selectedIdx
                  ? 'bg-accent-green/10 text-accent-green'
                  : 'text-dark-300 hover:bg-dark-700'
              }`}
            >
              {sug}
            </button>
          ))}
          <div className="px-3 py-1.5 text-xs text-dark-500 border-t border-dark-700">
            ↑↓ navigate · Tab/Enter to select
          </div>
        </div>
      )}
    </div>
  );
}
