export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { message } = await request.json();

    if (!message || typeof message !== "string" || !message.trim()) {
      return new Response(
        JSON.stringify({ error: "Please enter a question." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-5.5",
          instructions:
            "You are KALAMNOVA AI, a friendly and patient tutor. Help school and college students understand subjects with clear explanations and examples.",
          input: message.trim(),
          max_output_tokens: 1000
        })
      }
    );

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      return new Response(
        JSON.stringify({ error: "AI service request failed. Please try again." }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const answer = (data.output || [])
      .filter(item => item.type === "message")
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text)
      .join("\n");

    return new Response(
      JSON.stringify({ answer }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
