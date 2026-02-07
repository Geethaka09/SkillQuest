import React from 'react';
import './RLToast.css';

/**
 * RL Toast Notification
 * 
 * A specialized toast notification for RL-triggered events (e.g., XP Boosts).
 * Currently hardcoded for the "2x XP Boost" scenario.
 * 
 * Future Improvement: Make content dynamic via props.
 */
const RLToast = ({ show, onClose }) => {
    if (!show) return null;

    return (
        <div className="rl-toast-overlay">
            <div className="rl-toast">
                <div className="toast-icon">🔥</div>
                <div className="toast-content">
                    <h3>2x XP Boost Unlocked!</h3>
                    <p>Complete a lesson in the next 20 minutes to earn double points!</p>
                </div>
                <button className="toast-close" onClick={onClose}>×</button>
            </div>
        </div>
    );
};

export default RLToast;
