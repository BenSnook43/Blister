import { X, Link as LinkIcon } from 'lucide-react';

export default function ShareModal({ isOpen, onClose, profileUrl }) {
  if (!isOpen) return null;
  if (!profileUrl) {
    onClose();
    return null;
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(profileUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">Share Profile</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-slate-600 mb-4">
          Share this profile with others! When they click the link, they'll be prompted to create an account to connect.
        </p>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={profileUrl}
            readOnly
            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-slate-50"
          />
          <button
            onClick={copyToClipboard}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center space-x-2"
          >
            <LinkIcon className="w-4 h-4" />
            <span>Copy</span>
          </button>
        </div>
      </div>
    </div>
  );
} 