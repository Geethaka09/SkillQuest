# ==========================================
# SKILLQUEST RL API - SINGLE FILE VERSION
# ==========================================
# This is the main entry point for the Reinforcement Learning (RL) API service.
# It hosts a Flask web server that provides endpoints for:
# 1. Prediction: Suggesting the best intervention (action) for a student.
# 2. Feedback: Receiving engagement results to train the RL agent.
# 3. Model Management: Saving/Loading checkpoints and viewing statistics.
#
# Run locally: python app.py
# API will be available at: http://localhost:8000
# ==========================================

import os
import time
import uuid
import random
import threading
from collections import deque
from datetime import datetime, timedelta, timezone

# Web Framework
from flask import Flask, request, jsonify
from flask_cors import CORS

# Machine Learning & Data Science
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

# ==========================================
# FLASK APP SETUP
# ==========================================
app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing (allows frontend to call API directly)

# API Security configuration
# Set 'API_KEY' in your environment variables (e.g., in Azure App Service settings)
# to restrict access to sensitive endpoints like /feedback and /save.
API_KEY = os.getenv("API_KEY") 

# ==========================================
# ACTION SPACE DEFINITION
# ==========================================
# The set of all possible interventions the agent can recommend.
# Each action maps to a specific feature or UI element in the student's dashboard.
ACTION_SPACE = {
    0: {"id": 0, "code": "STANDARD_XP",     "name": "Standard XP",     "description": "Award normal XP points for activity",          "target": "all_students"},
    1: {"id": 1, "code": "MULTIPLIER_BOOST","name": "Multiplier Boost","description": "Apply XP multiplier (e.g., 2x, 3x) next activity","target": "all_students"},
    2: {"id": 2, "code": "BADGE_INJECTION", "name": "Badge Injection", "description": "Award a surprise badge to boost motivation",     "target": "all_students"},
    3: {"id": 3, "code": "RANK_COMPARISON", "name": "Rank Comparison", "description": "Show 'X points to reach Top N' message",         "target": "skillful_students"},
    4: {"id": 4, "code": "EXTRA_GOALS",     "name": "Extra Goals",     "description": "Set additional achievable micro-goals",          "target": "struggling_students"}
}

# ==========================================
# NEURAL NETWORK (DQN)
# ==========================================
class DQN(nn.Module):
    """
    Deep Q-Network (DQN) architecture.
    A simple feed-forward neural network that approximates the Q-value function: Q(state, action).
    It predicts the expected future reward for taking each action in a given state.
    """
    def __init__(self, input_size=8, output_size=5):
        super(DQN, self).__init__()
        # Three fully connected layers with ReLU activation
        self.net = nn.Sequential(
            nn.Linear(input_size, 64), 
            nn.ReLU(),
            nn.Linear(64, 64), 
            nn.ReLU(),
            nn.Linear(64, output_size)  # Output layer: one Q-value per action
        )

    def forward(self, x):
        """Forward pass to compute Q-values for input state x."""
        return self.net(x)

