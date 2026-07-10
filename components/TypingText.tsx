'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';

// Inline cn utility (avoids needing @/lib/utils)
function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

interface TypingTextProps {
  text: string;
  delay?: number;
  repeat?: boolean;
  cursor?: ReactNode;
  className?: string;
  grow?: boolean;
  alwaysVisibleCount?: number;
  smooth?: boolean;
  waitTime?: number;
  onComplete?: () => void;
  hideCursorOnComplete?: boolean;
}

function Blinker() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => {
      setShow((prev) => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);
  return <span className={show ? '' : 'opacity-0'}>|</span>;
}

function SmoothEffect({
  words,
  index,
  alwaysVisibleCount,
}: {
  words: string[];
  index: number;
  alwaysVisibleCount: number;
}) {
  return (
    <div className="flex flex-wrap whitespace-pre">
      {words.map((word, wordIndex) => (
        <span
          key={wordIndex}
          className={cn(
            'transition-opacity duration-300 ease-in-out',
            wordIndex < index ? 'opacity-100' : undefined,
            wordIndex >= index + alwaysVisibleCount ? 'opacity-0' : undefined,
          )}
        >
          {word}
          {wordIndex < words.length && <span>&nbsp;</span>}
        </span>
      ))}
    </div>
  );
}

function NormalEffect({
  text,
  index,
  alwaysVisibleCount,
}: {
  text: string;
  index: number;
  alwaysVisibleCount: number;
}) {
  return <>{text.slice(0, Math.max(index, Math.min(text.length, alwaysVisibleCount ?? 1)))}</>;
}

enum TypingDirection {
  Forward = 1,
  Backward = -1,
}

function CursorWrapper({
  visible,
  children,
  waiting,
}: {
  visible?: boolean;
  waiting?: boolean;
  children: ReactNode;
}) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => {
      setOn((prev) => !prev);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  if (!visible || (!on && !waiting)) {
    return null;
  }

  return <>{children}</>;
}

function Type({
  text,
  repeat,
  cursor,
  delay,
  grow,
  className,
  alwaysVisibleCount,
  smooth,
  waitTime = 1000,
  onComplete,
  hideCursorOnComplete,
}: TypingTextProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<TypingDirection>(TypingDirection.Forward);
  const [isComplete, setIsComplete] = useState(false);

  const words = useMemo(() => text.split(/\s+/), [text]);
  const total = smooth ? words.length : text.length;

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const startTyping = () => {
      setIndex((prevIdx) => {
        if (direction === TypingDirection.Backward && prevIdx === TypingDirection.Forward) {
          clearInterval(interval);
        } else if (direction === TypingDirection.Forward && prevIdx === total - 1) {
          clearInterval(interval);
        }
        return prevIdx + direction;
      });
    };

    interval = setInterval(startTyping, delay);
    return () => clearInterval(interval);
  }, [total, direction, delay]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (index >= total && repeat) {
      timeout = setTimeout(() => { setDirection(-1); }, waitTime);
    }
    if (index <= 0 && repeat) {
      timeout = setTimeout(() => { setDirection(1); }, waitTime);
    }
    return () => clearTimeout(timeout);
  }, [index, total, repeat, waitTime]);

  useEffect(() => {
    if (index === total && !repeat) {
      setIsComplete(true);
      onComplete?.();
    }
  }, [index, total, repeat, onComplete]);

  const waitingNextCycle = index === total || index === 0;

  return (
    <div className={cn('relative', className)}>
      {!grow && <div className="invisible">{text}</div>}
      <div
        className={cn(
          !grow ? 'absolute inset-0 h-full w-full' : undefined,
        )}
      >
        {smooth ? (
          <SmoothEffect words={words} index={index} alwaysVisibleCount={alwaysVisibleCount ?? 1} />
        ) : (
          <NormalEffect text={text} index={index} alwaysVisibleCount={alwaysVisibleCount ?? 1} />
        )}
        <CursorWrapper
          waiting={waitingNextCycle}
          visible={Boolean(!smooth && cursor && (!hideCursorOnComplete || !isComplete))}
        >
          {cursor}
        </CursorWrapper>
      </div>
    </div>
  );
}

export default function TypingText({
  text,
  repeat = true,
  cursor = <Blinker />,
  delay = 32,
  className,
  grow = true,
  alwaysVisibleCount = 1,
  smooth = false,
  waitTime,
  onComplete,
  hideCursorOnComplete = true,
}: TypingTextProps) {
  return (
    <Type
      key={text}
      delay={delay ?? 32}
      waitTime={waitTime ?? 1000}
      grow={grow}
      repeat={repeat}
      text={text}
      cursor={cursor}
      className={className}
      smooth={smooth}
      alwaysVisibleCount={alwaysVisibleCount}
      onComplete={onComplete}
      hideCursorOnComplete={hideCursorOnComplete}
    />
  );
}
