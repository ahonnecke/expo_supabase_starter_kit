import { createServerClient } from '@supa/supabase/src/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = createServerClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { 
      propertyId, 
      title, 
      description, 
      startDate, 
      endDate, 
      proposalType,
      options 
    } = body;
    
    // Validate required fields
    if (!propertyId || !title || !description || !startDate || !endDate || !proposalType || !options || options.length < 2) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate that user owns shares in the property
    const { data: ownership, error: ownershipError } = await supabase
      .from('ownership_ledger')
      .select('id')
      .eq('user_id', user.id)
      .eq('property_id', propertyId)
      .single();
    
    if (ownershipError || !ownership) {
      return NextResponse.json(
        { error: 'You do not own shares in this property' },
        { status: 403 }
      );
    }
    
    // Start a transaction
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .insert({
        property_id: propertyId,
        title,
        description,
        created_by: user.id,
        start_date: startDate,
        end_date: endDate,
        status: new Date(startDate) <= new Date() ? 'active' : 'draft',
        proposal_type: proposalType,
        metadata: body.metadata || {}
      })
      .select()
      .single();
    
    if (proposalError) {
      console.error('Error creating proposal:', proposalError);
      return NextResponse.json(
        { error: 'Failed to create proposal' },
        { status: 500 }
      );
    }
    
    // Create options
    const optionsToInsert = options.map((option: any) => ({
      proposal_id: proposal.id,
      title: option.title,
      description: option.description || null,
      metadata: option.metadata || {}
    }));
    
    const { data: createdOptions, error: optionsError } = await supabase
      .from('proposal_options')
      .insert(optionsToInsert)
      .select();
    
    if (optionsError) {
      console.error('Error creating proposal options:', optionsError);
      return NextResponse.json(
        { error: 'Failed to create proposal options' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      proposal,
      options: createdOptions
    });
    
  } catch (error) {
    console.error('Error creating proposal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
