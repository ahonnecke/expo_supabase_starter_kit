import { createServerClient } from '@supa/supabase/src/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
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
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const propertyId = searchParams.get('propertyId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Build query
    let query = supabase
      .from('proposals')
      .select(`
        *,
        property:properties(id, address),
        creator:created_by(id, email),
        options:proposal_options(id, title, description),
        results:proposal_results(option_id, option_title, total_votes, vote_count)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Add filters
    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    // Execute query
    const { data: proposals, error } = await query;
    
    if (error) {
      console.error('Error fetching proposals:', error);
      return NextResponse.json(
        { error: 'Failed to fetch proposals' },
        { status: 500 }
      );
    }
    
    // Get user's votes
    const { data: userVotes, error: votesError } = await supabase
      .from('votes')
      .select('proposal_id, option_id')
      .eq('user_id', user.id);
    
    if (votesError) {
      console.error('Error fetching user votes:', votesError);
    }
    
    // Map user votes to proposals
    const userVotesMap = (userVotes || []).reduce((acc: Record<string, string>, vote) => {
      acc[vote.proposal_id] = vote.option_id;
      return acc;
    }, {});
    
    // Add user's vote to each proposal
    const proposalsWithVotes = proposals?.map(proposal => ({
      ...proposal,
      userVote: userVotesMap[proposal.id] || null
    }));
    
    return NextResponse.json({
      proposals: proposalsWithVotes,
      pagination: {
        offset,
        limit,
        hasMore: (proposals?.length || 0) === limit
      }
    });
    
  } catch (error) {
    console.error('Error fetching proposals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
