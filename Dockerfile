FROM node:22-alpine AS frontend
WORKDIR /build
COPY package.json ./
COPY scripts/vendor.cjs scripts/vendor.cjs
RUN npm install --ignore-scripts --no-audit --no-fund && npm run vendor

FROM python:3.12-alpine

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    LAB_HOST=0.0.0.0 \
    LAB_PORT=8000

WORKDIR /app
COPY --chown=10001:10001 server.py index.html app.js city.js city.css remediation.json ./
COPY --from=frontend --chown=10001:10001 /build/vendor ./vendor

USER 10001:10001
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2).read()" || exit 1

CMD ["python", "server.py"]
