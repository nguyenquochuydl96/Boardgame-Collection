import React, { useState, useEffect } from 'react';
import { MapPin, Sparkles, Building2, FileText, Star } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { GameLocation } from '../../types';
import { useLocationStore } from '../../store/useLocationStore';

export interface LocationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  location?: GameLocation | null;
}

export const LocationFormModal: React.FC<LocationFormModalProps> = ({
  isOpen,
  onClose,
  location,
}) => {
  const addLocation = useLocationStore((s) => s.addLocation);
  const updateLocation = useLocationStore((s) => s.updateLocation);
  const locations = useLocationStore((s) => s.locations);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (location) {
      setName(location.name || '');
      setAddress(location.address || '');
      setNotes(location.notes || '');
      setIsDefault(Boolean(location.isDefault));
      setError('');
    } else {
      setName('');
      setAddress('');
      setNotes('');
      setIsDefault(locations.length === 0);
      setError('');
    }
  }, [location, isOpen, locations.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter a venue name');
      return;
    }

    // Check duplicate name
    const isDuplicate = locations.some(
      (l) =>
        l.id !== location?.id &&
        l.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setError('This venue name already exists');
      return;
    }

    if (location) {
      updateLocation(location.id, {
        name: trimmedName,
        address: address.trim(),
        notes: notes.trim(),
        isDefault,
      });
    } else {
      addLocation(trimmedName, address.trim(), notes.trim(), isDefault);
    }

    onClose();
  };

  const isEdit = Boolean(location);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Gaming Venue' : 'Add New Venue'}
      maxWidthClass="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300 font-medium animate-in fade-in">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[var(--accent-neon)]" />
            Venue Name <span className="text-rose-400">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            placeholder="e.g. Huy's Apartment, The Board Game Loft..."
            autoFocus
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            Address / Area (Optional)
          </label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. District 3, Ho Chi Minh City..."
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            Notes & Amenities (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Large 8-player table, AC, cozy lighting, open late..."
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all resize-none"
          />
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] cursor-pointer hover:border-[var(--border-glow)] transition-colors select-none">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded text-[var(--accent-primary)] border-[var(--border-subtle)] focus:ring-[var(--accent-primary)] cursor-pointer"
            />
            <div className="flex-1">
              <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                Set as default venue
              </span>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Automatically selects this venue when starting a new session
              </p>
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-2.5 pt-4 border-t border-[var(--border-subtle)]">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            <Sparkles className="w-4 h-4 mr-1.5" />
            {isEdit ? 'Update Venue' : 'Save Venue'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
