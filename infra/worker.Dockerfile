# Worker de mídia (worker/): Node + Python, sem porta exposta (D3).
FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv fonts-dejavu-core \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY worker/package.json worker/package.json
RUN npm ci --workspace worker --include-workspace-root
COPY worker/python worker/python
RUN python3 -m venv worker/.venv && worker/.venv/bin/pip install --no-cache-dir -r worker/python/requirements.txt \
 && python3 -m venv worker/.venv-cuts && worker/.venv-cuts/bin/pip install --no-cache-dir -r worker/python/requirements-cuts.txt
COPY worker/ worker/
# Mesmo uid do www-data do app (33): os dois leem e gravam o volume de mídia.
RUN mkdir -p worker/render_output worker/models worker/logs && chown -R 33:33 worker/render_output worker/models worker/logs
USER 33:33
CMD ["npm", "start", "-w", "worker"]
