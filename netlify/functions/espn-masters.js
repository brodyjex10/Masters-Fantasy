export async function handler() {
  const url = "https://www.espn.com/golf/leaderboard/_/week/7/year/2026/seasontype/2";

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5"
      }
    });

    if (!response.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to fetch ESPN page" })
      };
    }

    const html = await response.text();

    // Pull the JSON state ESPN embeds in every page
    const match = html.match(/window\['__espnfitt__'\]\s*=\s*(\{.+?\});/s) ||
                  html.match(/"competitors":(\[.+?\])/s);

    // Parse scores from the leaderboard table rows in HTML
    const playerRegex = /player\/_\/id\/\d+\/[^"]+">([^<]+)<\/a>[\s\S]*?<td[^>]*>([+\-E\d]+)<\/td>[\s\S]*?<td[^>]*>([+\-E\d]+)<\/td>[\s\S]*?<td[^>]*>([^<]*)<\/td>[\s\S]*?<td[^>]*>(\d+)<\/td>[\s\S]*?<td[^>]*>(\d+)<\/td>[\s\S]*?(?:<td[^>]*>(\d+)<\/td>)?/g;

    // Use ESPN's internal API as primary, page scrape as fallback
    const apiUrl = `https://site.web.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga&event=401811941`;
    const apiResponse = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.espn.com/",
        "Origin": "https://www.espn.com"
      }
    });

    if (!apiResponse.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "ESPN API unavailable", status: apiResponse.status })
      };
    }

    const data = await apiResponse.json();
    const competition = data?.events?.[0]?.competitions?.[0];
    const competitors = competition?.competitors ?? [];

    const normalizeGolfScore = (value) => {
      if (value === null || value === undefined || value === "" || value === "--") return "";
      const s = String(value).trim();
      if (s.toUpperCase() === "E") return "0";
      return s;
    };

    const statusPeriod = competition?.status?.period;
    const currentRoundIndex =
      typeof statusPeriod === "number" && statusPeriod >= 1 && statusPeriod <= 4
        ? statusPeriod - 1
        : 2; // default to round 3 since that's where we are

    const players = competitors.map((player) => {
      const linescores = player?.linescores ?? [];
      const r1 = normalizeGolfScore(linescores[0]?.displayValue);
      const r2 = normalizeGolfScore(linescores[1]?.displayValue);
      const r3 = normalizeGolfScore(linescores[2]?.displayValue);
      const r4 = normalizeGolfScore(linescores[3]?.displayValue);

      const statistics = player?.statistics ?? [];
      const todayStat = statistics.find(
        (stat) =>
          stat?.name?.toLowerCase?.() === "today" ||
          stat?.displayName?.toLowerCase?.() === "today"
      ) || null;
      const today = normalizeGolfScore(todayStat?.displayValue ?? todayStat?.value ?? "");

      return {
        name: player?.athlete?.displayName ?? "",
        today,
        r1, r2, r3, r4,
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
      body: JSON.stringify({ currentRoundIndex, players })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Unexpected error", details: error.message })
    };
  }
}
