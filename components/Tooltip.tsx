
import React from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  return (
    <div className="group relative flex items-center justify-center h-fit w-fit">
      {children}
      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 hidden group-hover:block w-auto whitespace-nowrap z-[100] pointer-events-none">
        <div className="bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-lg uppercase tracking-wide">
             {content}
        </div>
      </div>
    </div>
  );
};
