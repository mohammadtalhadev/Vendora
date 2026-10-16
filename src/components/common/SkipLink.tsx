import React from 'react';

/**
 * First focusable element of every shell. Visually hidden until
 * focused (see .skip-link in base.css); jumps keyboard and screen-reader
 * users past the navigation straight to the shell's <main id="main-content">.
 */
export const SkipLink: React.FC = () => (
  <a href="#main-content" className="skip-link">
    Skip to main content
  </a>
);
