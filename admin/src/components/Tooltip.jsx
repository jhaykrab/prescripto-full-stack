import React from 'react';

const Tooltip = ({ text, children }) => {
    return (
        <div className="relative flex items-center group">
            {children}
            <span className="absolute bottom-full mb-2 w-max bg-gray-700 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {text}
            </span>
        </div>
    );
};

export default Tooltip;
