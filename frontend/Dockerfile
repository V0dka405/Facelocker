# frontend/Dockerfile
FROM node:24-alpine

WORKDIR /app

# Update Alpine packages to address known vulnerabilities in base image
RUN apk update && apk upgrade --no-cache

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

# รันโหมด Development (ถ้าจะขึ้น Production แนะนำให้ Build แล้วใช้ Nginx)
CMD ["npm", "start"]