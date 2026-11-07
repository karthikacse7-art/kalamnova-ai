
export default {
  async fetch(request) {
    const headers = {
      "Content-Type": "application/json"
    };

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers }
      );
    }

    try {
      if (!process.env.GROQ_API_KEY) {
        return new Response(
          JSON.stringify({ error: "Groq API key is missing." }),
          { status: 500, headers }
        );
      }

      const { subject, hours, examDate } = await request.json();

      if (
        typeof subject !== "string" ||
        !subject.trim() ||
        subject.length > 80 ||
        !Number.isInteger(hours) ||
        hours < 1 ||
        hours > 12 ||
        typeof examDate !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(examDate)
      ) {
        return new Response(
          JSON.stringify({ error: "Please provide valid study plan details." }),
          { status: 400, headers }
        );
      }

      const parsedDate = new Date(examDate + "T00:00:00");

      if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== examDate
      ) {
        return new Response(
          JSON.stringify({ error: "Please provide a valid exam date." }),
          { status: 400, headers }
        );
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (parsedDate < today) {
        return new Response(
          JSON.stringify({ error: "Exam date must be today or in the future." }),
          { status: 400, headers }
        );
      }

      const prompt = `
Create a SHORT, clear and practical study timetable.

SUBJECT: ${subject.trim()}
DAILY STUDY HOURS: ${hours}
EXAM DATE: ${examDate}

Follow this EXACT output structure:

📘 MY STUDY PLAN
Subject: ${subject.trim()}
Daily study time: ${hours} hours
Exam date: ${examDate}

📅 DAY 1 – [Topic name]
| Time | Activity |
| 1 | Learn the main concepts |
| 2 | Practise questions |
| 3 | Revise and test yourself |

Adjust the number of sessions to fit ${hours} hours.
Use realistic time durations and include short breaks.

For every day include:
1. Day number and topic.
2. A small timetable with time and activity.
3. Three simple tasks to complete.
4. One revision activity.

Organize the days according to the time remaining until the exam.
For longer periods, group the schedule into weekly phases.
Include a final revision and mock-test day before the exam.

Finish with:
🎯 DAILY CHECKLIST
□ Study the planned topic
□ Practise questions
□ Revise important points
□ Review mistakes

💡 EXAM TIPS
Give only 3 short, useful tips.

IMPORTANT RULES:
- Use simple student-friendly English.
- Keep each day's explanation short.
- Use clear headings and numbered days.
- Avoid long paragraphs and repeated advice.
- Never claim the student has completed a task.
- Do not create an unrealistic timetable.
`;

      const apiResponse = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-120b",
            messages: [
              {
                role: "system",
                content: "You are KALAMNOVA AI, a friendly student study planner. Always create concise, organized and realistic timetables. Follow the requested output structure."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.4,
            max_tokens: 1800
          }),
          signal: AbortSignal.timeout(25000)
        }
      );

      const data = await apiResponse.json();

      if (!apiResponse.ok) {
        return new Response(
          JSON.stringify({
            error: data.error?.message || "Study plan generation failed."
          }),
          { status: 502, headers }
        );
      }

      const plan = data.choices?.[0]?.message?.content?.trim();

      if (!plan) {
        throw new Error("No study plan received.");
      }

      return new Response(
        JSON.stringify({ plan }),
        { status: 200, headers }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error.name === "TimeoutError"
            ? "Study plan generation took too long. Please try again."
            : "Unable to generate your study plan. Please try again."
        }),
        { status: 500, headers }
      );
    }
  }
};
