const Groq = require("groq-sdk");

const MODEL = "llama-3.3-70b-versatile";

const strategySchema = {
  type: "object",
  additionalProperties: false,
  required: ["painPoints", "opportunityAreas", "recommendedProductDirection"],
  properties: {
    painPoints: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["issue", "evidence", "priorityScore"],
        properties: {
          issue: { type: "string" },
          evidence: { type: "string" },
          priorityScore: {
            type: "integer",
            minimum: 1,
            maximum: 10
          }
        }
      }
    },
    opportunityAreas: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["area", "rationale", "priorityScore"],
        properties: {
          area: { type: "string" },
          rationale: { type: "string" },
          priorityScore: {
            type: "integer",
            minimum: 1,
            maximum: 10
          }
        }
      }
    },
    recommendedProductDirection: {
      type: "object",
      additionalProperties: false,
      required: ["headline", "summary", "nextSteps"],
      properties: {
        headline: { type: "string" },
        summary: { type: "string" },
        nextSteps: {
          type: "array",
          minItems: 3,
          maxItems: 5,
          items: { type: "string" }
        }
      }
    }
  }
};

function sendJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function extractJson(content) {
  if (!content) {
    throw new Error("The Groq response did not include structured text.");
  }

  return JSON.parse(content);
}

async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  if (!process.env.GROQ_API_KEY) {
    sendJson(response, 500, {
      error: "Missing GROQ_API_KEY. Add it to your environment before generating a brief."
    });
    return;
  }

  let body;
  try {
    body = await readBody(request);
  } catch {
    sendJson(response, 400, { error: "Invalid JSON request body." });
    return;
  }

  const feedback = String(body.feedback || "").trim();

  if (feedback.length < 30) {
    sendJson(response, 400, {
      error: "Paste at least a few sentences of customer feedback before generating a brief."
    });
    return;
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a senior product strategist. Convert customer reviews into concise, evidence-based strategy briefs. Keep language specific, commercial, and actionable. Return only valid JSON."
        },
        {
          role: "user",
          content: `Analyze this customer feedback and produce a StrategyAI brief that matches this JSON schema exactly. Include exactly 3 pain points, 3 to 5 opportunity areas, priority scores from 1 to 10 for each issue or area, and a recommended product direction.\n\nSchema:\n${JSON.stringify(strategySchema)}\n\nCustomer feedback:\n${feedback}`
        }
      ]
    });

    const content = completion.choices?.[0]?.message?.content;
    sendJson(response, 200, { brief: extractJson(content) });
  } catch (error) {
    sendJson(response, 500, {
      error: error.message || "Unable to generate a strategy brief."
    });
  }
}

module.exports = handler;
