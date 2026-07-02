import React, { useState } from 'react';
import { Plus, X, Upload } from 'lucide-react';
import { compressImage } from '../lib/imageUtils';

interface CreateAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (adData: {
    title: string;
    type: string;
    cropName?: string;
    price?: number;
    unitType?: string;
    description: string;
    status: string;
    images?: string[];
  }) => void;
  userRole: string;
}

export default function CreateAdModal({ isOpen, onClose, onSubmit, userRole }: CreateAdModalProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState(
    userRole === 'Farmer' ? 'Produce' : userRole === 'Transporter' ? 'Transport Request' : 'General Ad'
  );
  const [cropName, setCropName] = useState('');
  const [price, setPrice] = useState('');
  const [unitType, setUnitType] = useState('Tonne');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Open');
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    try {
      const newImages = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const compressedBase64 = await compressImage(file, 800, 800, 0.7);
        newImages.push(compressedBase64);
      }
      setImages(prev => [...prev, ...newImages].slice(0, 3)); // Max 3 images
    } catch (err) {
      console.error("Error compressing image", err);
      setError("Failed to compress image");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Title and Description are required.');
      return;
    }
    onSubmit({
      title,
      type,
      cropName: type === 'Produce' ? cropName : undefined,
      price: price ? parseFloat(price) : undefined,
      unitType: price ? unitType : undefined,
      description,
      status,
      images
    });
    // Reset state
    setTitle('');
    setCropName('');
    setPrice('');
    setDescription('');
    setStatus('Open');
    setImages([]);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div 
        id="create-ad-modal-container"
        className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden transform transition-all scale-100"
      >
        <div className="flex items-center justify-between bg-emerald-700 text-white px-6 py-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Plus size={20} /> Create SADC Classified Ad
          </h3>
          <button 
            id="close-ad-modal-btn"
            onClick={onClose} 
            className="hover:bg-emerald-800 p-1.5 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Ad Title
            </label>
            <input
              id="ad-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., 20 Tons of Grade-A White Maize"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Ad Classification Type
              </label>
              <select
                id="ad-type-select"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Produce">🌾 Produce Listing</option>
                <option value="Transport Request">🚚 Transport Capacity</option>
                <option value="General Ad">📦 General Trade Offer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Initial Status
              </label>
              <select
                id="ad-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Open">Open (Active)</option>
                <option value="Negotiating">Negotiating</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          {type === 'Produce' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Crop Name / Specialization
              </label>
              <input
                id="crop-name-input"
                type="text"
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
                placeholder="e.g., White Maize, Soybeans, Beans"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Price (USD)
              </label>
              <input
                id="price-input"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g., 350 (leave empty for custom bid)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Unit Metric
              </label>
              <select
                id="unit-type-select"
                disabled={!price}
                value={unitType}
                onChange={(e) => setUnitType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              >
                <option value="Tonne">Tonne (Metric)</option>
                <option value="Bag">90kg Bag</option>
                <option value="KG">Kilogram (kg)</option>
                <option value="Km">per Kilometer (km)</option>
                <option value="Fixed">Fixed Price</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Ad Description & Cargo Specifics
            </label>
            <textarea
              id="ad-desc-textarea"
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide exact quantity, origin town, logistics instructions, transit deadlines, or special handling rules..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Upload Images (Max 3)
            </label>
            <div className="flex gap-2 items-center flex-wrap">
              {images.map((img, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                  <img src={img} alt={`upload-${idx}`} className="object-cover w-full h-full" />
                  <button type="button" onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))} className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg p-0.5">
                    <X size={12} />
                  </button>
                </div>
              ))}
              {images.length < 3 && (
                <label className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                  <Upload size={20} className="text-slate-400" />
                  <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>

          <div className="mt-2 flex gap-3 justify-end">
            <button
              id="cancel-ad-modal-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-ad-modal-btn"
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors"
            >
              Post Classified Ad
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
