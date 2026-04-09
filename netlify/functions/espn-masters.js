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
      // ESPN leaderboard semantics:
      // score.displayValue = tournament score to par
      // statistics/today = current round score to par
      // R1-R4 on ESPN page are raw strokes, so don't use them as your fantasy inputs

      const todayStat =
        player?.statistics?.find?.(
          (s) =>
            s?.name?.toLowerCase?.() === "today" ||
            s?.displayName?.toLowerCase?.() === "today"
        ) || null;

      const today = normalizeGolfScore(
        todayStat?.displayValue ?? todayStat?.value ?? ""
      );

      return {
        name: player?.athlete?.displayName ?? "",
        total: normalizeGolfScore(player?.score?.displayValue ?? ""),
        today,
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
