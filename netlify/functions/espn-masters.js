export async function handler() {
  const EVENT_ID = "401811941";

  const url = `https://site.web.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga&event=${EVENT_ID}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const data = await response.json();

    const competitors =
      data?.events?.[0]?.competitions?.[0]?.competitors ?? [];

    const players = competitors.map((player) => {
      const lines = player?.linescores ?? [];

      return {
        name: player?.athlete?.displayName ?? "",
        r1: lines[0]?.value ?? "",
        r2: lines[1]?.value ?? "",
        r3: lines[2]?.value ?? "",
        r4: lines[3]?.value ?? ""
      };
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ players })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}
