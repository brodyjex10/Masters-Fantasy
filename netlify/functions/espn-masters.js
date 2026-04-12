export async function handler() {
  const EVENT_ID = "401811941";
  const url = `https://site.web.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga&event=${EVENT_ID}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.espn.com/",
        "Origin": "https://www.espn.com"
      }
    });

    if (!response.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to fetch ESPN data" })
      };
    }

    const data = await response.json();
    const competition = data?.events?.[0]?.competitions?.[0];
    const competitors = competition?.competitors ?? [];

    const normalizeGolfScore = (value) => {
      if (value === null || value === undefined || value === "" || value === "--") {
        return "";
      }
      const s = String(value).trim();
      if (s.toUpperCase() === "E") return "0";
      return s;
    };

    const statusPeriod = competition?.status?.period;
    const currentRoundIndex =
      typeof statusPeriod === "number" && statusPeriod >= 1 && statusPeriod <= 4
        ? statusPeriod - 1
        : 0;

    const players = competitors.map((player) => {
      const statistics = player?.statistics ?? [];
      const linescores = player?.linescores ?? [];

      const todayStat = statistics.find(
        (stat) =>
          stat?.name?.toLowerCase?.() === "today" ||
          stat?.displayName?.toLowerCase?.() === "today"
      ) || null;

      const today = normalizeGolfScore(
        todayStat?.displayValue ?? todayStat?.value ?? ""
      );

      return {
        name: player?.athlete?.displayName ?? "",
        today,
        r1: normalizeGolfScore(linescores[0]?.displayValue),
        r2: normalizeGolfScore(linescores[1]?.displayValue),
        r3: normalizeGolfScore(linescores[2]?.displayValue),
        r4: normalizeGolfScore(linescores[3]?.displayValue),
        total: normalizeGolfScore(player?.score?.displayValue ?? ""),
        thru:
          player?.status?.thru ??
          player?.status?.displayValue ??
          player?.status?.type?.shortDetail ??
          ""
      };
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60"
      },
      body: JSON.stringify({
        currentRoundIndex,
        players
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Unexpected ESPN fetch error",
        details: error.message
      })
    };
  }
}