# ==========================================
# RL AGENT CLASS
# ==========================================
class RLAgent:
    """
    Reinforcement Learning Agent using DQN.
    Manages the model, training loop (experience replay), and action selection (epsilon-greedy).
    """
    def __init__(self):
        # State dimension: 8 features (level_x3, duration, risk, quiz, consecutive, daily_xp)
        self.input_size = 8
        self.output_size = 5  # Number of actions in ACTION_SPACE
        
        # Initialize model and optimizer
        self.model = DQN(self.input_size, self.output_size)
        self.optimizer = optim.Adam(self.model.parameters(), lr=0.001) # Learning rate
        self.loss_fn = nn.MSELoss() # Mean Squared Error loss
        
        # Hyperparameters
        self.epsilon = 0.01          # Exploration rate (start low assumes pre-trained or quickly converging)
        self.epsilon_min = 0.01      # Minimum exploration rate
        self.epsilon_decay = 0.995   # Decay factor per training step
        self.gamma = 0.95            # Discount factor for future rewards
        
        # Experience Replay Memory
        # Stores past experiences (state, action, reward, next_state, done) to break correlation in training data
        self.memory = deque(maxlen=2000)

    def choose_action(self, state_vector, validate_for_risk=None):
        """
        Selects an action using Epsilon-Greedy strategy.
        - With probability epsilon, choose a random action (Explore).
        - Otherwise, choose the action with highest Q-value (Exploit).
        """
        state_tensor = torch.FloatTensor(state_vector)
        
        # Exploration
        if random.random() <= self.epsilon:
            action = random.randint(0, self.output_size - 1)
        # Exploitation
        else:
            with torch.no_grad():
                q_values = self.model(state_tensor)
                action = torch.argmax(q_values).item()
        
        # Safety constraint: Validation for high-risk students
        if validate_for_risk is not None:
            action = self._validate_action(action, validate_for_risk)
        return action
    
    def _validate_action(self, action, risk_score):
        """
        Safety guardrail: Overrides the agent's choice if it's unsuitable for high-risk students.
        Example: Don't show 'Rank Comparison' (Action 3) to struggling students (Risk > 0.6),
        as it might demotivate them. Instead, show 'Extra Goals' (Action 4).
        """
        is_struggling = risk_score > 0.6
        if action == 3 and is_struggling:
            return 4
        return action

    def remember(self, state, action, reward, next_state, done):
        """Store a new experience tuple in memory."""
        self.memory.append((state, action, reward, next_state, done))

    def replay(self, batch_size=32):
        """
        Training step: Sample a batch of experiences from memory and update the model.
        Returns True if training happened, False if not enough memory.
        """
        if len(self.memory) < batch_size:
            return False
            
        # Sample random minibatch
        minibatch = random.sample(self.memory, batch_size)
        
        for state, action, reward, next_state, done in minibatch:
            state_t = torch.FloatTensor(state)
            next_state_t = torch.FloatTensor(next_state)
            
            # Compute target Q-value
            target = reward
            if not done:
                # Bellman Equation: Q(s,a) = r + gamma * max(Q(s', a'))
                target = reward + self.gamma * torch.max(self.model(next_state_t)).item()
                
            # Get current Q-values prediction
            target_f = self.model(state_t).clone()
            # Update the Q-value for the specific action taken
            target_f[action] = target
            
            # Backpropagation
            self.optimizer.zero_grad()
            loss = self.loss_fn(self.model(state_t), target_f)
            loss.backward()
            self.optimizer.step()
            
        # Decay exploration rate
        if self.epsilon > self.epsilon_min:
            self.epsilon *= self.epsilon_decay
            
        return True

    def get_q_values(self, state_vector):
        """Returns the raw Q-values for all actions for visualization/debugging."""
        state_tensor = torch.FloatTensor(state_vector)
        with torch.no_grad():
            q_values = self.model(state_tensor)
        return q_values.numpy().tolist()

# ==========================================
# HELPER FUNCTIONS
# ==========================================
def calculate_engagement(active_minutes, quiz_accuracy, modules_done, days_since_last_login):
    """
    Heuristic function to calculate a composite 'Engagement Score' for a student.
    Used as an input feature for the Risk Model.
    """
    # Normalize time: assume 60 mins is "full" engagement (1.0)
    time_score = min(active_minutes / 60.0, 1.0)
    
    accuracy_score = quiz_accuracy # 0.0 to 1.0
    
    # Time decay: Engagement drops if they haven't logged in recently
    decay_factor = np.exp(-0.5 * days_since_last_login)
    
    # Weighted sum of components
    raw_engagement = (0.5 * time_score) + (0.3 * accuracy_score) + (0.2 * (modules_done > 0))
    
    final_engagement = raw_engagement * decay_factor
    return float(final_engagement)

def calculate_reward_score(recent_points, total_badges):
    """
    Heuristic function to calculate 'Reward Sensitivity' score.
    Used as input for the Risk Model.
    """
    # Tanh normalization for points (saturates at higher values)
    points_value = np.tanh(recent_points / 500.0)
    
    # Binary bonus for badges
    badge_value = 1.0 if total_badges > 0 else 0.0
    
    reward_score = (0.7 * points_value) + (0.3 * badge_value)
    return float(reward_score)

