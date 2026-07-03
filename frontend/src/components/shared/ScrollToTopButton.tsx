import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

interface ScrollToTopButtonProps {
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  position: { left?: string; right?: string };
}

const ScrollToTopButton: React.FC<ScrollToTopButtonProps> = ({
  scrollContainerRef,
  position,
}) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
      setShow(el.scrollTop > 200);
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [scrollContainerRef]);

  const handleScrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!show) return null;

  return (
    <button
      onClick={handleScrollToTop}
      className="fixed bottom-6 z-50 p-2.5 bg-gray-200/30 dark:bg-slate-800/40 hover:bg-gray-300/90 dark:hover:bg-slate-700 text-gray-700/40 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 rounded-full shadow-none hover:shadow-md transition-all border border-gray-300/30 dark:border-slate-700/30 hover:border-gray-400 cursor-pointer"
      style={position}
      title="맨 위로 스크롤"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
};

export default ScrollToTopButton;
