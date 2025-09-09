"use client";

import { useWallet } from "@rentinity/blockchain/src/wallet-context";

export default function WalletConnect() {
  const {
    isConnected,
    address,
    chainId,
    balance,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    error,
  } = useWallet();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const isCorrectNetwork = chainId === 80001; // Polygon Mumbai

  const styles = {
    container: {
      display: "flex",
      alignItems: "center",
      gap: 16,
    },
    button: {
      padding: "8px 16px",
      border: "none",
      borderRadius: 8,
      cursor: "pointer",
      fontSize: 14,
      fontWeight: "bold",
    },
    connectButton: {
      backgroundColor: "#0070f3",
      color: "white",
    },
    disconnectButton: {
      backgroundColor: "#f44336",
      color: "white",
    },
    switchNetworkButton: {
      backgroundColor: "#ff9800",
      color: "white",
    },
    walletInfo: {
      display: "flex",
      flexDirection: "column" as "column",
      alignItems: "flex-end",
      fontSize: 12,
      color: "#666",
    },
    error: {
      color: "#f44336",
      fontSize: 12,
      marginTop: 4,
    },
    networkBadge: {
      padding: "2px 8px",
      borderRadius: 4,
      fontSize: 10,
      fontWeight: "bold",
      marginLeft: 8,
    },
    correctNetwork: {
      backgroundColor: "#4caf50",
      color: "white",
    },
    wrongNetwork: {
      backgroundColor: "#f44336",
      color: "white",
    },
  };

  if (!isConnected) {
    return (
      <div style={styles.container}>
        <button
          onClick={connectWallet}
          style={{ ...styles.button, ...styles.connectButton }}
        >
          Connect Wallet
        </button>
        {error && <div style={styles.error}>{error}</div>}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.walletInfo}>
        <div>
          {formatAddress(address!)}
          <span
            style={{
              ...styles.networkBadge,
              ...(isCorrectNetwork ? styles.correctNetwork : styles.wrongNetwork),
            }}
          >
            {chainId === 80001 ? "Mumbai" : `Chain ${chainId}`}
          </span>
        </div>
        <div>{balance ? `${parseFloat(balance).toFixed(4)} MATIC` : ""}</div>
      </div>

      {!isCorrectNetwork && (
        <button
          onClick={() => switchNetwork(80001)}
          style={{ ...styles.button, ...styles.switchNetworkButton }}
        >
          Switch to Mumbai
        </button>
      )}

      <button
        onClick={disconnectWallet}
        style={{ ...styles.button, ...styles.disconnectButton }}
      >
        Disconnect
      </button>

      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
}
