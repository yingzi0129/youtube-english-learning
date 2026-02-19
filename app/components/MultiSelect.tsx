'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface MultiSelectProps {
  label: string;
  icon: React.ReactNode;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export default function MultiSelect({
  label,
  icon,
  options,
  selectedValues,
  onChange,
  placeholder = '请选择',
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 240,
  });

  // Keep the portal dropdown anchored to the trigger button.
  // Note: `position: fixed` uses viewport coordinates, so do NOT add scroll offsets.
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (!buttonRef.current) return;

      const rect = buttonRef.current.getBoundingClientRect();
      const margin = 8;
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      const targetWidth = rect.width;

      // Clamp horizontally so it doesn't go off-screen.
      const left = Math.max(margin, Math.min(rect.left, viewportW - targetWidth - margin));

      const preferredMaxHeight = 240; // Tailwind `max-h-60`
      const spaceBelow = viewportH - rect.bottom - margin;
      const spaceAbove = rect.top - margin;

      // If there's not enough room below, open upwards.
      const openUpwards = spaceBelow < 160 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(
        120,
        Math.min(preferredMaxHeight, openUpwards ? spaceAbove : spaceBelow)
      );

      // Use current dropdown height (when available) to place it snugly when opening upwards.
      const dropdownHeight = dropdownRef.current?.offsetHeight ?? Math.min(preferredMaxHeight, maxHeight);
      const top = openUpwards
        ? Math.max(margin, rect.top - margin - Math.min(dropdownHeight, maxHeight))
        : rect.bottom + margin;

      setDropdownPosition({ top, left, width: targetWidth, maxHeight });
    };

    updatePosition();
    const raf = window.requestAnimationFrame(updatePosition);

    window.addEventListener('resize', updatePosition);
    // Capture scroll events from any scroll container.
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter((v) => v !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  const displayText = selectedValues.length === 0
    ? placeholder
    : selectedValues.length === 1
    ? selectedValues[0]
    : `已选择 ${selectedValues.length} 项`;

  return (
    <div className="relative z-50">
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
        {icon}
        {label}
      </label>

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 text-sm font-medium border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white hover:border-purple-300 transition-all cursor-pointer text-left flex items-center justify-between"
      >
        <span className={selectedValues.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
          {displayText}
        </span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {selectedValues.length > 0 && (
        <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-lg z-10">
          {selectedValues.length}
        </span>
      )}

      {isOpen && typeof window !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="fixed bg-white border-2 border-purple-200 rounded-xl shadow-xl max-h-60 overflow-y-auto"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            maxHeight: `${dropdownPosition.maxHeight}px`,
            zIndex: 100000,
          }}
        >
          {options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              暂无选项
            </div>
          ) : (
            options.map((option) => (
              <label
                key={option}
                className="flex items-center gap-3 px-4 py-3 hover:bg-purple-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={() => toggleOption(option)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-900">{option}</span>
              </label>
            ))
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
