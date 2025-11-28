# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git

# Copy go mod files first
COPY go.mod ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Generate go.sum and verify dependencies
RUN go mod tidy && go mod verify

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server

# Final stage
FROM alpine:latest

WORKDIR /app

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates tzdata

# Copy binary from builder
COPY --from=builder /app/main .
COPY --from=builder /app/migrations ./migrations

# Expose port
EXPOSE 8080

# Run the application
CMD ["./main"]

