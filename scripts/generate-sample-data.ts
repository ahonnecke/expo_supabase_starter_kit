#!/usr/bin/env ts-node
/**
 * Sample Data Generator for Rentinity
 * 
 * This script populates the database with sample data for testing purposes.
 * It creates:
 * - Sample properties with different statuses
 * - Sample ownership records
 * - Sample governance proposals
 * - Sample users with different roles
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Define types for our data structures
interface Property {
  id?: string;
  address: string;
  price: number;
  lease_term_months: number;
  tenant_info: Record<string, any>;
  annual_yield_percent: number;
  total_shares: number;
  status: string;
  token_contract_address?: string;
}

interface User {
  id: string;
  email: string;
  password: string;
  isAdmin: boolean;
}

interface OwnershipRecord {
  user_id: string;
  property_id: string;
  shares_owned: number;
  purchase_price_per_share: number;
  lockup_end_date: string;
  wallet_address?: string;
}

interface ProposalOption {
  title: string;
}

interface Proposal {
  title: string;
  description: string;
  proposal_type: string;
  property_id: string;
  created_by: string;
  start_date: string;
  end_date: string;
  status: string;
  options: ProposalOption[];
}

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or service role key. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey) as SupabaseClient;

// Sample data
const sampleProperties: Property[] = [
  {
    address: '123 Main St, New York, NY 10001',
    price: 1500000,
    lease_term_months: 60,
    tenant_info: { description: 'Fortune 500 company with AAA credit rating' },
    annual_yield_percent: 7.5,
    total_shares: 100000,
    status: 'active',
  },
  {
    address: '456 Park Ave, Chicago, IL 60601',
    price: 2200000,
    lease_term_months: 48,
    tenant_info: { description: 'Tech startup with 5-year lease agreement' },
    annual_yield_percent: 8.2,
    total_shares: 150000,
    status: 'active',
  },
  {
    address: '789 Ocean Blvd, Miami, FL 33139',
    price: 3100000,
    lease_term_months: 72,
    tenant_info: { description: 'Luxury retail chain with strong financials' },
    annual_yield_percent: 6.8,
    total_shares: 200000,
    status: 'active',
  },
  {
    address: '101 Mountain View, Denver, CO 80202',
    price: 1800000,
    lease_term_months: 36,
    tenant_info: { description: 'Healthcare provider with long-term contract' },
    annual_yield_percent: 7.9,
    total_shares: 120000,
    status: 'pending',
  },
  {
    address: '202 Tech Park, Austin, TX 78701',
    price: 2500000,
    lease_term_months: 60,
    tenant_info: { description: 'Software company with excellent growth' },
    annual_yield_percent: 8.5,
    total_shares: 180000,
    status: 'pending',
  },
];

// Sample users (will be created if they don't exist)
const sampleUsers: { email: string; password: string; isAdmin: boolean }[] = [
  {
    email: 'admin@rentinity.com',
    password: 'Password123!',
    isAdmin: true,
  },
  {
    email: 'investor@rentinity.com',
    password: 'Password123!',
    isAdmin: false,
  },
  {
    email: 'developer@rentinity.com',
    password: 'Password123!',
    isAdmin: true,
  },
];

// Sample governance proposals
const generateSampleProposals = (propertyIds: string[], userIds: string[]): Proposal[] => {
  return [
    {
      title: 'Renovate Lobby Area',
      description: 'Proposal to renovate the main lobby to increase property value and tenant satisfaction.',
      proposal_type: 'other',
      property_id: propertyIds[0],
      created_by: userIds[0],
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
      status: 'active',
      options: [
        { title: 'Approve Renovation' },
        { title: 'Reject Renovation' },
        { title: 'Postpone Decision' },
      ],
    },
    {
      title: 'Increase Property Insurance Coverage',
      description: 'Proposal to increase property insurance coverage due to recent market valuations.',
      proposal_type: 'other',
      property_id: propertyIds[1],
      created_by: userIds[0],
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
      status: 'active',
      options: [
        { title: 'Increase Coverage' },
        { title: 'Maintain Current Coverage' },
        { title: 'Shop for Better Rates' },
      ],
    },
    {
      title: 'Change Property Management Company',
      description: 'Proposal to evaluate and potentially change the property management company.',
      proposal_type: 'maintenance',
      property_id: propertyIds[2],
      created_by: userIds[1],
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // 21 days from now
      status: 'active',
      options: [
        { title: 'Change Management Company' },
        { title: 'Keep Current Management' },
        { title: 'Renegotiate Current Contract' },
      ],
    },
  ];
};

// Function to create sample ownership records
const generateOwnershipRecords = (propertyIds: string[], userIds: string[]): OwnershipRecord[] => {
  const records: OwnershipRecord[] = [];

  // Give the first user ownership in all properties
  for (const propertyId of propertyIds) {
    records.push({
      user_id: userIds[0],
      property_id: propertyId,
      shares_owned: Math.floor(Math.random() * 10000) + 5000, // Random between 5000-15000
      purchase_price_per_share: Math.random() * 10 + 10, // Random between $10-$20
      lockup_end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
    });
  }

  // Give the second user ownership in some properties
  for (let i = 0; i < 3; i++) {
    if (propertyIds[i]) {
      records.push({
        user_id: userIds[1],
        property_id: propertyIds[i],
        shares_owned: Math.floor(Math.random() * 8000) + 2000, // Random between 2000-10000
        purchase_price_per_share: Math.random() * 10 + 10, // Random between $10-$20
        lockup_end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days from now
      });
    }
  }

  return records;
};

// Main function to generate all sample data
async function generateSampleData() {
  try {
    console.log('Starting sample data generation...');
    
    // Get or create users
    const userIds = [];
    for (const user of sampleUsers) {
      try {
        // Try to get user by email
        const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
        
        if (userError) {
          console.error(`Error listing users:`, userError);
          continue;
        }
        
        // Find user by email
        const existingUser = userData.users.find(u => u.email === user.email);
        let userId;
        
        if (existingUser) {
          userId = existingUser.id;
          console.log(`User ${user.email} already exists with ID: ${userId}`);
          
          // Update user profile if needed
          const { data: existingProfile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId);
            
          if (!existingProfile || existingProfile.length === 0) {
            await supabase
              .from('user_profiles')
              .insert({
                id: userId,
                preferences: { isAdmin: user.isAdmin }
              });
            console.log(`Created profile for existing user ${user.email}`);
          }
        } else {
          // Create user
          const { data: newUser, error } = await supabase.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true,
          });
          
          if (error) {
            console.error(`Error creating user ${user.email}:`, error);
            continue;
          }
          
          userId = newUser.user.id;
          console.log(`Created user ${user.email} with ID: ${userId}`);
          
          // Create user profile with preferences
          await supabase
            .from('user_profiles')
            .insert({
              id: userId,
              preferences: { isAdmin: user.isAdmin }
            });
        }
        
        userIds.push(userId);
      } catch (err) {
        console.error(`Error processing user ${user.email}:`, err);
      }
    }
    
    // Create properties
    const propertyIds = [];
    for (const property of sampleProperties) {
      const { data, error } = await supabase
        .from('properties')
        .insert(property)
        .select('id');
      
      if (error) {
        console.error('Error creating property:', error);
        continue;
      }
      
      propertyIds.push(data[0].id);
      console.log(`Created property at ${property.address} with ID: ${data[0].id}`);
    }
    
    // Create ownership records
    const ownershipRecords = generateOwnershipRecords(propertyIds, userIds);
    for (const record of ownershipRecords) {
      const { error } = await supabase
        .from('ownership_ledger')
        .insert(record);
      
      if (error) {
        console.error('Error creating ownership record:', error);
        continue;
      }
      
      console.log(`Created ownership record: User ${record.user_id} owns ${record.shares_owned} shares of property ${record.property_id}`);
    }
    
    // Check if governance tables exist before creating proposals
    // Try to query the tables directly to see if they exist
    const { data: proposalsTest, error: proposalsError } = await supabase
      .from('proposals')
      .select('id')
      .limit(1);
      
    const { data: optionsTest, error: optionsError } = await supabase
      .from('proposal_options')
      .select('id')
      .limit(1);
    
    const hasGovernanceProposals = !proposalsError;
    const hasGovernanceOptions = !optionsError;
    
    if (proposalsError) console.log('Proposals table check:', proposalsError.message);
    if (optionsError) console.log('Proposal options table check:', optionsError.message);
    
    if (hasGovernanceProposals && hasGovernanceOptions) {
      // Create governance proposals
      const proposals = generateSampleProposals(propertyIds, userIds);
      for (const proposal of proposals) {
        // Create the proposal
        const { data: proposalData, error: proposalError } = await supabase
          .from('proposals')
          .insert({
            title: proposal.title,
            description: proposal.description,
            proposal_type: proposal.proposal_type,
            property_id: proposal.property_id,
            created_by: proposal.created_by,
            start_date: proposal.start_date,
            end_date: proposal.end_date,
            status: proposal.status,
          })
          .select('id');
        
        if (proposalError) {
          console.error('Error creating proposal:', proposalError);
          continue;
        }
        
        const proposalId = proposalData[0].id;
        console.log(`Created proposal "${proposal.title}" with ID: ${proposalId}`);
        
        // Create options for the proposal
        for (const option of proposal.options) {
          const { error: optionError } = await supabase
            .from('proposal_options')
            .insert({
              proposal_id: proposalId,
              title: option.title,
            });
          
          if (optionError) {
            console.error('Error creating option:', optionError);
            continue;
          }
          
          console.log(`Created option "${option.title}" for proposal ${proposalId}`);
        }
      }
    } else {
      console.log('Skipping proposals creation - tables do not exist in the database');
      if (!hasGovernanceProposals) console.log('Missing table: proposals');
      if (!hasGovernanceOptions) console.log('Missing table: proposal_options');
    }
    
    console.log('Sample data generation completed successfully!');
  } catch (error) {
    console.error('Error generating sample data:', error);
  }
}

// Run the script
generateSampleData();
