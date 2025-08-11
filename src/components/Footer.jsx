import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';

const Footer = () => {
  return (
    <footer className="bg-[#090a0a] border-t border-white/10 py-6 px-8 mt-12">
      <div className="mx-auto text-center text-neutral-200">
        <span>Made with <span className='text-red-500 mr-[0.05rem] animate-pulse'>❤️</span> by
          <a href='https://github.com/Chaste-Djaziri' target='_blank' className='bg-white/10 ml-1.5 p-1 rounded-sm hover:text-white hover:bg-white/20 transition cursor-pointer'>
            <FontAwesomeIcon icon={faGithub} className="w-5 h-5 mr-0.5" />
            Chaste Djaziri
          </a>
        </span><br/>
        <span className='text-sm block mt-1.5 text-neutral-400'>NepoFlix is <a href='/opensource' className='underline'>open source</a></span>
      </div>
    </footer>
  );
};

export default Footer;
