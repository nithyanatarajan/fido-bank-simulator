#!/bin/sh
# Substitute API_URL into nginx config at container startup
envsubst '${API_URL}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
