import { useState, useEffect, useRef } from 'react';

/**
 * CountUpAnimation Component
 * 
 * High-performance number animation that creates a "dopamine-inducing"
 * counting effect. Uses requestAnimationFrame for smooth 60fps animation.
 * 
 * Features:
 * - easeOutQuart easing for premium feel (starts fast, slows gracefully)
 * - Smooth interpolation between values
 * - Configurable duration and formatting
 * 
 * @param {number} from - Starting value (default: 0)
 * @param {number} to - Target value (required)
 * @param {number} duration - Animation duration in ms (default: 1000)
 * @param {string} suffix - Text to append after number (e.g., " XP")
 * @param {string} prefix - Text to prepend before number (e.g., "$")
 * @param {number} decimals - Number of decimal places (default: 0)
 * @param {string} className - CSS class name for styling
 * @param {function} onComplete - Callback when animation completes
 */
const CountUpAnimation = ({
    from = 0,
    to,
    duration = 1000,
    suffix = '',
    prefix = '',
    decimals = 0,
    className = '',
    onComplete
}) => {
    const [displayValue, setDisplayValue] = useState(from);
    const animationRef = useRef(null);
    const startTimeRef = useRef(null);
    const previousToRef = useRef(to);

    /**
     * easeOutQuart - Premium easing function
     * Creates a natural deceleration effect (fast start, smooth end)
     * 
     * Formula: 1 - (1 - t)^4
     * 
     * @param {number} t - Progress (0 to 1)
     * @returns {number} Eased progress (0 to 1)
     */
    const easeOutQuart = (t) => {
        return 1 - Math.pow(1 - t, 4);
    };

    /**
     * Alternative easing functions available for future use:
     * 
     * easeOutCubic: (t) => 1 - Math.pow(1 - t, 3)
     * easeOutExpo: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
     * easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
     */

    useEffect(() => {
        // Determine the starting value for animation
        // If 'to' changes, animate from current displayed value
        const startValue = previousToRef.current !== to ? displayValue : from;
        previousToRef.current = to;

        // Cancel any ongoing animation
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }

        // Reset start time
        startTimeRef.current = null;

        /**
         * Animation frame handler
         * Uses requestAnimationFrame for smooth 60fps updates
         */
        const animate = (timestamp) => {
            // Initialize start time on first frame
            if (!startTimeRef.current) {
                startTimeRef.current = timestamp;
            }

            // Calculate elapsed time and progress
            const elapsed = timestamp - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);

            // Apply easeOutQuart easing
            const easedProgress = easeOutQuart(progress);

            // Calculate current value using linear interpolation with easing
            const currentValue = startValue + (to - startValue) * easedProgress;
            setDisplayValue(currentValue);

            // Continue animation if not complete
            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                // Animation complete
                setDisplayValue(to); // Ensure exact final value
                if (onComplete) {
                    onComplete();
                }
            }
        };

        // Start animation
        animationRef.current = requestAnimationFrame(animate);

        // Cleanup on unmount or when dependencies change
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [to, duration]); // Re-run when target value or duration changes

    /**
     * Format the display value with the specified decimal places
     * and thousands separators
     */
    const formatValue = (value) => {
        const formatted = Number(value).toFixed(decimals);
        // Add thousands separator
        const parts = formatted.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    };

    return (
        <span className={className}>
            {prefix}{formatValue(displayValue)}{suffix}
        </span>
    );
};

export default CountUpAnimation;
