import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const CustomLanguageSwitcher = () => {
    const { i18n } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const languages = [
        { code: 'en', name: 'English', flag: 'GB' },
        { code: 'fr', name: 'French', flag: 'FR' },
        { code: 'es', name: 'Spanish', flag: 'ES' },
        { code: 'de', name: 'German', flag: 'DE' },
        { code: 'zh', name: 'Chinese', flag: 'CN' },
        { code: 'hi', name: 'Hindi', flag: 'IN' },
        { code: 'tl', name: 'Tagalog', flag: 'PH' },
    ];

    const filteredLanguages = languages.filter(lang =>
        lang.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  
    const handleLanguageChange = (code) => {
        i18n.changeLanguage(code);
        setSearchQuery('');
        setIsDropdownOpen(false);
    };

    

    return (
        <div className='relative'>
            <input
                type='text'
                placeholder='Language'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 100)} // Delay to allow click on dropdown
                className='border border-gray-300 rounded px-3 py-2 mb-2 w-full focus:outline-none focus:ring-2 focus:ring-primary'
            />
            {isDropdownOpen && (
                <div className='absolute z-10 w-full bg-white border border-gray-300 rounded shadow-lg'>
                    <ul className='max-h-60 overflow-y-auto'>
                        {filteredLanguages.map((lang) => (
                            <li
                                key={lang.code}
                                onClick={() => handleLanguageChange(lang.code)}
                                className='flex items-center px-3 py-2 cursor-pointer hover:bg-gray-100'
                            >
                                <span className={`flag-icon flag-icon-${lang.flag.toLowerCase()} mr-2`}></span>
                                {lang.name}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default CustomLanguageSwitcher;
