# Exception Handling Guidelines for TypeScript Code

This document provides guidelines for proper exception handling in TypeScript projects. These best practices are intended for both developers and as reference material for LLM-based code review agents.

## 1. Use `try-catch` Blocks Appropriately
- Use `try-catch` blocks around code that may throw exceptions, especially when dealing with asynchronous operations, external APIs, or user input.
- Avoid catching exceptions you cannot handle meaningfully.

**Example:**
```typescript
try {
  const data = await fetchData();
  process(data);
} catch (error) {
  // Handle the error appropriately
  console.error('Failed to fetch data:', error);
  throw error; // Rethrow if you cannot recover
}
```

## 2. Avoid Swallowing Errors
- Do not leave catch blocks empty or only log errors without taking action.
- If you cannot handle the error, rethrow it or propagate it up the call stack.

**Bad Example:**
```typescript
try {
  riskyOperation();
} catch (e) {
  // Do nothing
}
```

**Good Example:**
```typescript
try {
  riskyOperation();
} catch (e) {
  logger.error('Error in riskyOperation', e);
  throw e;
}
```

## 3. Use Custom Error Types
- Define and use custom error classes for application-specific errors.
- This makes error handling more precise and maintainable.

**Example:**
```typescript
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function validate(input: string) {
  if (!input) {
    throw new ValidationError('Input is required');
  }
}
```

## 4. Always Clean Up Resources
- Use `finally` blocks to release resources (e.g., close files, release locks) regardless of success or failure.

**Example:**
```typescript
let connection;
try {
  connection = await db.connect();
  // ... use connection ...
} catch (e) {
  logger.error('DB error', e);
  throw e;
} finally {
  if (connection) {
    await connection.close();
  }
}
```

## 5. Avoid Catching Non-Error Exceptions
- Only throw and catch objects that extend the `Error` class.
- Avoid throwing strings or other types.

**Bad Example:**
```typescript
throw 'Something went wrong';
```

**Good Example:**
```typescript
throw new Error('Something went wrong');
```

## 6. Provide Meaningful Error Messages
- Error messages should be descriptive and provide enough context for debugging.

**Example:**
```typescript
throw new Error(`Failed to process user ${userId}: ${reason}`);
```

## 7. Do Not Expose Sensitive Information
- Avoid logging or returning sensitive data (e.g., passwords, tokens) in error messages.

## 8. Document Expected Exceptions
- Document in function comments which exceptions may be thrown and under what conditions.

**Example:**
```typescript
/**
 * Processes a payment.
 * @throws ValidationError if payment details are invalid.
 * @throws PaymentGatewayError if the payment gateway fails.
 */
function processPayment(details: PaymentDetails) { ... }
```

---

By following these guidelines, you can ensure robust, maintainable, and secure exception handling in your TypeScript codebase.
