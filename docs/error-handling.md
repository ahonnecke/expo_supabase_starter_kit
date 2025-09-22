# Error Handling System

This document outlines the error handling approach used in the Rentinity application, particularly for blockchain transactions and API endpoints.

## Table of Contents

1. [Overview](#overview)
2. [Blockchain Transaction Error Handling](#blockchain-transaction-error-handling)
3. [API Error Response Format](#api-error-response-format)
4. [User Feedback System](#user-feedback-system)
5. [Common Error Codes](#common-error-codes)
6. [Best Practices](#best-practices)

## Overview

The Rentinity application implements a comprehensive error handling system that:

- Provides detailed error information for blockchain transactions
- Uses consistent error response formats across API endpoints
- Delivers user-friendly error messages through a notification system
- Logs errors appropriately for debugging

## Blockchain Transaction Error Handling

### Response Format

All blockchain transactions return a standardized response object:

```typescript
interface BlockchainTransactionResponse {
  hash: string;       // Transaction hash (empty if transaction failed)
  success: boolean;   // Whether the transaction was successful
  error?: string;     // Error message if transaction failed
}
```

For KYC-related operations, an extended response is used:

```typescript
interface KycStatusResponse extends BlockchainTransactionResponse {
  invalidAddresses?: string[];  // List of invalid addresses (if applicable)
}
```

### Error Types Handled

The blockchain service handles the following types of errors:

1. **Pre-transaction validation errors**:
   - Invalid addresses
   - Insufficient token balance
   - Invalid amounts
   - Wallet connection issues

2. **Transaction execution errors**:
   - User rejection (MetaMask cancellation)
   - Insufficient ETH for gas
   - Smart contract reverts
   - Network issues

3. **Post-transaction errors**:
   - Transaction confirmation failures
   - Receipt validation issues

### Example Usage

```typescript
const transferResult = await blockchainService.transferTokens(
  tokenAddress,
  recipientAddress,
  amount
);

if (!transferResult.success) {
  // Handle error using transferResult.error
} else {
  // Process successful transaction using transferResult.hash
}
```

## API Error Response Format

API endpoints use a consistent error response format:

```json
{
  "error": "Brief error title",
  "message": "Detailed user-friendly error message",
  "code": "ERROR_CODE",
  "details": {} // Optional additional error details
}
```

### Status Codes

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (resource state conflict)
- `422` - Unprocessable Entity (semantic errors)
- `500` - Internal Server Error (server-side issues)
- `503` - Service Unavailable (blockchain network issues)

## User Feedback System

The application uses a notification system to provide feedback to users:

### Components

1. **TransactionNotification**: A reusable component for displaying transaction status
2. **NotificationContainer**: Manages multiple notifications

### Notification Types

- `success` - Green background, used for successful operations
- `error` - Red background, used for failed operations
- `warning` - Yellow background, used for operations that succeeded with warnings
- `info` - Blue background, used for informational messages

### Usage

```typescript
import { addNotification } from '@rentinity/shared';

// Add a success notification
addNotification({
  type: 'success',
  title: 'Transaction Successful',
  message: 'Your tokens have been transferred successfully.',
  txHash: '0x123...',
  explorerUrl: 'https://mumbai.polygonscan.com/tx/0x123...'
});

// Add an error notification
addNotification({
  type: 'error',
  title: 'Transaction Failed',
  message: 'Insufficient balance to complete the transfer.'
});
```

## Common Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | User is not authenticated |
| `VALIDATION_ERROR` | Input validation failed |
| `INSUFFICIENT_FUNDS` | Not enough tokens or ETH |
| `CONTRACT_ERROR` | Smart contract execution error |
| `NETWORK_ERROR` | Blockchain network issue |
| `NOT_FOUND` | Resource not found |
| `ALREADY_MINTED` | Tokens already minted for this investment |
| `CONTRACT_NOT_FOUND` | Token contract not deployed |
| `PERMISSION_DENIED` | User lacks permission |
| `INTERNAL_ERROR` | Server-side error |

## Best Practices

1. **Always check for success**:
   ```typescript
   const result = await blockchainService.someOperation();
   if (!result.success) {
     // Handle error
   }
   ```

2. **Provide specific error messages**:
   - Use detailed, user-friendly error messages
   - Include actionable information when possible

3. **Include transaction links**:
   - For successful transactions, provide links to block explorers
   - Use `blockchainService.getTransactionUrl(txHash)` to generate links

4. **Handle network-specific errors**:
   - Check for network connection issues
   - Provide guidance for switching networks if needed

5. **Log errors appropriately**:
   - Log detailed errors on the server side
   - Only show user-friendly messages to the client
