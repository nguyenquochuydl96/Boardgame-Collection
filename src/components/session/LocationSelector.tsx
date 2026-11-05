import React, { useState } from 'react';
import { MapPin, Plus, Check, Trash2, Building2 } from 'lucide-react';
import { useLocationStore } from '../../store/useLocationStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { cn } from '../ui/cn';

export interface LocationSelectorProps {
  selectedLocation: string;
  onSelectLocation: (locationName: string) => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  selectedLocation,
  onSelectLocation,
}) => {
  const locations = useLocationStore((s) => s.locations);
  const addLocation = useLocationStore((s) => s.addLocation);
  const deleteLocation = useLocationStore((s) => s.deleteLocation);

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocAddress, setNewLocAddress] = useState('');

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim()) return;
    const created = addLocation(newLocName, newLocAddress);
    onSelectLocation(created.name);
    setNewLocName('');
    setNewLocAddress('');
    setIsAddingNew(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          Địa Điểm Chơi (Chọn từ danh sách)
        </label>
        {!isAddingNew && (
          <button
            type="button"
            onClick={() => setIsAddingNew(true)}
            className="text-xs text-[var(--accent-neon)] hover:underline font-bold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            Thêm địa điểm mới
          </button>
        )}
      </div>

      {/* Preset Location Chips */}
      <div className="flex flex-wrap gap-2">
        {locations.map((loc) => {
          const isSelected = selectedLocation === loc.name;
          return (
            <button
              key={loc.id}
              type="button"
              onClick={() => onSelectLocation(loc.name)}
              className={cn(
                'group relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border select-none',
                isSelected
                  ? 'bg-[var(--accent-glow)] border-[var(--border-glow)] text-[var(--text-primary)] shadow-md ring-1 ring-[var(--accent-primary)]'
                  : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-white/20'
              )}
            >
              <Building2 className={cn('w-3.5 h-3.5', isSelected ? 'text-[var(--accent-neon)]' : 'opacity-60')} />
              <span>{loc.name}</span>
              {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent-neon)] stroke-[3]" />}
            </button>
          );
        })}
      </div>

      {/* Inline Add New Location Form */}
      {isAddingNew && (
        <form
          onSubmit={handleAddNew}
          className="p-3.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-glow)] space-y-2.5 animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
            <span>Thêm địa điểm mới vào danh sách cố định:</span>
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Hủy
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              placeholder="Tên địa điểm (vd: Nhà Tuấn, Trà Sữa Gong Cha)..."
              value={newLocName}
              onChange={(e) => setNewLocName(e.target.value)}
              className="text-xs"
              autoFocus
            />
            <Input
              placeholder="Địa chỉ / Quận (tùy chọn)..."
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
              Đóng
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              disabled={!newLocName.trim()}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Lưu Địa Điểm
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
