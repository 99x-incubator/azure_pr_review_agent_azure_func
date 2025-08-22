# Logging and Observability Guidelines for TypeScript Projects

This document provides best practices for implementing logging and observability in TypeScript codebases. These guidelines are intended for both developers and as a reference for LLM-based code review agents.

## 1. Use a Standard Logging Library
- Use a well-established logging library (e.g., `winston`, `pino`, `bunyan`) instead of `console.log` for production code.
- Configure log levels (e.g., `info`, `warn`, `error`, `debug`) appropriately.

**Example (using winston):**
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  transports: [new winston.transports.Console()],
});

logger.info('Application started');
logger.error('An error occurred', { error });
```

## 2. Log at the Appropriate Level
- Use log levels to indicate the severity and intent:
  - `error`: For unexpected failures or exceptions.
  - `warn`: For recoverable issues or deprecated usage.
  - `info`: For high-level application events (startup, shutdown, etc.).
  - `debug`: For detailed diagnostic information.


## 3. Include Contextual Information and Use Structured Logging
- Add relevant context to log messages (e.g., user IDs, request IDs, operation names).
- Use structured logging (log objects, not just strings) for easier parsing and analysis in log management systems.
- Include key-value pairs for important context (e.g., userId, orderId, operation, status).
- Most logging libraries (like winston, pino) support structured logging natively.

**Example:**
```typescript
logger.info('Order processed', {
  orderId,
  userId,
  status: 'success',
  amount,
  timestamp: new Date().toISOString()
});
```
## 5. Correlation IDs

- Generate a unique correlation ID (e.g., UUID) for each incoming request or operation.
- Pass the correlation ID through all layers and include it in every log entry related to that request.
- This practice helps trace the flow of a request across distributed systems and microservices.

**Example:**
```typescript
import { v4 as uuidv4 } from 'uuid';

const correlationId = req.headers['x-correlation-id'] || uuidv4();
logger.info('Received request', { correlationId, path: req.path });

// Pass correlationId to downstream services and logs
```

### Best Practices for Correlation IDs
- Always log the correlation ID and other context in error and exception logs.
- If using async frameworks, use context propagation libraries (like `cls-hooked` or `AsyncLocalStorage` in Node.js) to automatically attach correlation IDs to logs.

## 4. Avoid Logging Sensitive Information
- Never log passwords, tokens, or other sensitive data.
- Mask or redact sensitive fields if they must be included for debugging.



## 6. Log Exceptions with Stack Traces
- Always log the full error object, including stack trace, when logging exceptions.

**Example:**
```typescript
try {
  // ...
} catch (error) {
  logger.error('Unhandled exception', { error });
}
```

## 7. Use Observability Tools
- Integrate with observability platforms (e.g., Azure Monitor, Application Insights, Datadog) for metrics, traces, and centralized log management.
- Emit custom metrics for key business and technical events.

## 8. Avoid Excessive Logging
- Do not log in tight loops or for every minor operation.
- Ensure logging does not impact application performance.

## 9. Monitor and Alert on Logs
- Set up alerts for critical errors or anomalies detected in logs.
- Regularly review logs and metrics to identify issues and trends.

## 10. Document Logging Strategy
- Document your logging approach, log levels, and observability integrations in project documentation.


By following these guidelines, you can ensure your TypeScript applications are observable, debuggable, and production-ready.
