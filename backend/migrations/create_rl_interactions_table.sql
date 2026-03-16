-- RL Interactions Table
-- Tracks every interaction between the RL model and a student.
-- Enables server-side persistence of the feedback loop (predict → engage → feedback).

CREATE TABLE IF NOT EXISTS rl_interactions (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    student_ID      VARCHAR(50) NOT NULL,
    interaction_id  VARCHAR(100) NOT NULL,
    action_id       INT NOT NULL,
    action_code     VARCHAR(50) NOT NULL,
    risk_score      DECIMAL(10,8) DEFAULT NULL,
    engaged         TINYINT(1) DEFAULT NULL,       -- NULL=pending, 1=engaged, 0=ignored
    feedback_sent   TINYINT(1) DEFAULT 0,          -- 1=feedback successfully delivered to RL API
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    engaged_at      DATETIME DEFAULT NULL,
    expires_at      DATETIME DEFAULT NULL,          -- Auto-expire stale interactions (default: 24h)

    INDEX idx_student_pending (student_ID, engaged, feedback_sent),
    INDEX idx_interaction (interaction_id),
    INDEX idx_expires (expires_at)
);
