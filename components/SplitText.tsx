'use client';

import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

// Only register ScrollTrigger and useGSAP client-side
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string | ((t: number) => number);
  splitType?: 'chars' | 'words' | 'lines' | 'words, chars';
  from?: gsap.TweenVars;
  to?: gsap.TweenVars;
  threshold?: number;
  rootMargin?: string;
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
  textAlign?: React.CSSProperties['textAlign'];
  onLetterAnimationComplete?: () => void;
}

export const SplitText: React.FC<SplitTextProps> = ({
  text,
  className = '',
  delay = 50,
  duration = 1.25,
  ease = 'power3.out',
  splitType = 'chars',
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = '-100px',
  tag = 'p',
  textAlign = 'center',
  onLetterAnimationComplete
}) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const animationCompletedRef = useRef(false);
  const onCompleteRef = useRef(onLetterAnimationComplete);
  const [fontsLoaded, setFontsLoaded] = useState<boolean>(false);

  // Keep callback ref updated
  useEffect(() => {
    onCompleteRef.current = onLetterAnimationComplete;
  }, [onLetterAnimationComplete]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (document.fonts && document.fonts.status === 'loaded') {
        setFontsLoaded(true);
      } else if (document.fonts) {
        document.fonts.ready.then(() => {
          setFontsLoaded(true);
        }).catch(() => {
          setFontsLoaded(true);
        });
      } else {
        setFontsLoaded(true);
      }
    }
  }, []);

  useGSAP(
    () => {
      if (!ref.current || !text || !fontsLoaded) return;
      // Prevent re-animation if already completed
      if (animationCompletedRef.current) return;
      const el = ref.current;

      const startPct = (1 - threshold) * 100;
      const marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin);
      const marginValue = marginMatch ? parseFloat(marginMatch[1]) : 0;
      const marginUnit = marginMatch ? marginMatch[2] || 'px' : 'px';
      const sign =
        marginValue === 0
          ? ''
          : marginValue < 0
            ? `-=${Math.abs(marginValue)}${marginUnit}`
            : `+=${marginValue}${marginUnit}`;
      const start = `top ${startPct}%${sign}`;

      // Select manual target elements for animation
      const targets = el.querySelectorAll('.split-target');

      if (targets.length > 0) {
        gsap.fromTo(
          targets,
          { ...from },
          {
            ...to,
            duration,
            ease,
            stagger: delay / 1000,
            scrollTrigger: {
              trigger: el,
              start,
              once: true,
              fastScrollEnd: true,
              anticipatePin: 0.4
            },
            onComplete: () => {
              animationCompletedRef.current = true;
              onCompleteRef.current?.();
            },
            willChange: 'transform, opacity',
            force3D: true
          }
        );
      }

      return () => {
        ScrollTrigger.getAll().forEach(st => {
          if (st.trigger === el) st.kill();
        });
      };
    },
    {
      dependencies: [
        text,
        delay,
        duration,
        ease,
        splitType,
        JSON.stringify(from),
        JSON.stringify(to),
        threshold,
        rootMargin,
        fontsLoaded
      ],
      scope: ref
    }
  );

  const renderContent = () => {
    if (!text) return null;
    
    if (splitType === 'words') {
      return text.split(' ').map((word, wIdx) => {
        const isWealth = word.toLowerCase().includes('wealth');
        const highlightClass = isWealth
          ? "text-transparent bg-clip-text bg-gradient-to-r from-[#F5B400] via-[#FFD54A] to-amber-200"
          : "";
        return (
          <span key={wIdx} className={`split-word split-target inline-block mr-[0.25em] will-change-transform ${highlightClass}`}>
            {word}
          </span>
        );
      });
    }
    
    // Default splitting to chars
    return text.split(' ').map((word, wIdx) => {
      const isWealth = word.toLowerCase().includes('wealth');
      const highlightClass = isWealth
        ? "text-transparent bg-clip-text bg-gradient-to-r from-[#F5B400] via-[#FFD54A] to-amber-200"
        : "";
      return (
        <span key={wIdx} className="split-word inline-block mr-[0.25em] whitespace-nowrap">
          {word.split('').map((char, cIdx) => (
            <span key={cIdx} className={`split-char split-target inline-block will-change-transform ${highlightClass}`}>
              {char}
            </span>
          ))}
        </span>
      );
    });
  };

  const style: React.CSSProperties = {
    textAlign,
    wordWrap: 'break-word',
    willChange: 'transform, opacity'
  };
  const classes = `split-parent overflow-hidden inline-block whitespace-normal ${className}`;
  const Tag = (tag || 'p') as React.ElementType;

  return (
    <Tag ref={ref} style={style} className={classes}>
      {renderContent()}
    </Tag>
  );
};

export default SplitText;
