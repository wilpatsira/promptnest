import React, { useState } from 'react';
import { X, Save, Upload, User, Mail, Sparkles, Loader2, ShieldCheck, CalendarDays } from 'lucide-react';
import { User as UserType } from '../types';
import { updateProfile } from '../services/auth';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType;
  onUpdate: (user: UserType) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, currentUser, onUpdate }) => {
  const [formData, setFormData] = useState({
    displayName: currentUser.displayName,
    email: currentUser.email,
    photoUrl: currentUser.photoUrl,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const updatedUser = { ...currentUser, ...formData };
    
    try {
        const result = await updateProfile(updatedUser);
        
        if (result.success && result.user) {
            onUpdate(result.user);
            onClose();
        } else {
            setError(result.message || "Failed to update profile");
        }
    } catch (err) {
        setError("An error occurred while saving.");
    } finally {
        setIsLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const formatRedeemDate = (timestamp?: number) => {
    if (!timestamp) return 'Initial Launch';
    return new Date(timestamp).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-modal overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
            <h2 className="text-lg font-bold text-gray-900">Edit Profile</h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors">
                <X size={20} />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
            
            {/* Photo Upload */}
            <div className="flex flex-col items-center">
                <div className="relative group cursor-pointer">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-50 shadow-sm">
                        <img src={formData.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                    <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Upload className="text-white" size={24} />
                        <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                    </label>
                </div>
                <p className="text-xs text-gray-400 mt-2">Click image to update</p>
            </div>

            <div className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Display Name</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <Sparkles size={16} />
                        </div>
                        <input
                            type="text"
                            value={formData.displayName}
                            onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                            className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all"
                            placeholder="Your Name"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">License Key</label>
                    <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-orange-500">
                            <ShieldCheck size={16} />
                        </div>
                        <input
                            type="text"
                            value={currentUser.licenseCode}
                            disabled
                            className="w-full pl-9 pr-3 py-2.5 bg-orange-50/50 border border-orange-100 rounded-xl text-sm text-orange-800 font-mono font-bold cursor-not-allowed"
                        />
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 ml-1">
                        <CalendarDays size={10} className="text-gray-400" />
                        <p className="text-[10px] text-gray-400 font-medium">Activated on: {formatRedeemDate(currentUser.redeemedAt)}</p>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">App ID / Username</label>
                    <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <User size={16} />
                        </div>
                        <input
                            type="text"
                            value={currentUser.username}
                            disabled
                            className="w-full pl-9 pr-3 py-2.5 bg-gray-100 border border-transparent rounded-xl text-sm text-gray-500 cursor-not-allowed"
                        />
                    </div>
                </div>
            </div>

            {error && (
                <div className="text-xs text-red-500 text-center font-medium bg-red-50 p-2 rounded-lg">
                    {error}
                </div>
            )}

            <div className="pt-2">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-70 disabled:hover:scale-100"
                >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {isLoading ? "Saving..." : "Save Changes"}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;