import { useState, useRef, useEffect } from 'react';

export default function SearchableDropdown({
  options = [],
  value,
  onChange,
  placeholder = 'Search...',
  displayKey = 'label',
  valueKey = 'value',
  showAddNew = false,
  onAddNewClick,
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Find selected option label
  const selectedOption = options.find(o => o[valueKey] === value);
  const displayValue = selectedOption ? selectedOption[displayKey] : '';

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o =>
    o[displayKey].toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (option) => {
    onChange(option[valueKey], option);
    setIsOpen(false);
    setSearch('');
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setSearch('');
  };

  const handleInputChange = (e) => {
    setSearch(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  return (
    <div className="relative" ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-sm pr-8"
        placeholder={placeholder}
        value={isOpen ? search : displayValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        disabled={disabled}
      />
      {/* Chevron icon */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg className={`w-4 h-4 text-gray-400 dark:text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Clear button */}
      {value && !isOpen && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange('', null); }}
          className="absolute inset-y-0 right-6 flex items-center text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-lg max-h-60 overflow-y-auto animate-fade-in">
          {filteredOptions.length === 0 && !showAddNew && (
            <div className="px-4 py-2.5 text-sm text-gray-400 dark:text-slate-500">No results found</div>
          )}

          {filteredOptions.map((option, idx) => (
            <button
              key={option[valueKey] || idx}
              type="button"
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-green-50 dark:hover:bg-slate-700 hover:text-green-700 dark:hover:text-green-400 cursor-pointer transition-colors duration-150 ${
                option[valueKey] === value ? 'bg-green-50 dark:bg-slate-700 text-green-700 dark:text-green-400 font-medium' : 'text-gray-700 dark:text-slate-300'
              }`}
              onClick={() => handleSelect(option)}
            >
              {option[displayKey]}
              {option.subtitle && (
                <span className="block text-xs text-gray-400 dark:text-slate-500">{option.subtitle}</span>
              )}
            </button>
          ))}

          {showAddNew && (
            <button
              type="button"
              className="w-full text-left px-4 py-2.5 text-sm text-green-700 dark:text-green-400 font-medium
                hover:bg-green-50 dark:hover:bg-slate-700 border-t border-gray-100 dark:border-slate-700 transition-colors duration-150
                flex items-center gap-2"
              onClick={() => { onAddNewClick?.(); setIsOpen(false); setSearch(''); }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add New
            </button>
          )}
        </div>
      )}
    </div>
  );
}
