import React, { useEffect, useMemo, useState } from "react";
import {
  Trophy,
  Users,
  Target,
  Medal,
  RefreshCw,
  CircleDollarSign,
  Flag
} from "lucide-react";

const STORAGE_KEY = "masters-pool-tracker-state";

const initialTeams = [
  {
    name: "Bwhit",
    players: [
      "Scottie Scheffler",
      "Tommy Fleetwood",
      "Cameron Young",
      "Chris Gotterup",
      "Jordan Spieth",
      "Patrick Cantlay",
      "Jake Knapp"
    ]
  },
  {
    name: "Miller",
    players: [
      "Rory McIlroy",
      "Xander Schauffele",
      "Min Woo Lee",
      "Si Woo Kim",
      "Shane Lowry",
      "Nicolai Hojgaard",
      "Sungjae Im"
    ]
  },
  {
    name: "Bridger",
    players: [
      "Ludvig Aberg",
      "Viktor Hovland",
      "Akshay Bhatia",
      "Jacob Bridgeman",
      "Sepp Straka",
      "Cameron Young",
      "John Keefer"
    ]
  },
  {
    name: "Canyon",
    players: [
      "Scottie Scheffler",
      "Justin Rose",
      "Min Woo Lee",
      "Brooks Koepka",
      "Tyrrell Hatton",
      "Max Homa",
      "Justin Thomas"
    ]
  },
  {
    name: "Smith",
    players: [
      "Jon Rahm",
      "Xander Schauffele",
      "Robert MacIntyre",
      "Si Woo Kim",
      "Jake Knapp",
      "Jason Day",
      "Bubba Watson"
    ]
  },
  {
    name: "Caleb",
    players: [
      "Hideki Matsuyama",
      "Matt Fitzpatrick",
      "Akshay Bhatia",
      "Sepp Straka",
      "Adam Scott",
      "Russell Henley",
      "Jacob Bridgeman"
    ]
  },
  {
    name: "Brody",
    players: [
      "Bryson DeChambeau",
      "Hideki Matsuyama",
      "Tommy Fleetwood",
      "Patrick Reed",
      "Corey Conners",
      "Tyrrell Hatton",
      "Russell Henley"
    ]
  },
  {
    name: "Rosty",
    players: [
      "Rory McIlroy",
      "Justin Rose",
      "Collin Morikawa",
      "Brooks Koepka",
      "Shane Lowry",
      "Jordan Spieth",
      "Patrick Cantlay"
    ]
  },
  {
    name: "Sam",
    players: [
      "Bryson DeChambeau",
      "Matt Fitzpatrick",
      "Patrick Reed",
      "Sungjae Im",
      "JJ Spaun",
      "Adam Scott",
      "Collin Morikawa"
    ]
  },
  {
    name: "Tanner",
    players: [
      "Jon Rahm",
      "Ludvig Aberg",
      "Robert MacIntyre",
      "Viktor Hovland",
      "Corey Conners",
      "JJ Spaun",
      "Cameron Smith"
    ]
  }
].map((team) => ({
  ...team,
  players: team.players.map((name) => ({
    name,
    scores: ["", "", "", ""],
    thru: ""
  }))
}));

const payoutStructure = [
  { place: "1st", amount: "$400" },
  { place: "2nd", amount: "$100" },
  { place: "3rd", amount: "$50" }
];

