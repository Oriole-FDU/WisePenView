FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/ /usr/share/nginx/html/
RUN test -z "$(find /usr/share/nginx/html -iname '*.map' -o -type l)" || \
    { echo 'Public dist contains source maps or symlinks'; exit 1; }
