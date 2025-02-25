import React from 'react';
import { useTranslation } from 'react-i18next';

const MiniLanguageSwitcher = () => {
    const { i18n } = useTranslation();

    const handleLanguageChange = (event) => {
        i18n.changeLanguage(event.target.value);
    };

    return (
        <select
            onChange={handleLanguageChange}
            className='border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary'
        >
            <option value='en'>English</option>
            <option value='fr'>French</option>
            <option value='es'>Spanish</option>
            <option value='de'>German</option>
            <option value='zh'>Chinese</option>
            <option value='hi'>Hindi</option>
            <option value='tl'>Tagalog</option>
        </select>
    );
};

export default MiniLanguageSwitcher;
