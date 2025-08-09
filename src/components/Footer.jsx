import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";

const Footer = () => {
  return (
    <footer className="bg-[#090a0a] border-t border-white/10 py-6 px-8 mt-12">
      <div className="mx-auto text-center text-neutral-200">
        
        {/* Main credit line */}
        <span className="flex items-center justify-center flex-wrap gap-1">
          Made with
          <span
            className="text-red-500 animate-pulse"
            role="img"
            aria-label="heart"
          >
            ❤️
          </span>
          by
          <a
            href="https://github.com/Sandipeyy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-sm hover:text-white hover:bg-white/20 transition-colors"
          >
            <FontAwesomeIcon icon={faGithub} className="w-5 h-5" />
            Sandipeyy
          </a>
        </span>

        {/* Open Source link */}
        <span className="text-sm block mt-2 text-neutral-400">
          NepoFlix is{" "}
          <a
            href="/opensource"
            className="underline hover:text-neutral-200 transition-colors"
          >
            open source
          </a>
        </span>
      </div>
    </footer>
  );
};

export default Footer;
