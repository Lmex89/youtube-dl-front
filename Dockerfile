
# Base image
FROM node:18

# Set working directory

RUN apt-get update
RUN apt-get upgrade -y
RUN apt-get install -y autoconf automake apt-utils
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
COPY . /usr/src/app

EXPOSE 3000
ENV NODE_ENV production
ENV PORT 3000
ENV PUBLIC_PATH "/"
RUN npm install --legacy-peer-deps
# Build the React app
RUN npm run build

RUN npm install -g serve
# Start NGINX
CMD ["serve", "-s", "build"]
