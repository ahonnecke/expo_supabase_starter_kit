# Property Approval Workflow

This document explains the property approval workflow in the Rentinity platform, including how administrators can approve properties and set lockup periods.

## Overview

The property approval workflow consists of the following steps:

1. Property submission (by users or admins)
2. Admin review of property details
3. Property approval or rejection
4. Setting lockup periods for property tokens
5. Token creation (for approved properties)

## Admin Interface

### Accessing the Admin Dashboard

1. Log in as an admin user
2. Navigate to `/app/admin` to access the main admin dashboard
3. Click on "Property Listings" to view all properties

### Property Listing Page

The property listing page (`/app/admin/properties`) shows all properties in the system with the following information:

- Property address
- Price
- Expected yield
- Status (pending, active, rejected)
- Submission date
- Actions

You can filter properties by status using the filter buttons at the top of the page.

### Property Review Page

To review a property:

1. Click on the "Review" or "Edit" button next to a property in the listing
2. This takes you to the property detail page (`/app/admin/properties/[id]`)
3. Review and edit property details as needed

### Approving a Property

To approve a property:

1. On the property review page, click the "Approve" button
2. This changes the property status to "active"
3. Set a lockup end date (optional) in the "Lockup End Date" field
4. Click "Save Changes" to save the approval and lockup settings

### Setting Lockup Periods

The lockup period prevents property tokens from being transferred until after a specified date:

1. On the property review page, find the "Lockup End Date" field
2. Select a date using the date picker
3. Click "Save Changes" to apply the lockup period

### Creating Tokens

After a property is approved, you can create blockchain tokens for it:

1. On the property review page, click the "Create Blockchain Token" button
2. Wait for the token creation process to complete
3. The token contract address will be displayed in the "Blockchain Status" section

## Transaction Approval

### Accessing Transaction Requests

1. Navigate to `/app/admin/transactions` to view all transaction requests
2. This page shows pending purchase and sale requests from users

### Approving Transactions

To approve a transaction:

1. Review the transaction details (user, property, amount, shares)
2. Click the "Approve" button
3. The system will:
   - Create a transaction record
   - Update or create an ownership record
   - Set a lockup period for the tokens (60 days by default)
   - Update the request status to "approved"

### Rejecting Transactions

To reject a transaction:

1. Click the "Reject" button
2. The system will update the request status to "rejected"

## Database Schema

The property approval workflow involves the following database tables:

- `properties`: Stores property details and approval status
- `ownership_ledger`: Tracks ownership of property shares
- `transaction_requests`: Stores user requests to buy or sell shares
- `transactions`: Records completed transactions

The `lockup_end_date` field in both `properties` and `ownership_ledger` tables controls when tokens can be transferred.

## API Endpoints

The following API endpoints are used in the property approval workflow:

- `POST /api/blockchain/create-token`: Creates a blockchain token for a property
- `GET /api/properties`: Gets a list of properties
- `GET /api/properties/[id]`: Gets details for a specific property
- `PUT /api/properties/[id]`: Updates a property (including approval status)
- `GET /api/transactions/requests`: Gets a list of transaction requests
- `PUT /api/transactions/requests/[id]`: Updates a transaction request status

## Troubleshooting

### Common Issues

1. **"Could not find the 'lockup_end_date' column of 'properties'"**
   - Run the migration `0009_add_lockup_to_properties.sql` to add this column to the properties table

2. **Property status not updating**
   - Check that you have admin permissions
   - Verify that you clicked "Save Changes" after changing the status

3. **Token creation failing**
   - Ensure the property is in "active" status
   - Check that the blockchain network (Polygon Mumbai) is accessible
   - Verify that the admin wallet has sufficient funds for gas fees

## Best Practices

1. **Setting Lockup Periods**:
   - For new properties, set a reasonable lockup period (e.g., 60-90 days)
   - Consider market conditions when setting lockup periods
   - Document the reasoning for lockup period decisions

2. **Property Approval**:
   - Verify all property details before approval
   - Check that tenant information is accurate
   - Ensure the price and yield calculations are reasonable

3. **Transaction Approval**:
   - Review user KYC status before approving transactions
   - Verify that the transaction amount matches the share price
   - Check for any suspicious patterns in transaction requests
