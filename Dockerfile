FROM node:20-alpine AS web
WORKDIR /web
COPY frontend/package.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM golang:1.22-alpine AS api
WORKDIR /src
COPY backend/ ./
ENV CGO_ENABLED=0 GOFLAGS=-mod=mod
RUN go get github.com/kilic/bls12-381@master && go mod tidy && go build -o /out/cryptolab .

FROM alpine:3.20
WORKDIR /app
COPY --from=api /out/cryptolab /app/cryptolab
COPY --from=web /web/dist /app/web
ENV PORT=8470
EXPOSE 8470
CMD ["/app/cryptolab"]
