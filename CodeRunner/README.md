# CodeEase Code Runner Microservice

A secure, Docker-based code execution service for the CodeEase learning platform.

## Features

- **Multi-language Support**: Java, C#, JavaScript, Python
- **Docker Isolation**: Each code execution runs in an isolated Docker container
- **Security**: Memory limits, CPU limits, network isolation, and execution timeouts
- **RESTful API**: Simple HTTP endpoints for code execution
- **Health Monitoring**: Built-in health checks and monitoring

## Supported Languages

| Language   | Extension | Docker Image           | Compilation |
|------------|-----------|------------------------|-------------|
| Java       | .java     | openjdk:11-jdk-slim   | Yes         |
| C#         | .cs       | dotnet/sdk:8.0        | Yes         |
| JavaScript | .js       | node:18-alpine        | No          |
| Python     | .py       | python:3.9-alpine     | No          |

## API Endpoints

### Execute Code
```
POST /execute
Content-Type: application/json

{
  "code": "public class Main { public static void main(String[] args) { System.out.println(\"Hello World\"); } }",
  "language": "java",
  "input": "optional input data",
  "timeout": 30000
}
```

**Response:**
```json
{
  "success": true,
  "executionId": "uuid-here",
  "language": "java",
  "executionTime": 1234,
  "output": "Hello World",
  "error": "",
  "exitCode": 0
}
```

### Get Supported Languages
```
GET /languages
```

### Health Check
```
GET /health
```

## Security Features

- **Container Isolation**: Each execution runs in a separate Docker container
- **Resource Limits**: 128MB memory limit, 50% CPU quota per execution
- **Network Isolation**: Containers have no network access
- **Execution Timeout**: Configurable timeout (default 30 seconds)
- **Automatic Cleanup**: Temporary files and containers are automatically removed
- **Read-only Root**: Container root filesystem is read-only where possible

## Installation & Usage

### Prerequisites
- Node.js 18+
- Docker
- Docker Compose (optional)

### Local Development
```bash
# Install dependencies
npm install

# Start the service
npm start

# Development mode with auto-reload
npm run dev
```

### Docker Deployment
```bash
# Build and run with Docker Compose
npm run docker:build
npm run docker:run

# Stop the service
npm run docker:stop
```

### Manual Docker
```bash
# Build image
docker build -t codease-runner .

# Run container
docker run -d \
  -p 3001:3001 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --name codease-runner \
  codease-runner
```

## Environment Variables

| Variable   | Default | Description                    |
|------------|---------|--------------------------------|
| PORT       | 3001    | Port for the HTTP server      |
| NODE_ENV   | -       | Environment (development/production) |

## Integration with CodeEase

The code runner service integrates with the main CodeEase application through HTTP API calls. The ASP.NET Core application sends code execution requests to this microservice and receives the results.

## Error Handling

The service includes comprehensive error handling:
- Invalid language detection
- Code compilation errors
- Runtime errors and exceptions
- Timeout handling
- Docker container failures
- Resource exhaustion

## Monitoring

- Health check endpoint at `/health`
- Structured logging with execution IDs
- Container resource monitoring
- Automatic cleanup of failed executions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.