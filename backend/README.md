# Mahjong Game Backend

A Golang backend service for the Mahjong multiplayer game, featuring real-time WebSocket communication, JWT authentication, LINE OAuth2 login, and MySQL database integration.

## Features

- **Authentication**: Traditional registration/login with JWT tokens
- **LINE OAuth2**: Third-party login via LINE
- **WebSocket**: Real-time game communication using Gorilla WebSocket
- **ORM**: GORM with MySQL driver
- **Database Migrations**: SQL migration files for schema management
- **Docker Support**: Containerized deployment with Docker Compose

## Project Structure

```
backend/
├── cmd/server/          # Application entry point
├── internal/
│   ├── auth/            # Authentication (JWT, LINE OAuth)
│   ├── config/          # Configuration management
│   ├── game/            # Game logic
│   │   ├── mahjong/     # Mahjong rules engine
│   │   └── bot/         # AI player
│   ├── matchmaking/     # Player matchmaking queue
│   ├── record/          # Game records
│   ├── socket/          # WebSocket handling
│   └── user/            # User management
├── pkg/
│   ├── middleware/      # HTTP middleware
│   └── response/        # API response helpers
├── migrations/          # SQL migrations
└── Dockerfile
```

## Prerequisites

- Go 1.21+
- MySQL 8.0+
- Docker & Docker Compose (optional)

## Quick Start

### Local Development

1. **Install dependencies**:
   ```bash
   cd backend
   go mod download
   ```

2. **Configure environment**:
   Create a `config.yaml` or set environment variables:
   ```yaml
   server:
     port: "8080"
     mode: "debug"
   
   database:
     host: "localhost"
     port: "3306"
     user: "mahjong"
     password: "mahjong_secret"
     name: "mahjong_db"
   
   jwt:
     secret: "your-secret-key"
     expirationHours: 72
   
   line:
     channelId: ""
     channelSecret: ""
     callbackUrl: "http://localhost:8080/api/auth/line/callback"
   ```

3. **Start MySQL**:
   ```bash
   docker run -d --name mahjong-mysql \
     -e MYSQL_ROOT_PASSWORD=root \
     -e MYSQL_DATABASE=mahjong_db \
     -e MYSQL_USER=mahjong \
     -e MYSQL_PASSWORD=mahjong_secret \
     -p 3306:3306 \
     mysql:8.0
   ```

4. **Run the server**:
   ```bash
   go run cmd/server/main.go
   ```

### Docker Compose

From the project root:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login with credentials |
| GET | `/api/auth/line/login` | Initiate LINE OAuth |
| GET | `/api/auth/line/callback` | LINE OAuth callback |

### Protected Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/profile` | Get user profile |
| PUT | `/api/user/profile` | Update profile |

### WebSocket

Connect to `/ws?token=<JWT_TOKEN>` for real-time game communication.

#### Events (Client → Server)

```json
{ "event": "action:join", "data": { "roomId": "room_101" } }
{ "event": "action:quickmatch" }
{ "event": "action:create_room", "data": { "baseScore": 100, "taiScore": 20, "rounds": 1 } }
{ "event": "action:discard", "data": { "tileIndex": 5 } }
{ "event": "action:operate", "data": { "action": "PONG" } }
{ "event": "game:restart" }
{ "event": "action:leave" }
```

#### Events (Server → Client)

```json
{ "event": "connected", "data": { "user_id": 123, "display_name": "Player" } }
{ "event": "game:state", "data": { /* GameStateDTO */ } }
{ "event": "game:effect", "data": { "type": "ACTION_PONG", "text": "碰" } }
{ "event": "game:error", "data": "Error message" }
{ "event": "room:created", "data": { "room_id": "abc123" } }
{ "event": "room:players", "data": { "players": [...], "count": 4 } }
{ "event": "matchmaking:joined", "data": { "message": "Looking for opponents..." } }
{ "event": "matchmaking:found", "data": { "message": "Match found!" } }
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | MySQL host | localhost |
| `DB_PORT` | MySQL port | 3306 |
| `DB_USER` | MySQL user | mahjong |
| `DB_PASSWORD` | MySQL password | mahjong_secret |
| `DB_NAME` | Database name | mahjong_db |
| `JWT_SECRET` | JWT signing secret | (required) |
| `LINE_CHANNEL_ID` | LINE OAuth Channel ID | (optional) |
| `LINE_CHANNEL_SECRET` | LINE OAuth Secret | (optional) |

## LINE OAuth Setup

1. Create a LINE Login channel at [LINE Developers Console](https://developers.line.biz/)
2. Set the callback URL to: `http://your-domain/api/auth/line/callback`
3. Configure `LINE_CHANNEL_ID` and `LINE_CHANNEL_SECRET` environment variables

## Database Schema

The database schema is auto-migrated on startup. Manual migrations are in `migrations/`:

- `000001_create_users.up.sql`: Users table
- `000002_create_game_records.up.sql`: Game records table

## License

MIT

