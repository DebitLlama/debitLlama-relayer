FROM denoland/deno:1.39.2


WORKDIR /app

COPY . .

RUN deno cache main.ts

EXPOSE 8000

CMD ["task","start"]