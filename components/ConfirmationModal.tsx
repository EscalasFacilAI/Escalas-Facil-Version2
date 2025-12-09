
import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

export const ConfirmationModal: React.FC<Props> = ({ 
    isOpen, onClose, onConfirm, title, message, 
    confirmText = "Confirmar", cancelText = "Cancelar", isDangerous = false 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className={`p-4 border-b flex items-center gap-3 ${isDangerous ? 'bg-red-50' : 'bg-slate-50'}`}>
           <div className={`p-2 rounded-full ${isDangerous ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
           </div>
           <h3 className={`font-bold text-lg ${isDangerous ? 'text-red-900' : 'text-slate-800'}`}>
               {title}
           </h3>
        </div>
        
        <div className="p-6">
            <p className="text-slate-600 text-sm leading-relaxed font-medium">
                {message}
            </p>
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 bg-white border border-slate-300 rounded text-slate-700 text-sm font-bold hover:bg-slate-100 transition-colors"
            >
                {cancelText}
            </button>
            <button 
                onClick={() => { onConfirm(); onClose(); }}
                className={`px-4 py-2 rounded text-white text-sm font-bold shadow transition-colors ${isDangerous ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
                {confirmText}
            </button>
        </div>
      </div>
    </div>
  );
};
