import { useEffect, useRef, useState, type CSSProperties, type ElementType } from "react";

/**
 * Headline whose words flip up out of depth one after another, driven by the parent
 * chapter's --vis (scroll/film position), and blow past the camera on exit (--out).
 * Wrap emphasised words in *asterisks*.
 */
export const Kinetic = ({ text, as: Tag = "h2", className = "" }: { text: string; as?: ElementType; className?: string }) => {
  let i = 0;
  const parts = text.split(/(\*[^*]+\*)/g).filter(Boolean);
  return (
    <Tag className={`kinetic ${className}`} aria-label={text.replace(/\*/g, "")}>
      {parts.map((part, pi) => {
        const em = part.startsWith("*");
        const words = part.replace(/\*/g, "").split(/(\s+)/);
        const spans = words.map((w, wi) =>
          /\s+/.test(w) ? (
            " "
          ) : (
            <span key={wi} className="kinetic__w" aria-hidden="true" style={{ "--i": i++ } as CSSProperties}>
              <span className="kinetic__in">{w}</span>
            </span>
          ),
        );
        return em ? <em key={pi}>{spans}</em> : <span key={pi}>{spans}</span>;
      })}
    </Tag>
  );
};

/** Number that counts up the first time it scrolls into view. */
export const Count = ({ to, decimals = 0, suffix = "", prefix = "" }: { to: number; decimals?: number; suffix?: string; prefix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current!;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const step = (now: number) => {
        // rAF timestamps can predate `start`; never let progress go negative
        const k = Math.min(1, Math.max(0, (now - start) / 1600));
        setV(to * (1 - Math.pow(2, -10 * k)));
        if (k < 1) raf = requestAnimationFrame(step);
        else setV(to);
      };
      raf = requestAnimationFrame(step);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);
  return (
    <span ref={ref} aria-label={`${prefix}${to.toLocaleString("en", { minimumFractionDigits: decimals })}${suffix}`}>
      {prefix}
      {v.toLocaleString("en", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
};
