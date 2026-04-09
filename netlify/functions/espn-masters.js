export async function handler() {
  const EVENT_ID = "401811941";
  const url = `https://site.web.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga&event=${EVENT_ID}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    if (!response.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to fetch ESPN data" })
      };
    }

    const data = await response.json();

    const competitors =
      data?.events?.[0]?.competitions?.[0]?.competitors ?? [];

    const normalizeGolfScore = (value) => {
      if (value === null || value === undefined || value === "" || value === "--") {
        return "";
      }

      const s = String(value).trim();

      if (s === "E") return "0";
      return s;
    };

    const players = competitors.map((player) => {
      const lines = player?.linescores ?? [];

      return {
        name: player?.athlete?.displayName ?? "",

        // Per-round score relative to par, not raw strokes
        r1: normalizeGolfScore(lines[0]?.displayValue ?? lines[0]?.value),
        r2: normalizeGolfScore(lines[1]?.displayValue ?? lines[1]?.value),
        r3: normalizeGolfScore(lines[2]?.displayValue ?? lines[2]?.value),
        r4: normalizeGolfScore(lines[3]?.displayValue ?? lines[3]?.value),

        // Tournament total relative to par
        total: normalizeGolfScore(player?.score?.displayValue),

        // Current round relative to par, if ESPN exposes it
        today:
          normalizeGolfScore(
            player?.statistics?.find?.((s) => s?.name === "today")?.displayValue
          ) || "",

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
        "Cache-Control": "public, max-age=300"
      },
      body: JSON.stringify({ players })
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
