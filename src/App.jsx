 import React, { useState, useEffect } from "react";

const DEFAULT_DECK = () => [
  ...Array(5).fill("1"),
  ...Array(5).fill("2"),
  ...Array(5).fill("3"),
  ...Array(5).fill("4"),
  ...Array(5).fill("5"),
  ...Array(4).fill("x2"),
  ...Array(4).fill("-1"),
  ...Array(4).fill("-2"),
  ...Array(3).fill("Nope"),
].sort(() => Math.random() - 0.5);

export default function App() {
  // --- état du jeu ---
  const [players, setPlayers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [drawPile, setDrawPile] = useState(DEFAULT_DECK());
  const [discard, setDiscard] = useState([]);
  const [total, setTotal] = useState(0);
  const [effectHistory, setEffectHistory] = useState([]);
  const [log, setLog] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [singlePlayerMode, setSinglePlayerMode] = useState(true);
  const [numPlayers, setNumPlayers] = useState(2);
  const [winner, setWinner] = useState(null);
  const [playerNames, setPlayerNames] = useState(["Joueur 1", "IA"]);
  const [modeChosen, setModeChosen] = useState(false);
  const [animatedCard, setAnimatedCard] = useState(null);
  const [totalChanged, setTotalChanged] = useState(false);
  const [totalChange, setTotalChange] = useState(null);
  const [showRules, setShowRules] = useState(false);

  // --- Démarrer / Reset ---
  const startGame = () => {
    const deck = DEFAULT_DECK();
    const hands = Array.from({ length: numPlayers }, () => deck.splice(0, 5));
    setPlayers(hands);
    setDrawPile(deck);
    setDiscard([]);
    setTotal(0);
    setEffectHistory([]);
    setLog([]);
    setCurrentPlayer(0);
    setWinner(null);
    setAnimatedCard(null);

    // Masque le menu et lance le jeu
    setGameStarted(true);
    setModeChosen(false);
    setShowRules(false);
  };

  const resetGame = () => {
    setPlayers([]);
    setDrawPile(DEFAULT_DECK());
    setDiscard([]);
    setTotal(0);
    setEffectHistory([]);
    setLog([]);
    setCurrentPlayer(0);
    setWinner(null);
    setPlayerNames(["Joueur 1", "IA"]);
    setNumPlayers(2);
    setSinglePlayerMode(true);
    setModeChosen(false);
    setAnimatedCard(null);
    setTotalChange(null);
    setGameStarted(false);
    setShowRules(false);
  };

  // --- Effets des cartes ---
  const calculateEffect = (card, history) => {
    if (!isNaN(card)) return parseInt(card);
    if (card === "-1") return -1;
    if (card === "-2") return -2;
    if (card === "x2") {
      if (!history.length) return null;
      const last = history[history.length - 1];
      if (!last || ["-1", "-2", "x2", "Nope"].includes(last.card)) return null;
      return last.value * 2;
    }
    if (card === "Nope") {
      if (!history.length) return null;
      const last = history[history.length - 1];
      return last ? -last.value : null;
    }
    return 0;
  };

  const getEffectDescription = (card, effect, history) => {
    if (!isNaN(card)) return `${effect >= 0 ? "+" : ""}${effect}`;
    if (card === "-1") return "-1";
    if (card === "-2") return "-2";
    if (card === "x2") {
      const last = history[history.length - 1];
      return last ? `Double la dernière (${last.card}=${last.value}) → ${effect}` : "";
    }
    if (card === "Nope") {
      const last = history[history.length - 1];
      return last ? `Annule (${last.card}=${last.value}) → ${effect}` : "";
    }
    return "";
  };

  const canPlay = (card) => {
    const effect = calculateEffect(card, effectHistory);
    return effect !== null && total + effect <= 21;
  };

  const playerCanPlay = (hand) => hand.some(canPlay);

  // --- Jouer une carte ---
  const playCard = (playerIndex, cardIndex) => {
    if (winner || playerIndex !== currentPlayer) return;
    const card = players[playerIndex][cardIndex];
    if (!canPlay(card)) return;

    const effect = calculateEffect(card, effectHistory);
    const newTotal = total + effect;

    // animation + feedback
    setTotalChange(effect);
    setTotalChanged(true);
    setTimeout(() => {
      setTotalChanged(false);
      setTotalChange(null);
    }, 800);

    // animation "vol" de la carte depuis sa position
    const cardElement = document.getElementById(`card-${playerIndex}-${cardIndex}`);
    const rect = cardElement ? cardElement.getBoundingClientRect() : { top: window.innerHeight / 2, left: window.innerWidth / 2, width: 60, height: 90 };
    setAnimatedCard({ card, rect, key: Date.now() });
    setTimeout(() => setAnimatedCard(null), 800);

    // mise à jour des mains/pioche/historique/log
    const newPlayers = [...players];
    newPlayers[playerIndex] = newPlayers[playerIndex].filter((_, i) => i !== cardIndex);

    const newDrawPile = [...drawPile];
    if (newPlayers[playerIndex].length < 5 && newDrawPile.length) newPlayers[playerIndex].push(newDrawPile.pop());

    const newEffectHistory = [...effectHistory];
    if (card === "Nope") newEffectHistory.pop();
    else if (!isNaN(card)) newEffectHistory.push({ type: "number", value: parseInt(card), card });
    else newEffectHistory.push({ type: "special", value: effect, card });

    const newLog = [...log];
    newLog.push(`${playerNames[playerIndex]} joue ${card} (${getEffectDescription(card, effect, newEffectHistory)}) → Total: ${newTotal}`);

    setPlayers(newPlayers);
    setDrawPile(newDrawPile);
    setEffectHistory(newEffectHistory);
    setLog(newLog);
    setDiscard([...discard, card]);
    setTotal(newTotal);

    // fin / next
    if (newTotal === 21) setWinner(`${playerNames[playerIndex]} a atteint 21 et gagne ! 🎉`);
    else if (newTotal > 21) setWinner(`${playerNames[playerIndex]} dépasse 21 et perd ! ❌`);
    else {
      let next = (currentPlayer + 1) % players.length;
      if (!playerCanPlay(newPlayers[next])) setWinner(`${playerNames[next]} ne peut plus jouer et perd ! ❌`);
      else setCurrentPlayer(next);
    }
  };

  // --- IA ---
  useEffect(() => {
    if (!singlePlayerMode || winner) return;
    if (currentPlayer === 1 && gameStarted) {
      const hand = players[1];
      if (!hand) return;
      let idx = hand.findIndex(canPlay);
      if (idx === -1) {
        setWinner(`${playerNames[1]} ne peut plus jouer et perd ! ❌`);
        return;
      }
      const timer = setTimeout(() => playCard(1, idx), 1000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, players, total, winner, effectHistory, singlePlayerMode, gameStarted]);

  // --- Styles utilitaires pour cartes (couleurs) ---
  const cardBackground = (card, disabled) => {
    if (disabled) return "#bdbdbd";
    if (!isNaN(card)) {
      // valeurs numériques -> différentes teintes
      switch (card) {
        case "1":
          return "linear-gradient(135deg,#A8E6CF,#56D7A5)";
        case "2":
          return "linear-gradient(135deg,#FFD3B6,#FFB86B)";
        case "3":
          return "linear-gradient(135deg,#FFAAA5,#FF7B7B)";
        case "4":
          return "linear-gradient(135deg,#D3C6FF,#A58CFF)";
        case "5":
          return "linear-gradient(135deg,#C7F0FF,#66D4FF)";
        default:
          return "#FFEB3B";
      }
    } else {
      // cartes spéciales
      if (card === "x2") return "linear-gradient(135deg,#F6D365,#FDA085)";
      if (card === "Nope") return "linear-gradient(135deg,#BBD2FF,#6E8BFF)";
      if (card === "-1" || card === "-2") return "linear-gradient(135deg,#FF9A9E,#FAD0C4)";
    }
    return "#FFEB3B";
  };

  const getCardStyle = (card, disabled) => ({
    width: "64px",
    height: "96px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: "10px",
    border: "2px solid rgba(0,0,0,0.3)",
    fontWeight: "bold",
    fontSize: "18px",
    cursor: disabled ? "not-allowed" : "pointer",
    boxShadow: "4px 6px 14px rgba(0,0,0,0.25)",
    margin: "6px",
    background: cardBackground(card, disabled),
    color: "#222",
    transformOrigin: "center",
    transition: "transform 0.18s, opacity 0.18s",
    opacity: disabled ? 0.5 : 1,
  });

  // input/button styles
  const inputStyle = {
    border: "2px solid #333",
    borderRadius: "12px",
    padding: "10px 15px",
    margin: "12px 0",
    width: "80%",
    fontSize: "16px",
    outline: "none",
    boxShadow: "0 3px 6px rgba(0,0,0,0.15)",
  };

  const buttonStyle = (bg) => ({
    margin: "8px",
    padding: "12px 22px",
    borderRadius: "12px",
    background: bg,
    color: "#fff",
    border: "none",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "14px",
    boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
    transition: "transform 0.14s",
  });

  return (
    <div
      style={{
        padding: 20,
        background: "linear-gradient(135deg,#89f7fe,#66a6ff)",
        minHeight: "100vh",
        fontFamily: "'Press Start 2P', cursive",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <h1
        style={{
          fontSize: 36,
          marginBottom: 12,
          color: "#fff",
          textShadow: "2px 2px 6px rgba(0,0,0,0.45)",
        }}
      >
        Nope 21
      </h1>

      {/* ===== MENU PLEIN ÉCRAN =====
          Logique:
          - Affiché si !gameStarted (on veut que le menu couvre l'écran pendant la sélection)
          - Le flux: initial -> choix Solo/Multijoueur -> saisie noms -> Démarrer
      */}
      {!gameStarted && (
        <div
          style={{
            position: "fixed",
            inset: 0, // top:0,left:0,right:0,bottom:0
            background: "linear-gradient(135deg,#141e30,#243b55)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            padding: 24,
          }}
        >
          <div
            style={{
              width: "min(920px, 96%)",
              maxWidth: 920,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 18,
              padding: 28,
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              gap: 24,
              flexDirection: "column",
              alignItems: "center",
              backdropFilter: "blur(6px)",
            }}
          >
            {!showRules && !modeChosen && (
              <>
                <h2 style={{ color: "#fff", fontSize: 28, margin: 0 }}>Choisis le mode de jeu</h2>
                <p style={{ color: "rgba(255,255,255,0.85)", marginTop: 6 }}>
                  Solo = vs IA • Multijoueur = 2 joueurs locaux
                </p>

                <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
                  <button
                    style={buttonStyle("linear-gradient(135deg,#ffb347,#ffcc33)")}
                    onClick={() => {
                      setSinglePlayerMode(true);
                      setNumPlayers(2);
                      setPlayerNames(["Joueur 1", "IA"]);
                      setModeChosen(true);
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
                    onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  >
                    Solo
                  </button>

                  <button
                    style={buttonStyle("linear-gradient(135deg,#43cea2,#185a9d)")}
                    onClick={() => {
                      setSinglePlayerMode(false);
                      setNumPlayers(2);
                      setPlayerNames(["Joueur 1", "Joueur 2"]);
                      setModeChosen(true);
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
                    onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  >
                    Multijoueur
                  </button>

                  <button
                    style={buttonStyle("linear-gradient(135deg,#6a11cb,#2575fc)")}
                    onClick={() => setShowRules(true)}
                    onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
                    onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  >
                    Règles
                  </button>
                </div>
              </>
            )}

            {showRules && (
              <div
                style={{
                  background: "rgba(255,255,255,0.95)",
                  borderRadius: 12,
                  padding: 18,
                  maxWidth: 680,
                  color: "#222",
                }}
              >
                <h3 style={{ marginTop: 0 }}>Règles rapides</h3>
                <ul style={{ lineHeight: 1.6 }}>
                  <li>Atteindre exactement 21 points pour gagner.</li>
                  <li>Cartes numériques ajoutent leur valeur.</li>
                  <li>-1 et -2 soustraient.</li>
                  <li>x2 double la dernière carte (ne fonctionne pas sur spéciales).</li>
                  <li>Nope annule la dernière carte jouée.</li>
                  <li>L'IA joue automatiquement en mode solo.</li>
                </ul>
                <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
                  <button
                    onClick={() => setShowRules(false)}
                    style={buttonStyle("#ff5722")}
                    onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
                    onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  >
                    Retour
                  </button>
                </div>
              </div>
            )}

            {modeChosen && !showRules && (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <h3 style={{ color: "#fff", marginBottom: 8 }}>Noms des joueurs</h3>
                <div style={{ width: "100%", display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 12 }}>
                  {Array.from({ length: numPlayers }).map((_, i) => (
                    <input
                      key={i}
                      value={playerNames[i] || ""}
                      onChange={(e) => {
                        const names = [...playerNames];
                        names[i] = e.target.value;
                        setPlayerNames(names);
                      }}
                      placeholder={`Joueur ${i + 1}`}
                      style={{ ...inputStyle, maxWidth: 300 }}
                    />
                  ))}
                </div>

                <div style={{ marginTop: 12 }}>
                  <button
                    onClick={startGame}
                    style={buttonStyle("linear-gradient(135deg,#ff512f,#dd2476)")}
                    onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
                    onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  >
                    Démarrer
                  </button>

                  <button
                    onClick={() => {
                      setModeChosen(false);
                      setPlayerNames(["Joueur 1", singlePlayerMode ? "IA" : "Joueur 2"]);
                    }}
                    style={{ ...buttonStyle("rgba(255,255,255,0.12)"), marginLeft: 10 }}
                  >
                    Retour
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== AFFICHAGE DU JEU ===== */}
      {gameStarted && (
        <div style={{ width: "100%", maxWidth: 1100, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          {/* Total */}
          <div style={{ position: "relative", marginTop: 6 }}>
            <h2
              style={{
                fontSize: 26,
                fontWeight: "700",
                color: "#fff",
                textShadow: "2px 2px 6px rgba(0,0,0,0.45)",
                transform: totalChanged ? "scale(1.12)" : "scale(1)",
                transition: "transform 0.2s",
              }}
            >
              Total: {total}
            </h2>
            {totalChange !== null && (
              <div
                style={{
                  position: "absolute",
                  top: -28,
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontWeight: "700",
                  fontSize: 18,
                  color: totalChange > 0 ? "#9AE6A0" : "#FF9AA2",
                  textShadow: "1px 1px 4px rgba(0,0,0,0.4)",
                  animation: "pointChange 0.8s forwards",
                }}
              >
                {totalChange > 0 ? `+${totalChange}` : totalChange}
              </div>
            )}
          </div>

          {/* Deck info */}
          <p style={{ color: "#fff", fontWeight: 700 }}>Cartes restantes: {drawPile.length}</p>

          {/* Winner */}
          {winner && (
            <div style={{ textAlign: "center" }}>
              <h3 style={{ color: "#ffd166" }}>{winner}</h3>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={resetGame} style={buttonStyle("#4CAF50")}>
                  Retour au menu
                </button>
              </div>
            </div>
          )}

          {/* Zones des joueurs */}
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start", width: "100%" }}>
            {players.map((hand, i) => (
              <div key={i} style={{ minWidth: 160, background: "#fff", padding: 12, borderRadius: 10, boxShadow: "0 6px 16px rgba(0,0,0,0.12)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <h4 style={{ margin: 0 }}>{playerNames[i]}</h4>
                  <div style={{ fontSize: 12, color: "#666" }}>{i === currentPlayer && !winner ? "À toi" : ""}</div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
                  {hand.map((card, j) => {
                    const hidden = singlePlayerMode && i === 1; // cacher main IA en solo
                    const disabled = i !== currentPlayer || !canPlay(card) || winner;
                    return (
                      <div
                        id={`card-${i}-${j}`}
                        key={j}
                        onClick={() => (!disabled && !winner ? playCard(i, j) : null)}
                        style={{
                          ...getCardStyle(card, disabled),
                          cursor: disabled ? "not-allowed" : "pointer",
                          transform: disabled ? "none" : undefined,
                        }}
                      >
                        {hidden ? "?" : card}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Animated flying card */}
          {animatedCard && (
            <div
              style={{
                position: "fixed",
                top: animatedCard.rect.top,
                left: animatedCard.rect.left,
                width: animatedCard.rect.width,
                height: animatedCard.rect.height,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                borderRadius: 10,
                background: "#FFD700",
                fontWeight: "700",
                fontSize: 18,
                border: "2px solid #333",
                zIndex: 2000,
                animation: "flyCard 0.8s forwards",
              }}
            >
              {animatedCard.card}
            </div>
          )}

          {/* Log / journal */}
          <div style={{ width: "95%", maxWidth: 820, background: "#fff", borderRadius: 10, padding: 12, marginTop: 12, boxShadow: "0 6px 14px rgba(0,0,0,0.08)" }}>
            <h4 style={{ margin: "0 0 8px 0" }}>Historique</h4>
            <div style={{ maxHeight: 160, overflowY: "auto" }}>
              {log.map((entry, idx) => (
                <div key={idx} style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: "black" }}>{entry}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Keyframes & small CSS declarations */}
      <style>{`
        @keyframes flyCard {
          0% { transform: translate(0,0) scale(1); opacity: 1; }
          50% { transform: translate(0, -80px) rotate(12deg) scale(1.08); opacity: 1; }
          100% { transform: translate(${window.innerWidth / 2 - 50}px, 120px) scale(0.5); opacity: 0; }
        }
        @keyframes pointChange {
          0% { opacity: 1; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-18px); }
          100% { opacity: 0; transform: translateY(-36px); }
        }
      `}</style>
    </div>
  );
}