def get_state_vector(user_data, risk_score):
    """
    Constructs the 8-dimensional state vector required by the DQN.
    Vector structure: [L1, L2, L3, Duration, Risk, Quiz, Consistency, XP]
    - L1-L3: One-hot encoded level (Beginner, Intermediate, Expert)
    """
    # 1. Level Encoding (One-hot)
    levels = ['Beginner', 'Intermediate', 'Expert']
    level_vec = [0, 0, 0]
    current_lvl = user_data.get('level', 'Beginner')
    if current_lvl in levels:
        level_vec[levels.index(current_lvl)] = 1
        
    # 2. Normalize Continuous Features
    # Clip duration at 1.5x of 10 hours (600 mins) merely for normalization scale
    duration_norm = min(user_data.get('session_duration', 0) / 600, 1.5)
    
    quiz_norm = user_data.get('quiz_score', 0) / 100.0
    
    # Cap consecutive completions at 10
    consecutive_norm = min(user_data.get('consecutive_completions', 1) / 10.0, 1.0)
    
    # Tanh for XP (soft cap around 500)
    daily_xp_norm = np.tanh(user_data.get('daily_xp', 0) / 500.0)
    
    # 3. Assemble Vector
    state_vector = np.array(level_vec + [duration_norm, risk_score, quiz_norm, consecutive_norm, daily_xp_norm])
    return state_vector

# ==========================================
# INITIALIZE MODELS
# ==========================================
print("=" * 50)
print("🚀 Initializing SkillQuest RL API...")
print("=" * 50)

# --- 1. Risk Model (Synthetic Training) ---
# We train a logistic regression model on synthetic data at startup to predict student churn risk.
# In production, this would be loaded from a pre-trained file.
print("📊 Training Risk Model...")
np.random.seed(42)
n_samples = 1000

# Generate synthetic features
engagement_data = np.random.rand(n_samples)
rewards_data = np.random.rand(n_samples)

# Define ground truth logic: High engagement & rewards = High retention (Target=1)
# Add some noise to make it realistic
retention_logic = (engagement_data * 0.6) + (rewards_data * 0.4) + np.random.normal(0, 0.1, n_samples)
y_target = (retention_logic > 0.5).astype(int)

# Train-Test Split
X = np.column_stack((engagement_data, rewards_data))
X_train, X_test, y_train, y_test = train_test_split(X, y_target, test_size=0.2, random_state=42)

# Train Logic Regression
risk_model = LogisticRegression()
risk_model.fit(X_train, y_train)
print(f"✅ Risk Model Ready (Accuracy: {risk_model.score(X_test, y_test):.2f})")

# --- 2. RL Agent ---
agent = RLAgent()
MODEL_PATH = 'trained_rl_agent.pth'

# Load existing model if available
if os.path.exists(MODEL_PATH):
    try:
        # Load checkpoint (handling CPU mapping)
        checkpoint = torch.load(MODEL_PATH, map_location=torch.device('cpu'), weights_only=False)
        agent.model.load_state_dict(checkpoint['model_state_dict'])
        agent.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        agent.epsilon = checkpoint.get('epsilon', 0.01)
        
        # Load replay memory
        for exp in checkpoint.get('memory', []):
            agent.memory.append(exp)
            
        print(f"✅ RL Agent Loaded (Epsilon: {agent.epsilon:.3f}, Memory: {len(agent.memory)})")
    except Exception as e:
        print(f"⚠️ Error loading model: {e}")
        print("   Using untrained agent instead.")
else:
    print("⚠️ No trained model found. Using untrained agent.")
    print(f"   Place '{MODEL_PATH}' in the same folder as app.py")

# ==========================================
# PENDING RECOMMENDATIONS STORE
# ==========================================
# We track recommendations sent to students to correlate them with future feedback.
# If no feedback is received within `TIMEOUT_HOURS`, we consider it a 'Timeout' (negative).

# Thread-safe in-memory store: { recommendation_id: recommendation_data }
PENDING = {}
PENDING_LOCK = threading.Lock()