function parseScore(value) {
  if (value === "" || value === null || value === undefined) return null;
  const cleaned = String(value).trim();
  if (cleaned.toUpperCase() === "E") return 0;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

const NAME_ALIASES = {
  jjspaun: "jjspaun",
  johnmichaelspaun: "jjspaun",
  ludvigaberg: "ludvigaberg",
  nicolaihojgaard: "nicolaihojgaard",
  robertmacintyre: "robertmacintyre"
};

function normalizePlayerKey(name) {
  const base = normalizeName(name);
  return NAME_ALIASES[base] || base;
}

function getCumulativeScore(player, roundIndex) {
  let total = 0;
  for (let i = 0; i <= roundIndex; i += 1) {
    const val = parseScore(player.scores[i]);
    if (val !== null) total += val;
  }
  return total;
}

function getBestFourEntries(players, roundIndex) {
  return players
    .map((player, idx) => ({
      idx,
      name: player.name,
      score: getCumulativeScore(player, roundIndex)
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 4);
}

function getRoundScore(players, roundIndex) {
  return getBestFourEntries(players, roundIndex).reduce(
    (sum, entry) => sum + entry.score,
    0
  );
}

function getCompletedRounds(players) {
  let completed = 0;
  for (let roundIndex = 0; roundIndex < 4; roundIndex += 1) {
    const hasAnyRoundScore = players.some(
      (player) => parseScore(player.scores[roundIndex]) !== null
    );
    if (hasAnyRoundScore) completed += 1;
  }
  return completed;
}

function formatScore(score) {
  return score === null || score === undefined ? 0 : score;
}

function buildPlayerIndex(teams) {
  const uniquePlayers = new Map();

  teams.forEach((team) => {
    team.players.forEach((player) => {
      if (!uniquePlayers.has(player.name)) {
        uniquePlayers.set(player.name, {
          name: player.name,
          scores: [...player.scores],
          thru: player.thru || ""
        });
      }
    });
  });

  return Array.from(uniquePlayers.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

function getPlayerTeams(teams, playerName) {
  return teams
    .filter((team) => team.players.some((p) => p.name === playerName))
    .map((team) => team.name)
    .join(", ");
}

function applyEspnScoresToTeams(currentTeams, espnPlayers, currentRoundIndex) {
  const playerMap = new Map(
    espnPlayers.map((player) => [normalizePlayerKey(player.name), player])
  );

  return currentTeams.map((team) => ({
    ...team,
    players: team.players.map((player) => {
      const match = playerMap.get(normalizePlayerKey(player.name));
      if (!match) return player;

      const updatedScores = [...player.scores];
      const todayValue =
        match.today === "E" ? "0" : match.today ?? updatedScores[currentRoundIndex];

      if (todayValue !== undefined && todayValue !== null && todayValue !== "") {
        updatedScores[currentRoundIndex] = String(todayValue);
      }

      return {
        ...player,
        scores: updatedScores,
        thru: match.thru || ""
      };
    })
  }));
}

export default function App() {
  const [teams, setTeams] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : initialTeams;
    } catch {
      return initialTeams;
    }
  });

  const [activeTab, setActiveTab] = useState("standings");
  const [autoSyncEspn, setAutoSyncEspn] = useState(true);
  const [lastEspnSync, setLastEspnSync] = useState(null);
  const [espnError, setEspnError] = useState("");
  const [espnRoundIndex, setEspnRoundIndex] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
  }, [teams]);

  const fallbackRoundIndex = useMemo(() => {
    let latestRound = 0;

    teams.forEach((team) => {
      team.players.forEach((player) => {
        player.scores.forEach((score, roundIndex) => {
          if (parseScore(score) !== null) {
            latestRound = Math.max(latestRound, roundIndex);
          }
        });
      });
    });

    return latestRound;
  }, [teams]);

  const currentRoundIndex =
    typeof espnRoundIndex === "number" ? espnRoundIndex : fallbackRoundIndex;

  useEffect(() => {
    if (!autoSyncEspn) return;

    let isMounted = true;

    const syncEspnScores = async () => {
      try {
        const response = await fetch("/.netlify/functions/espn-masters");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load ESPN scores");
        }

        if (!isMounted) return;

        const incomingRoundIndex =
          typeof data.currentRoundIndex === "number"
            ? data.currentRoundIndex
            : fallbackRoundIndex;

        setEspnRoundIndex(incomingRoundIndex);

        setTeams((prev) =>
          applyEspnScoresToTeams(prev, data.players || [], incomingRoundIndex)
        );

        setLastEspnSync(new Date());
        setEspnError("");
      } catch (error) {
        if (!isMounted) return;
        setEspnError(error.message || "ESPN sync failed");
      }
    };

    syncEspnScores();
    const interval = setInterval(syncEspnScores, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [autoSyncEspn, fallbackRoundIndex]);

  const updateScore = (teamIndex, playerIndex, roundIndex, value) => {
    const cleaned = value.replace(/[^0-9E+\-]/gi, "");
    const playerName = teams[teamIndex].players[playerIndex].name;

    setTeams((prev) =>
      prev.map((team) => ({
        ...team,
        players: team.players.map((player) =>
          player.name !== playerName
            ? player
            : {
                ...player,
                scores: player.scores.map((score, rIdx) =>
                  rIdx === roundIndex ? cleaned : score
                )
              }
        )
      }))
    );
  };

  const updatePlayerScoreGlobally = (playerName, roundIndex, value) => {
    const cleaned = value.replace(/[^0-9E+\-]/gi, "");

    setTeams((prev) =>
      prev.map((team) => ({
        ...team,
        players: team.players.map((player) =>
          player.name !== playerName
            ? player
            : {
                ...player,
                scores: player.scores.map((score, rIdx) =>
                  rIdx === roundIndex ? cleaned : score
                )
              }
        )
      }))
    );
  };

  const resetScores = () => {
    const confirmed = window.confirm("Reset all scores?");
    if (!confirmed) return;
    setTeams(initialTeams);
    setEspnRoundIndex(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const rankedTeams = useMemo(() => {
    return teams
      .map((team) => ({
        ...team,
        currentScore: getRoundScore(team.players, currentRoundIndex),
        completedRounds: getCompletedRounds(team.players)
      }))
      .sort((a, b) => {
        if (a.currentScore !== b.currentScore) return a.currentScore - b.currentScore;
        return a.name.localeCompare(b.name);
      });
  }, [teams, currentRoundIndex]);

  const playerIndex = useMemo(() => buildPlayerIndex(teams), [teams]);
  const leaderboardLeader = rankedTeams[0];

  const enteredScores = teams.reduce(
    (count, team) =>
      count +
      team.players.reduce(
        (playerCount, player) =>
          playerCount + player.scores.filter((score) => score !== "").length,
        0
      ),
    0
  );

  const mastersLeaderboard = useMemo(() => {
    return playerIndex
      .map((player) => ({
        ...player,
        total: getCumulativeScore(player, currentRoundIndex),
        thru: player.thru || ""
      }))
      .sort((a, b) => a.total - b.total)
      .slice(0, 18);
  }, [playerIndex, currentRoundIndex]);

  return (
    <div className="min-h-screen bg-[#0b1c17] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[30px] border border-emerald-900/70 bg-[#123229] shadow-2xl shadow-black/30">
          <div className="border-b border-white/10 bg-gradient-to-r from-[#123229] via-[#0f2b23] to-[#123229] px-5 py-6 md:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-3xl font-black tracking-tight">
                  <Flag className="h-7 w-7 text-emerald-300" />
                  <span>Masters Pool</span>
                </div>
                <div className="text-sm font-medium text-emerald-100/80">
                  Augusta National
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-emerald-50/80">
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-medium"
                  >
                    <RefreshCw className="h-4 w-4" /> Refresh
                  </button>

                  <button
                    onClick={() => setAutoSyncEspn((prev) => !prev)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-medium"
                  >
                    {autoSyncEspn ? "ESPN Auto Sync: On" : "ESPN Auto Sync: Off"}
                  </button>

                  <button
                    onClick={resetScores}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-medium"
                  >
                    Reset Scores
                  </button>

                  <div className="rounded-full border border-white/10 bg-black/15 px-3 py-1.5">
                    {lastEspnSync
                      ? `Last sync: ${lastEspnSync.toLocaleTimeString()}`
                      : "Waiting for first sync"}
                  </div>

                  {espnError ? (
                    <div className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-red-200">
                      {espnError}
                    </div>
                  ) : (
                    <div className="rounded-full border border-white/10 bg-black/15 px-3 py-1.5">
                      Manual score entry enabled
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {payoutStructure.map((payout) => (
                  <div
                    key={payout.place}
                    className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-center"
                  >
                    <div className="text-xs uppercase tracking-[0.2em] text-emerald-100/60">
                      {payout.place}
                    </div>
                    <div className="mt-1 text-xl font-black">{payout.amount}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-b border-white/10 px-4 py-3 md:px-8">
            <div className="flex flex-wrap gap-2">
              {[
                { key: "teams", label: "Teams" },
                { key: "standings", label: "Standings" },
                { key: "player-input", label: "Player Input" }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activeTab === tab.key
                      ? "bg-white text-[#123229]"
                      : "bg-white/5 text-white/85 hover:bg-white/10"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 md:p-8">
            <div className="mb-6 grid gap-4 lg:grid-cols-[1.35fr_0.85fr]">
              <section className="rounded-[28px] border border-white/10 bg-[#173a2f] p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                      <Trophy className="h-3.5 w-3.5" /> Pool Dashboard
                    </div>
                    <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                      Live-style standings, built for your pool
                    </h1>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#123229]">
                      Automatic: Round {currentRoundIndex + 1}
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div className="rounded-[24px] border border-white/10 bg-[#173a2f] p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-50/55">
                    <Users className="h-4 w-4" /> Teams
                  </div>
                  <div className="mt-3 text-3xl font-black">{teams.length}</div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-[#173a2f] p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-50/55">
                    <Target className="h-4 w-4" /> Entries
                  </div>
                  <div className="mt-3 text-3xl font-black">{enteredScores}</div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-[#173a2f] p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-50/55">
                    <Medal className="h-4 w-4" /> Leader
                  </div>
                  <div className="mt-3 text-xl font-black">{leaderboardLeader?.name || "—"}</div>
                  <div className="mt-1 text-sm text-emerald-50/60">
                    Score {formatScore(leaderboardLeader?.currentScore)}
                  </div>
                </div>
              </section>
            </div>

            {activeTab === "standings" && (
              <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
                <section className="rounded-[28px] border border-white/10 bg-[#173a2f] p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-2xl font-black">Standings</h2>
                    <div className="rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-xs font-semibold text-emerald-50/75">
                      Automatic through Round {currentRoundIndex + 1}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-white/10">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-black/15 text-left text-xs uppercase tracking-[0.2em] text-emerald-50/55">
                          <th className="px-4 py-3">Rk</th>
                          <th className="px-4 py-3">Owner</th>
                          <th className="px-4 py-3">Strokes To Par</th>
                          <th className="px-4 py-3">Payout</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rankedTeams.map((team, index) => (
                          <tr key={team.name} className="border-t border-white/10">
                            <td className="px-4 py-3 font-bold">{index + 1}</td>
                            <td className="px-4 py-3 font-semibold">{team.name}</td>
                            <td className="px-4 py-3 font-black text-emerald-200">
                              {formatScore(team.currentScore)}
                            </td>
                            <td className="px-4 py-3 text-emerald-50/70">
                              {index === 0 ? "$400" : index === 1 ? "$100" : index === 2 ? "$50" : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="rounded-[28px] border border-white/10 bg-[#173a2f] p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-2xl font-black">Field Snapshot</h2>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-white/10">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-black/15 text-left text-xs uppercase tracking-[0.2em] text-emerald-50/55">
                          <th className="px-4 py-3">Pos</th>
                          <th className="px-4 py-3">Player</th>
                          <th className="px-3 py-3 text-center">R1</th>
                          <th className="px-3 py-3 text-center">R2</th>
                          <th className="px-3 py-3 text-center">R3</th>
                          <th className="px-3 py-3 text-center">R4</th>
                          <th className="px-3 py-3 text-center">Thru</th>
                          <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mastersLeaderboard.map((player, index) => (
                          <tr key={player.name} className="border-t border-white/10">
                            <td className="px-4 py-3 font-bold">{index + 1}</td>
                            <td className="px-4 py-3 font-semibold">{player.name}</td>
                            {player.scores.map((score, idx) => (
                              <td key={idx} className="px-3 py-3 text-center text-sm text-emerald-50/75">
                                {score === "" ? 0 : score}
                              </td>
                            ))}
                            <td className="px-3 py-3 text-center text-sm text-emerald-50/75">
                              {player.thru || "—"}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-emerald-200">
                              {formatScore(player.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "teams" && (
              <div className="space-y-6">
                {teams.map((team, teamIndex) => {
                  const countingIndexes = new Set(
                    getBestFourEntries(team.players, currentRoundIndex).map((entry) => entry.idx)
                  );

                  return (
                    <section
                      key={team.name}
                      className="overflow-hidden rounded-[28px] border border-white/10 bg-[#173a2f]"
                    >
                      <div className="border-b border-white/10 bg-black/15 px-5 py-4 md:px-6">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h3 className="text-2xl font-black tracking-tight">{team.name}</h3>
                            <p className="text-sm text-emerald-50/70">
                              Best 4 cumulative golfer totals count toward this owner.
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 text-sm">
                            <div className="rounded-full bg-white/10 px-3 py-1.5 font-semibold text-emerald-50/80">
                              Through R{currentRoundIndex + 1}: {formatScore(getRoundScore(team.players, currentRoundIndex))}
                            </div>
                            <div className="rounded-full bg-emerald-400/15 px-3 py-1.5 font-semibold text-emerald-200">
                              Tournament Total: {formatScore(getRoundScore(team.players, currentRoundIndex))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                          <thead>
                            <tr className="bg-white/5 text-left text-xs uppercase tracking-[0.2em] text-emerald-50/55">
                              <th className="px-5 py-4 md:px-6">Player</th>
                              <th className="px-3 py-4 text-center">R1</th>
                              <th className="px-3 py-4 text-center">R2</th>
                              <th className="px-3 py-4 text-center">R3</th>
                              <th className="px-3 py-4 text-center">R4</th>
                              <th className="px-3 py-4 text-center">Thru</th>
                              <th className="px-3 py-4 text-center">Total</th>
                              <th className="px-5 py-4 text-right md:px-6">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {team.players.map((player, playerIndex) => {
                              const isCounting = countingIndexes.has(playerIndex);
                              const playerTotal = getCumulativeScore(player, currentRoundIndex);

                              return (
                                <tr
                                  key={player.name}
                                  className={`border-t border-white/10 ${isCounting ? "bg-emerald-300/8" : ""}`}
                                >
                                  <td className="px-5 py-4 font-semibold md:px-6">{player.name}</td>

                                  {[0, 1, 2, 3].map((roundIndex) => (
                                    <td key={roundIndex} className="px-3 py-3 text-center">
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={player.scores[roundIndex]}
                                        onChange={(e) =>
                                          updateScore(teamIndex, playerIndex, roundIndex, e.target.value)
                                        }
                                        placeholder="0"
                                        className={`w-16 rounded-xl border px-3 py-2 text-center text-sm font-semibold outline-none transition ${
                                          roundIndex === currentRoundIndex
                                            ? "border-emerald-300/40 bg-emerald-300/10 text-white placeholder:text-emerald-100/50 focus:border-emerald-200"
                                            : "border-white/10 bg-white/5 text-white placeholder:text-emerald-50/30 focus:border-white/25"
                                        }`}
                                      />
                                    </td>
                                  ))}

                                  <td className="px-3 py-3 text-center text-sm text-emerald-50/75">
                                    {player.thru || "—"}
                                  </td>

                                  <td className="px-3 py-3 text-center font-bold text-emerald-200">
                                    {formatScore(playerTotal)}
                                  </td>

                                  <td className="px-5 py-4 text-right md:px-6">
                                    <span
                                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                                        isCounting
                                          ? "bg-emerald-400/15 text-emerald-200"
                                          : "bg-white/10 text-emerald-50/70"
                                      }`}
                                    >
                                      {isCounting ? "Counting" : "Bench"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  );
                })}
              </div>
            )}

            {activeTab === "player-input" && (
              <section className="rounded-[28px] border border-white/10 bg-[#173a2f] p-5">
                <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-50/55">
                      Player Input
                    </div>
                    <h2 className="mt-1 text-2xl font-black">Update golfer scores once</h2>
                  </div>
                  <div className="rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-50/75">
                    {playerIndex.length} unique golfers
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-white/10">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-black/15 text-left text-xs uppercase tracking-[0.2em] text-emerald-50/55">
                        <th className="px-5 py-4">Player</th>
                        <th className="px-3 py-4 text-center">R1</th>
                        <th className="px-3 py-4 text-center">R2</th>
                        <th className="px-3 py-4 text-center">R3</th>
                        <th className="px-3 py-4 text-center">R4</th>
                        <th className="px-3 py-4 text-center">Thru</th>
                        <th className="px-3 py-4 text-center">Total</th>
                        <th className="px-5 py-4 text-right">Teams</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playerIndex.map((player) => {
                        const playerTotal = getCumulativeScore(player, currentRoundIndex);
                        const playerTeams = getPlayerTeams(teams, player.name);

                        return (
                          <tr key={player.name} className="border-t border-white/10">
                            <td className="px-5 py-4 font-semibold">{player.name}</td>

                            {[0, 1, 2, 3].map((roundIndex) => (
                              <td key={roundIndex} className="px-3 py-3 text-center">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={player.scores[roundIndex]}
                                  onChange={(e) =>
                                    updatePlayerScoreGlobally(player.name, roundIndex, e.target.value)
                                  }
                                  placeholder="0"
                                  className={`w-16 rounded-xl border px-3 py-2 text-center text-sm font-semibold outline-none transition ${
                                    roundIndex === currentRoundIndex
                                      ? "border-emerald-300/40 bg-emerald-300/10 text-white placeholder:text-emerald-100/50 focus:border-emerald-200"
                                      : "border-white/10 bg-white/5 text-white placeholder:text-emerald-50/30 focus:border-white/25"
                                  }`}
                                />
                              </td>
                            ))}

                            <td className="px-3 py-3 text-center text-sm text-emerald-50/75">
                              {player.thru || "—"}
                            </td>

                            <td className="px-3 py-3 text-center font-bold text-emerald-200">
                              {formatScore(playerTotal)}
                            </td>

                            <td className="px-5 py-4 text-right text-sm text-emerald-50/70">
                              {playerTeams}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
