# =====================================================
# FILE: openhands/Dockerfile
# PURPOSE:
#   Build the OpenHands runner container for autonomous code execution
# =====================================================

FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    build-essential \
    libffi-dev \
    libssl-dev \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm

# Install GitHub CLI for PR creation
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | \
    dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && \
    chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | \
    tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
    apt-get update && \
    apt-get install -y gh && \
    rm -rf /var/lib/apt/lists/*

# Create workspace directory
WORKDIR /workspace

# Install OpenHands
# Note: Replace with actual OpenHands installation method when available
# For now, we'll install from pip or clone the repository
RUN pip install --no-cache-dir \
    openai \
    anthropic \
    langchain \
    langchain-core \
    && pip install --no-cache-dir openhands || \
    (git clone https://github.com/All-Hands-AI/OpenHands.git /opt/openhands && \
     cd /opt/openhands && \
     pip install -e .)

# Copy execution scripts
COPY scripts/ /scripts/
RUN chmod +x /scripts/*.sh

# Copy Agent Zero prompts and skills
COPY ../agent_zero /agent_zero

# Set environment variables
ENV REPO_ROOT=/workspace
ENV PROMPT_FILE=/agent_zero/prompts/lovable_gigaprompt.json
ENV MAX_ITERATIONS=500
ENV MAX_HOURS=72

# Default command runs the lovable job
CMD ["/scripts/run_lovable_job.sh"]
