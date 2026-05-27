FROM node:22-bookworm

# Install system dependencies
RUN apt-get update && apt-get install -y \
  git \
  curl \
  jq \
  postgresql \
  postgresql-client \
  build-essential \
  python3 \
  sudo \
  && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
  | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
  && apt-get update && apt-get install -y gh \
  && rm -rf /var/lib/apt/lists/*

# Create roundnet DB user and database at build time
RUN service postgresql start \
  && sudo -u postgres psql -c "CREATE USER roundnet WITH PASSWORD 'roundnet';" \
  && sudo -u postgres psql -c "CREATE DATABASE roundnet OWNER roundnet;" \
  && service postgresql stop

# Build-args for UID/GID alignment: sandcastle docker build-image
# defaults these to the host user's UID/GID so image-built files
# and bind-mounted files share an owner without runtime chown.
ARG AGENT_UID=1000
ARG AGENT_GID=1000

# Rename the base image's "node" user to "agent" and align UID/GID.
RUN groupmod -o -g $AGENT_GID node && usermod -o -u $AGENT_UID -g $AGENT_GID -d /home/agent -m -l agent node

# Allow agent to start/stop postgres without a password
RUN echo "agent ALL=(ALL) NOPASSWD: /usr/sbin/service postgresql start, /usr/sbin/service postgresql stop" >> /etc/sudoers

USER ${AGENT_UID}:${AGENT_GID}

# Install Claude Code CLI
RUN curl -fsSL https://claude.ai/install.sh | bash

# Add Claude to PATH
ENV PATH="/home/agent/.local/bin:$PATH"
ENV DATABASE_URL="postgresql://roundnet:roundnet@localhost:5432/roundnet"

WORKDIR /home/agent

COPY --chown=${AGENT_UID}:${AGENT_GID} entrypoint.sh /home/agent/entrypoint.sh
RUN chmod +x /home/agent/entrypoint.sh

# In worktree sandbox mode, Sandcastle bind-mounts the git worktree at /home/agent/workspace
# and overrides the working directory to /home/agent/workspace at container start.
# Structure your Dockerfile so that /home/agent/workspace can serve as the project root.
ENTRYPOINT ["/home/agent/entrypoint.sh"]
