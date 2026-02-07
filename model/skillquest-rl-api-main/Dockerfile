# ==========================================
# SKILLQUEST RL API - DOCKERFILE
# ==========================================

# 1. Base Image: Use Python 3.10 Slim
# 'slim' is a lightweight version of the official Python image (Debian-based).
# It has fewer packages than the full image but is much smaller, ideal for production.
FROM python:3.10-slim

# 2. Environment Configuration
# PYTHONUNBUFFERED=1: Ensures Python output (stdout/stderr) is sent straight to terminal
# without being buffered, which is critical for viewing logs in real-time in Docker containers.
ENV PYTHONUNBUFFERED=1

# Set the working directory inside the container
WORKDIR /app

# 3. System Dependencies
# Install 'build-essential' (gcc, make, etc.) which is required to compile some Python packages.
# We run 'apt-get update', install, and then 'rm -rf' lists to keep the layer size small.
RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

# 4. Python Dependencies
# Copy requirements first to leverage Docker layer caching.
# If requirements.txt hasn't changed, this step (and pip install) will be cached.
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# 5. Application Code
# Copy the rest of the application files into the container.
COPY . /app

# 6. Network
# Expose port 8000 to allow external access to the Flask app.
EXPOSE 8000

# 7. Default Environment Variables
# These act as defaults but can be overridden at runtime (e.g., via docker run -e)
ENV TIMEOUT_HOURS=12
ENV LOOP_INTERVAL_SECONDS=60
ENV POSITIVE_REWARD=0.8
ENV NEGATIVE_REWARD=-0.5
ENV TIMEOUT_PENALTY=-2.0
ENV AUTO_SAVE_INTERVAL=50

# 8. Start Command
# Use Gunicorn as the production WSGI server.
# -w 1: Use 1 worker process. 
#       CRITICAL: Since we store state (RL Memory) in a global variable in memory, 
#       we MUST use only 1 worker to avoid split-brain issues where different requests 
#       hit different memory states.
# -b 0.0.0.0:8000: Bind to all interfaces on port 8000.
CMD ["gunicorn", "-w", "1", "-b", "0.0.0.0:8000", "app:app"]