"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@supa/supabase/src/auth-context";
import { ProtectedRoute } from "@supa/supabase/src/auth-middleware";
import Link from "next/link";

interface ProposalOption {
  id: string;
  title: string;
  description: string | null;
  votes: number;
  vote_count: number;
  percentage: number;
}

interface Proposal {
  id: string;
  title: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string;
  proposal_type: string;
  property: {
    id: string;
    address: string;
  };
  creator: {
    id: string;
    email: string;
  };
  created_at: string;
  updated_at: string | null;
}

interface ProposalDetails {
  proposal: Proposal;
  options: ProposalOption[];
  userVote: {
    option_id: string;
    weight: number;
  } | null;
  totalVotes: number;
}

export default function ProposalPage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute>
      <ProposalContent id={params.id} />
    </ProtectedRoute>
  );
}

function ProposalContent({ id }: { id: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proposalDetails, setProposalDetails] = useState<ProposalDetails | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [isVoting, setIsVoting] = useState(false);
  const [voteSuccess, setVoteSuccess] = useState(false);
  
  useEffect(() => {
    if (!user || !id) return;
    
    const fetchProposalDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/governance/proposals/${id}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch proposal details");
        }
        
        const data = await response.json();
        setProposalDetails(data);
        
        // Set selected option if user has already voted
        if (data.userVote) {
          setSelectedOption(data.userVote.option_id);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load proposal details");
      } finally {
        setLoading(false);
      }
    };
    
    fetchProposalDetails();
  }, [user, id]);
  
  const handleOptionChange = (optionId: string) => {
    setSelectedOption(optionId);
  };
  
  const handleVote = async () => {
    if (!selectedOption) {
      setError("Please select an option to vote");
      return;
    }
    
    try {
      setIsVoting(true);
      setError(null);
      
      const response = await fetch("/api/governance/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          proposalId: id,
          optionId: selectedOption,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit vote");
      }
      
      setVoteSuccess(true);
      
      // Refresh proposal details after voting
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to submit vote");
    } finally {
      setIsVoting(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "active":
        return { ...styles.statusBadge, ...styles.activeBadge };
      case "completed":
        return { ...styles.statusBadge, ...styles.completedBadge };
      case "draft":
        return { ...styles.statusBadge, ...styles.draftBadge };
      case "cancelled":
        return { ...styles.statusBadge, ...styles.cancelledBadge };
      default:
        return styles.statusBadge;
    }
  };
  
  const isVotingPeriodActive = () => {
    if (!proposalDetails) return false;
    
    const now = new Date();
    const startDate = new Date(proposalDetails.proposal.start_date);
    const endDate = new Date(proposalDetails.proposal.end_date);
    
    return now >= startDate && now <= endDate && proposalDetails.proposal.status === "active";
  };
  
  const styles = {
    container: {
      padding: 24,
      maxWidth: 1200,
      margin: "0 auto",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 24,
    },
    backLink: {
      display: "flex",
      alignItems: "center",
      color: "#0070f3",
      textDecoration: "none",
      fontSize: 14,
      marginBottom: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold" as "bold",
      marginBottom: 8,
    },
    propertyAddress: {
      fontSize: 14,
      color: "#666",
      marginBottom: 16,
    },
    metaInfo: {
      display: "flex",
      gap: 16,
      marginBottom: 24,
      fontSize: 14,
      color: "#666",
    },
    description: {
      marginBottom: 32,
      lineHeight: 1.6,
    },
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold" as "bold",
      marginBottom: 16,
    },
    optionsContainer: {
      marginBottom: 24,
    },
    optionCard: {
      border: "1px solid #eee",
      borderRadius: 8,
      padding: 16,
      marginBottom: 16,
      position: "relative" as "relative",
    },
    selectedOption: {
      borderColor: "#0070f3",
      backgroundColor: "#f0f7ff",
    },
    optionHeader: {
      display: "flex",
      alignItems: "center",
      marginBottom: 8,
    },
    radioInput: {
      marginRight: 12,
    },
    optionTitle: {
      fontSize: 16,
      fontWeight: "bold" as "bold",
    },
    optionDescription: {
      fontSize: 14,
      marginLeft: 24,
      color: "#444",
    },
    progressContainer: {
      marginTop: 12,
      marginLeft: 24,
    },
    progressBar: {
      height: 8,
      backgroundColor: "#eee",
      borderRadius: 4,
      marginBottom: 4,
      overflow: "hidden" as "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: "#0070f3",
    },
    progressStats: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 12,
      color: "#666",
    },
    button: {
      padding: "10px 16px",
      borderRadius: 4,
      border: "none",
      cursor: "pointer",
      fontSize: 14,
      fontWeight: "bold" as "bold",
    },
    voteButton: {
      backgroundColor: "#0070f3",
      color: "white",
    },
    disabledButton: {
      backgroundColor: "#cccccc",
      cursor: "not-allowed",
    },
    statusBadge: {
      padding: "4px 8px",
      borderRadius: 4,
      fontSize: 12,
      fontWeight: "bold" as "bold",
    },
    activeBadge: {
      backgroundColor: "#4caf50",
      color: "white",
    },
    completedBadge: {
      backgroundColor: "#2196f3",
      color: "white",
    },
    draftBadge: {
      backgroundColor: "#ff9800",
      color: "white",
    },
    cancelledBadge: {
      backgroundColor: "#f44336",
      color: "white",
    },
    votingInfo: {
      backgroundColor: "#f5f5f5",
      padding: 16,
      borderRadius: 8,
      marginBottom: 24,
    },
    votingPeriod: {
      fontWeight: "bold" as "bold",
      marginBottom: 8,
    },
    userVoteInfo: {
      backgroundColor: "#e3f2fd",
      padding: 16,
      borderRadius: 8,
      marginBottom: 24,
    },
    error: {
      color: "crimson",
      marginBottom: 16,
    },
    success: {
      color: "#4caf50",
      marginBottom: 16,
    },
  };
  
  if (loading) {
    return (
      <div style={styles.container}>
        <h1>Proposal Details</h1>
        <p>Loading proposal...</p>
      </div>
    );
  }
  
  if (error || !proposalDetails) {
    return (
      <div style={styles.container}>
        <h1>Proposal Details</h1>
        <div style={styles.error}>{error || "Failed to load proposal"}</div>
        <Link href="/app/governance" style={styles.backLink}>
          &larr; Back to Governance
        </Link>
      </div>
    );
  }
  
  const { proposal, options, userVote, totalVotes } = proposalDetails;
  const isActive = isVotingPeriodActive();
  
  return (
    <div style={styles.container}>
      <Link href="/app/governance" style={styles.backLink}>
        &larr; Back to Governance
      </Link>
      
      <div style={styles.header}>
        <h1 style={styles.title}>{proposal.title}</h1>
        <span style={getStatusBadgeStyle(proposal.status)}>
          {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
        </span>
      </div>
      
      <div style={styles.propertyAddress}>
        Property: {proposal.property.address}
      </div>
      
      <div style={styles.metaInfo}>
        <span>Type: {proposal.proposal_type.charAt(0).toUpperCase() + proposal.proposal_type.slice(1).replace("_", " ")}</span>
        <span>Created: {formatDate(proposal.created_at)}</span>
        <span>By: {proposal.creator.email}</span>
      </div>
      
      <div style={styles.votingInfo}>
        <div style={styles.votingPeriod}>
          Voting Period: {formatDate(proposal.start_date)} - {formatDate(proposal.end_date)}
        </div>
        <div>
          Total Votes: {totalVotes}
        </div>
      </div>
      
      {userVote && (
        <div style={styles.userVoteInfo}>
          <div style={styles.votingPeriod}>Your Vote</div>
          <div>
            Option: {options.find(o => o.id === userVote.option_id)?.title}
          </div>
          <div>
            Weight: {userVote.weight} votes
          </div>
        </div>
      )}
      
      <div style={styles.description}>
        {proposal.description}
      </div>
      
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Voting Options</h2>
        
        {voteSuccess && (
          <div style={styles.success}>
            Your vote has been recorded successfully! Refreshing...
          </div>
        )}
        
        {error && <div style={styles.error}>{error}</div>}
        
        <div style={styles.optionsContainer}>
          {options.map(option => (
            <div 
              key={option.id} 
              style={{
                ...styles.optionCard,
                ...(selectedOption === option.id ? styles.selectedOption : {})
              }}
            >
              <div style={styles.optionHeader}>
                {isActive && !userVote && (
                  <input
                    type="radio"
                    id={option.id}
                    name="votingOption"
                    value={option.id}
                    checked={selectedOption === option.id}
                    onChange={() => handleOptionChange(option.id)}
                    style={styles.radioInput}
                  />
                )}
                <label htmlFor={option.id} style={styles.optionTitle}>
                  {option.title}
                </label>
              </div>
              
              {option.description && (
                <div style={styles.optionDescription}>
                  {option.description}
                </div>
              )}
              
              <div style={styles.progressContainer}>
                <div style={styles.progressBar}>
                  <div 
                    style={{
                      ...styles.progressFill,
                      width: `${option.percentage}%`
                    }}
                  />
                </div>
                <div style={styles.progressStats}>
                  <span>{option.votes} votes</span>
                  <span>{option.percentage}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {isActive && !userVote && (
          <button
            onClick={handleVote}
            disabled={!selectedOption || isVoting}
            style={{
              ...styles.button,
              ...styles.voteButton,
              ...(!selectedOption || isVoting ? styles.disabledButton : {})
            }}
          >
            {isVoting ? "Submitting..." : "Submit Vote"}
          </button>
        )}
      </div>
    </div>
  );
}
