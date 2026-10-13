# backend/Dockerfile

FROM node:22-alpine

WORKDIR /app

# ✅ สำคัญมาก: ต้องลง python, make, g++ เพื่อให้ compile bcrypt ผ่าน
RUN apk add --no-cache python3 make g++

# Copy ไฟล์ package ไปก่อน
COPY package*.json ./

# ติดตั้ง dependencies (จะมีการ compile bcrypt ตรงนี้)
RUN npm install

# Copy โค้ดที่เหลือ
COPY . .

EXPOSE 8001

# รันไฟล์ main.js
CMD ["node", "main.js"]