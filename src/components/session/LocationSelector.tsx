import React, { useState, useMemo, useEffect, useRef, memo } from 'react';
import {
  MapPin,
  Plus,
  Check,
  Building2,
  Search,
  ChevronDown,
  X,
  Star,
  Sparkles,
} from 'lucide-react';
import { useLocationStore } from '../../store/useLocationStore';
import { useSessionStore } from '../../store/useSessionStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { cn } from '../ui/cn';

export interface LocationSelectorProps {
  selectedLocation: string;
  onSelectLocation: (locationName: string) => void;
  label?: string;
  placeholder?: string;
}

export const LocationSelectorComponent: React.FC<LocationSelectorProps> = ({
  selectedLocation,
  onSelectLocation,
  label = 'Gaming Venue',
  placeholder = 'Select old venue or type new location (e.g. Lafam)...',
}) => {
  const locations = useLocationStore((s) => s.locations);
  const addLocation = useLocationStore((s) => s.addLocation);
  const syncHistoricalLocations = useLocationStore((s) => s.syncHistoricalLocations);
  const sessions = useSessionStore((s) => s.sessions);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocAddress, setNewLocAddress] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Automatically sync historical locations from sessions if preset store is empty
  useEffect(() => {
    if (sessions.length > 0 && locations.length === 0) {
      syncHistoricalLocations(sessions);
    }
  }, [sessions, locations.length, syncHistoricalLocations]);

  // Aggregate all locations from presets AND actual session history
  const allVenues = useMemo(() => {
    // 1. Calculate play count for every venue in sessions
    const playCounts = new Map<string, number>();
    for (const s of sessions) {
      if (s.location && s.location.trim()) {
        const key = s.location.trim();
        playCounts.set(key, (playCounts.get(key) || 0) + 1);
      }
    }

    // 2. Map existing preset locations
    const map = new Map<
      string,
      { id: string; name: string; address?: string; isDefault: boolean; playCount: number }
    >();

    for (const loc of locations) {
      const trimmed = loc.name.trim();
      const count = playCounts.get(trimmed) || 0;
      map.set(trimmed.toLowerCase(), {
        id: loc.id,
        name: trimmed,
        address: loc.address,
        isDefault: Boolean(loc.isDefault),
        playCount: count,
      });
    }

    // 3. Include any distinct historical venue from sessions not yet in presets
    for (const [sLoc, count] of playCounts.entries()) {
      const key = sLoc.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          id: `hist-${sLoc}`,
          name: sLoc,
          isDefault: false,
          playCount: count,
        });
      }
    }

    // 4. Sort: default venue first, then by play count descending, then alphabetically
    return Array.from(map.values()).sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return b.playCount - a.playCount || a.name.localeCompare(b.name);
    });
  }, [locations, sessions]);

  // If no location is selected and we have venues, auto-select the default or most played venue
  useEffect(() => {
    if (!selectedLocation && allVenues.length > 0) {
      const defaultVenue = allVenues.find((v) => v.isDefault) || allVenues[0];
      if (defaultVenue) {
        onSelectLocation(defaultVenue.name);
      }
    }
  }, [selectedLocation, allVenues, onSelectLocation]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Filter venues based on user search query
  const filteredVenues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allVenues;
    return allVenues.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (v.address && v.address.toLowerCase().includes(q))
    );
  }, [allVenues, searchQuery]);

  // Select a venue
  const handleSelectVenue = (venueName: string) => {
    onSelectLocation(venueName);
    setSearchQuery('');
    setIsOpen(false);
  };

  // Add a new venue preset
  const handleAddNewPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim()) return;
    const created = addLocation(newLocName, newLocAddress);
    onSelectLocation(created.name);
    setNewLocName('');
    setNewLocAddress('');
    setIsAddingNew(false);
  };

  // Quick chips: top 5 most used venues
  const quickPills = useMemo(() => {
    return allVenues.slice(0, 6);
  }, [allVenues]);

  return (
    <div className="space-y-3" ref={containerRef}>
      {/* Label and Actions */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span>{label}</span>
          {allVenues.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[10px] font-mono text-[var(--text-muted)] font-normal">
              {allVenues.length} available
            </span>
          )}
        </label>

        {!isAddingNew && (
          <button
            type="button"
            onClick={() => {
              setNewLocName(searchQuery || '');
              setIsAddingNew(true);
            }}
            className="text-xs text-[var(--accent-neon)] hover:underline font-bold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create new venue</span>
          </button>
        )}
      </div>

      {/* Main Searchable Input & Dropdown Selector */}
      <div className="relative">
        <div
          onClick={() => {
            setIsOpen(true);
            inputRef.current?.focus();
          }}
          className={cn(
            'flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface)] border transition-all cursor-text shadow-sm',
            isOpen
              ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/20'
              : 'border-[var(--border-subtle)] hover:border-white/30'
          )}
        >
          <Building2 className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />

          <input
            ref={inputRef}
            type="text"
            value={isOpen ? searchQuery : selectedLocation}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              setIsOpen(true);
              setSearchQuery('');
            }}
            placeholder={placeholder}
            className="w-full bg-transparent text-sm font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
          />

          {/* Quick Clear Button */}
          {selectedLocation && !isOpen && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectLocation('');
                setSearchQuery('');
                setIsOpen(true);
              }}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              title="Clear location"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Dropdown Toggle Chevron */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen((prev) => !prev);
            }}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', isOpen && 'rotate-180')} />
          </button>
        </div>

        {/* Dropdown Menu of Existing Venues */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 z-50 max-h-64 overflow-y-auto rounded-2xl bg-[var(--card)] border border-[var(--border-glow)] shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
            {filteredVenues.length > 0 ? (
              filteredVenues.map((v) => {
                const isSelected =
                  selectedLocation.trim().toLowerCase() === v.name.trim().toLowerCase();
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleSelectVenue(v.name)}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer text-xs font-semibold select-none',
                      isSelected
                        ? 'bg-[var(--accent-glow)] text-[var(--text-primary)] font-bold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--card-2)] hover:text-[var(--text-primary)]'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                        {v.isDefault ? (
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 text-[var(--accent-neon)]" />
                        )}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--text-primary)] truncate text-sm">
                            {v.name}
                          </span>
                          {v.isDefault && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 text-[10px] font-bold border border-amber-500/30">
                              Default
                            </span>
                          )}
                        </div>
                        {v.address && (
                          <p className="text-[11px] text-[var(--text-muted)] truncate">
                            {v.address}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {v.playCount > 0 && (
                        <span className="font-mono text-[11px] text-[var(--text-muted)] tabular-nums px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                          {v.playCount} {v.playCount === 1 ? 'play' : 'plays'}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-4 h-4 text-[var(--accent-neon)] stroke-[3]" />
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-[var(--text-muted)]">
                No matching saved venue found for "{searchQuery}".
              </div>
            )}

            {/* Option to use newly typed custom query if not already in list */}
            {searchQuery.trim() &&
              !allVenues.some((v) => v.name.toLowerCase() === searchQuery.trim().toLowerCase()) && (
                <button
                  type="button"
                  onClick={() => handleSelectVenue(searchQuery.trim())}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left bg-[var(--accent-soft)] hover:bg-[var(--accent-soft)]/80 text-[var(--accent-text)] text-xs font-bold transition-colors cursor-pointer border border-[var(--border-glow)]"
                >
                  <Plus className="w-4 h-4 text-[var(--accent-neon)]" />
                  <span>Use custom venue: "{searchQuery.trim()}"</span>
                </button>
              )}
          </div>
        )}
      </div>

      {/* Quick 1-Tap Pills for Top / Most Used Venues */}
      {quickPills.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-[var(--text-muted)]">
            Quick Pick (Most Played &amp; Saved):
          </span>
          <div className="flex flex-wrap gap-2">
            {quickPills.map((v) => {
              const isSelected =
                selectedLocation.trim().toLowerCase() === v.name.trim().toLowerCase();
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onSelectLocation(v.name)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border select-none active:scale-95',
                    isSelected
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)] shadow-sm'
                      : 'bg-[var(--card)] border-[var(--line)] text-[var(--ink-2)] hover:border-[var(--line-2)] hover:bg-[var(--card-2)]'
                  )}
                >
                  <MapPin className="w-3 h-3" />
                  <span>{v.name}</span>
                  {v.playCount > 0 && (
                    <span
                      className={cn(
                        'text-[10px] tabular-nums font-mono px-1 rounded',
                        isSelected ? 'bg-black/20 text-white' : 'text-[var(--muted)]'
                      )}
                    >
                      {v.playCount}
                    </span>
                  )}
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Expandable Form: Add New Venue with Full Details */}
      {isAddingNew && (
        <form
          onSubmit={handleAddNewPreset}
          className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--border-glow)] space-y-3 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Save new venue to permanent presets:
            </span>
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Input
              placeholder="Venue name (e.g. Board Game Station, Huy's House)..."
              value={newLocName}
              onChange={(e) => setNewLocName(e.target.value)}
              className="text-xs"
              autoFocus
            />
            <Input
              placeholder="Address / Area (optional)..."
              value={newLocAddress}
              onChange={(e) => setNewLocAddress(e.target.value)}
              className="text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setIsAddingNew(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              disabled={!newLocName.trim()}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Save Venue
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export const LocationSelector = memo(LocationSelectorComponent);
export default LocationSelector;