# Configuration from Environment Variables
TIMEOUT_HOURS = float(os.getenv("TIMEOUT_HOURS", "12"))          # Time window to wait for feedback
LOOP_INTERVAL_SECONDS = int(os.getenv("LOOP_INTERVAL_SECONDS", "60")) # How often to check for timeouts
POSITIVE_REWARD = float(os.getenv("POSITIVE_REWARD", "0.8"))     # Reward for explicit "Engaged"
NEGATIVE_REWARD = float(os.getenv("NEGATIVE_REWARD", "-0.5"))    # Reward for explicit "Not Engaged"
TIMEOUT_PENALTY = float(os.getenv("TIMEOUT_PENALTY", "-2.0"))    # Penalty for missing feedback (ignored)

# Auto-save frequency (in number of training updates)
AUTO_SAVE_INTERVAL = int(os.getenv("AUTO_SAVE_INTERVAL", "50"))
training_updates = 0

def utc_now():
    """Returns current UTC timestamp."""
    return datetime.now(timezone.utc)

def new_recommendation_id():
    """Generates a unique ID for each recommendation request."""
    return str(uuid.uuid4())

# -- Thread-safe accessors for PENDING dict --

def add_pending(rec):
    with PENDING_LOCK:
        PENDING[rec["recommendation_id"]] = rec

def pop_pending(recommendation_id):
    with PENDING_LOCK:
        return PENDING.pop(recommendation_id, None)

def list_pending():
    with PENDING_LOCK:
        return list(PENDING.values())

def save_checkpoint():
    """Saves the current model state and memory to disk."""
    try:
        # Save only the last 500 experiences to keep file size manageable
        memory_to_save = []
        for state, action, reward, next_state, done in list(agent.memory)[-500:]:
            memory_to_save.append((
                state.tolist() if hasattr(state, 'tolist') else list(state),
                action,
                reward,
                next_state.tolist() if hasattr(next_state, 'tolist') else list(next_state),
                done
            ))
            
        checkpoint = {
            'model_state_dict': agent.model.state_dict(),
            'optimizer_state_dict': agent.optimizer.state_dict(),
            'epsilon': agent.epsilon,
            'memory': memory_to_save
        }
        torch.save(checkpoint, MODEL_PATH)
        print(f"[RL] Auto-saved checkpoint to {MODEL_PATH}")
        return True
    except Exception as e:
        print("[RL] Auto-save failed:", e)
        return False

def apply_model_update(context, action, reward, reason="feedback"):
    """
    Core function to update the model.
    1. Stores the experience in memory.
    2. Triggers a replay training step.
    3. Auto-saves if interval is reached.
    """
    agent.remember(context, action, reward, context, True)
    trained = agent.replay(batch_size=32)
    
    print(f"[RL] Update ({reason}) -> action={ACTION_SPACE[action]['code']} reward={reward} trained={trained}")
    
    global training_updates
    if trained:
        training_updates += 1
        if training_updates % AUTO_SAVE_INTERVAL == 0:
            save_checkpoint()
            
    return trained

def check_timeouts_loop():
    """
    Background worker thread.
    Periodically checks for pending recommendations that have expired.
    If expired, applies a negative penalty (TIMEOUT_PENALTY) effectively teaching the agent
    that its recommendation was ignored.
    """
    print("[TimeoutWorker] Started. Scanning for expired recommendations every", LOOP_INTERVAL_SECONDS, "seconds")
    while True:
        try:
            now = utc_now()
            expired = []
            
            # Identify expired items
            for rec in list_pending():
                expires_at = datetime.fromisoformat(rec["expires_at"])
                if now >= expires_at:
                    expired.append(rec)
            
            # Process expirations
            for rec in expired:
                popped = pop_pending(rec["recommendation_id"])
                if popped:
                    apply_model_update(
                        context=np.array(popped["state"]),
                        action=popped["action_id"],
                        reward=TIMEOUT_PENALTY,
                        reason="timeout"
                    )
                    print(f"[TimeoutWorker] Penalized recommendation_id={popped['recommendation_id']} user_id={popped['user_id']}")
                    
        except Exception as e:
            print("[TimeoutWorker] Error:", e)
            
        time.sleep(LOOP_INTERVAL_SECONDS)

# Launch the timeout worker in daemon mode (dies when main app dies)
threading.Thread(target=check_timeouts_loop, daemon=True).start()

print("=" * 50)
print("✅ API Ready!")
print("=" * 50)

