FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json ./
RUN npm install

COPY . .

RUN npx prisma generate || true

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["sh", "./entrypoint.sh"]
CMD ["npm", "run", "dev"]
