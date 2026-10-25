FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/ /usr/share/nginx/html/
RUN test -z "$(find /usr/share/nginx/html -name '*.map' -print -quit)"
