# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git

# Copy go mod files first
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy entire backend source code
COPY . .

# Build application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server

# Final stage
FROM alpine:latest

WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata

# Copy built binary
COPY --from=builder /app/main .

# Copy migrations folder (correct name)
COPY --from=builder /app/migrations ./migrations

# Copy configuration
COPY --from=builder /app/config.yaml ./config.yaml

# Set ENV path
ENV CONFIG_FILE=/app/config.yaml

EXPOSE 8080

CMD ["./main"]
