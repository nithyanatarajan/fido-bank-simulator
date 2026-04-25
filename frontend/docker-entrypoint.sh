#!/bin/sh
# Inject runtime API_URL into config.js served by nginx
cat > /usr/share/nginx/html/config.js <<EOF
window.__CONFIG__ = { apiUrl: '${API_URL:-}' };
EOF

exec nginx -g 'daemon off;'
