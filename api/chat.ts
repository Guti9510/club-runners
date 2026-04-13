import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { question, activities } = req.body

  if (!question || !activities) {
    return res.status(400).json({ error: 'Missing question or activities' })
  }

  // Build a compact summary of activities to keep token usage low
  const summary = activities.map((a: any) => ({
    name: a.name,
    date: a.start_date_local?.slice(0, 10),
    type: a.type,
    distanceKm: +(a.distance / 1000).toFixed(2),
    durationMin: Math.round(a.moving_time / 60),
    paceMinkm: a.average_speed > 0
      ? +((1000 / a.average_speed) / 60).toFixed(2)
      : null,
    elevationM: a.total_elevation_gain,
    heartrate: a.average_heartrate ?? null,
  }))

  const systemPrompt = `You are a running coach assistant for Club Runners, a personal running dashboard.
You have access to the user's full Strava activity history. Answer questions about their runs concisely and accurately.
Use metric units (km, min/km) unless asked otherwise. Be friendly and encouraging.
Today's date is ${new Date().toISOString().slice(0, 10)}.`

  const userMessage = `Here is my running activity history (${summary.length} activities):
${JSON.stringify(summary)}

Question: ${question}`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: userMessage }],
      system: systemPrompt,
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    res.status(200).json({ answer: text })
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Failed to get answer' })
  }
}