# ==========================================
# REQUEST AUTH HELPER
# ==========================================
def require_api_key():
    """Simple check for API key in headers."""
    if not API_KEY:
        return True  # Allow all if no key configured (dev mode)
    key = request.headers.get("X-API-Key")
    return key == API_KEY

# ==========================================
# API ENDPOINTS
# ==========================================

@app.route('/', methods=['GET'])
def home():
    """Root endpoint: Returns API documentation and health status."""
    return jsonify({
        "service": "SkillQuest RL API",
        "version": "1.2.0",
        "status": "running",
        "endpoints": {
            "GET /": "This documentation",
            "GET /health": "Health check",
            "GET /actions": "List all available actions",
            "POST /predict": "Get action prediction (returns recommendation_id + expires_at)",
            "POST /feedback": "Send only recommendation_id and engaged=true if the student engaged",
            "GET /stats": "Get model statistics",
            "POST /save": "Save current model checkpoint"
        }
    })

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint for monitoring."""
    return jsonify({
        "status": "healthy",
        "model_loaded": os.path.exists(MODEL_PATH),
        "agent_epsilon": agent.epsilon,
        "memory_size": len(agent.memory)
    })

@app.route('/actions', methods=['GET'])
def get_actions():
    """Returns the list of all possible actions/interventions."""
    return jsonify({
        "success": True,
        "total_actions": len(ACTION_SPACE),
        "actions": list(ACTION_SPACE.values())
    })

@app.route('/predict', methods=['POST'])
def predict():
    """
    Main Prediction Endpoint.
    1. Receives student performance metrics.
    2. Calculates Risk Score.
    3. Runs RL Agent to choose best intervention.
    4. Returns recommendation + correlation ID.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No JSON data provided."}), 400

        # Validate required fields
        required_fields = ['user_id', 'level', 'active_minutes', 'quiz_accuracy', 'days_since_last_login']
        missing_fields = [f for f in required_fields if f not in data]
        if missing_fields:
            return jsonify({"success": False, "error": f"Missing required fields: {missing_fields}"}), 400

        user_id = data['user_id']
        
        # Prepare User Data Dictionary
        user_data = {
            'level': data.get('level', 'Beginner'),
            'daily_xp': data.get('daily_xp', 0),
            'active_minutes': data.get('active_minutes', 0),
            'quiz_accuracy': data.get('quiz_accuracy', 0),
            'modules_done': data.get('modules_done', 0),
            'days_since_last_login': data.get('days_since_last_login', 0),
            'recent_points': data.get('recent_points', 0),
            'total_badges': data.get('total_badges', 0),
            'session_duration': data.get('session_duration', 0),
            'quiz_score': data.get('quiz_score', 0),
            'consecutive_completions': data.get('consecutive_completions', 1)
        }

        # 1. Calculate Risk Inputs
        engagement = calculate_engagement(
            active_minutes=user_data['active_minutes'],
            quiz_accuracy=user_data['quiz_accuracy'],
            modules_done=user_data['modules_done'],
            days_since_last_login=user_data['days_since_last_login']
        )
        reward_score = calculate_reward_score(
            recent_points=user_data['recent_points'],
            total_badges=user_data['total_badges']
        )

        # 2. Predict Risk
        student_features = np.array([[engagement, reward_score]])
        retention_prob = risk_model.predict_proba(student_features)[0][1]
        risk_score = 1.0 - retention_prob
        risk_level = "high" if risk_score > 0.6 else ("medium" if risk_score > 0.35 else "low")

        # 3. RL Agent Decision
        state_vector = get_state_vector(user_data, risk_score)
        action_id = agent.choose_action(state_vector, validate_for_risk=risk_score)
        action = ACTION_SPACE[action_id]
        
        # Get Q-values for debugging/dashboard
        q_values = agent.get_q_values(state_vector)

        # 4. Prepare Recommendation Record
        recommendation_id = new_recommendation_id()
        expires_at = (utc_now() + timedelta(hours=TIMEOUT_HOURS)).isoformat()

        # Store in Pending list for feedback tracking
        add_pending({
            "recommendation_id": recommendation_id,
            "user_id": user_id,
            "action_id": action_id,
            "state": state_vector.tolist(),
            "created_at": utc_now().isoformat(),
            "expires_at": expires_at
        })

        return jsonify({
            "success": True,
            "user_id": user_id,
            "recommendation_id": recommendation_id,
            "expires_at": expires_at,
            "window_hours": TIMEOUT_HOURS,
            "recommendation": {
                "action_id": action['id'],
                "action_code": action['code'],
                "action_name": action['name'],
                "description": action['description'],
                "target_audience": action['target']
            },
            "student_analysis": {
                "engagement_score": round(engagement, 4),
                "reward_score": round(reward_score, 4),
                "risk_score": round(risk_score, 4),
                "risk_level": risk_level
            },
            "all_action_scores": {
                ACTION_SPACE[i]['code']: round(q, 4) for i, q in enumerate(q_values)
            }
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/feedback', methods=['POST'])
def feedback():
    """
    Feedback Loop.
    Receives notification when a student interacts (or fails to interact) with the recommendation.
    Updates the model weights based on the reward.
    """
    if not require_api_key():
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No JSON data provided"}), 400

        recommendation_id = data.get('recommendation_id')
        engaged = bool(data.get('engaged', True))  # Default to True

        if not recommendation_id:
            return jsonify({"success": False, "error": "recommendation_id is required"}), 400

        # Retrieve the original state and action from pending store
        rec = pop_pending(recommendation_id)
        if not rec:
            return jsonify({"success": False, "error": "Unknown or already processed recommendation_id"}), 400

        last_state = np.array(rec['state'])
        last_action = rec['action_id']
        user_id = rec['user_id']

        # Determine Reward
        reward = POSITIVE_REWARD if engaged else NEGATIVE_REWARD

        # Train Model
        trained = apply_model_update(context=last_state, action=last_action, reward=reward, reason="feedback")

        return jsonify({
            "success": True,
            "feedback_recorded": True,
            "user_id": user_id,
            "recommendation_id": recommendation_id,
            "engaged": engaged,
            "reward": reward,
            "action_taken": ACTION_SPACE[last_action]['code'],
            "model_stats": {
                "memory_size": len(agent.memory),
                "epsilon": round(agent.epsilon, 4),
            },
            "training_performed": trained
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/stats', methods=['GET'])
def stats():
    """Returns internal model statistics for admins."""
    return jsonify({
        "success": True,
        "model": {
            "loaded": os.path.exists(MODEL_PATH),
            "path": MODEL_PATH,
            "epsilon": round(agent.epsilon, 4),
            "memory_size": len(agent.memory),
            "memory_capacity": agent.memory.maxlen
        },
        "pending_recommendations": len(list_pending()),
        "actions_available": len(ACTION_SPACE),
        "timeout_policy_hours": TIMEOUT_HOURS,
        "positive_reward": POSITIVE_REWARD,
        "negative_reward": NEGATIVE_REWARD,
        "timeout_penalty": TIMEOUT_PENALTY,
        "auto_save_interval": AUTO_SAVE_INTERVAL
    })

@app.route('/save', methods=['POST'])
def save_model():
    """Manually trigger a model checkpoint save."""
    if not require_api_key():
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    try:
        ok = save_checkpoint()
        return jsonify({"success": ok, "message": f"Model saved to {MODEL_PATH}" if ok else "Save failed"}), (200 if ok else 500)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ==========================================
# RUN THE SERVER
# ==========================================
if __name__ == '__main__':
    print("\n" + "=" * 50)
    print("📡 API Endpoints:")
    print("=" * 50)
    print("   GET  /           - API Documentation")
    print("   GET  /health     - Health Check")
    print("   GET  /actions    - List All Actions")
    print("   POST /predict    - Get Action Prediction (returns recommendation_id)")
    print("   POST /feedback   - Record Feedback (send recommendation_id + engaged)")
    print("   GET  /stats      - Model Statistics")
    print("   POST /save       - Save Model")
    print("=" * 50)
    
    port = int(os.environ.get('PORT', 8000))
    print(f"\n🌐 Starting server at http://localhost:{port}")
    print("=" * 50 + "\n")
    
    app.run(host='0.0.0.0', port=port, debug=False)