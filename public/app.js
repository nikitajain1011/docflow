const feedbackInput = document.querySelector("#feedback");
const generateButton = document.querySelector("#generate");
const sampleButton = document.querySelector("#sample");
const statusPill = document.querySelector("#status-pill");
const emptyState = document.querySelector("#empty-state");
const results = document.querySelector("#results");
const painPoints = document.querySelector("#pain-points");
const opportunities = document.querySelector("#opportunities");
const directionHeadline = document.querySelector("#direction-headline");
const directionSummary = document.querySelector("#direction-summary");
const nextSteps = document.querySelector("#next-steps");
const exampleButtons = document.querySelectorAll(".example-button");

const exampleFeedback = {
  ecommerce:
    "App crashes at checkout. Slow loading. Search is broken. Support never responds. Love the product range though.",
  saas:
    "Onboarding takes too long. API documentation is confusing. The dashboard has too many features we never use. Billing page is hard to find.",
  food:
    "Delivery always late. Driver tracking inaccurate. Refund process takes weeks. App UI is confusing for new users."
};

const sampleFeedbackOptions = Object.values(exampleFeedback);

function setStatus(label, mode = "ready") {
  statusPill.textContent = label;
  statusPill.className = `status-pill ${mode === "ready" ? "" : mode}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function scoreClass(score) {
  const numericScore = Number(score);
  if (numericScore >= 9) {
    return "score-high";
  }
  if (numericScore >= 7) {
    return "score-medium-high";
  }
  if (numericScore >= 5) {
    return "score-medium";
  }
  return "score-low";
}

function renderItems(container, items, descriptionKey) {
  container.innerHTML = items
    .map(
      (item) => `
        <article class="brief-item">
          <div class="brief-topline">
            <h3>${escapeHtml(item.issue || item.area)}</h3>
            <div class="score ${scoreClass(item.priorityScore)}">${escapeHtml(item.priorityScore)}</div>
          </div>
          <p>${escapeHtml(item[descriptionKey])}</p>
        </article>
      `
    )
    .join("");
}

function renderBrief(brief) {
  renderItems(painPoints, brief.painPoints, "evidence");
  renderItems(opportunities, brief.opportunityAreas, "rationale");

  directionHeadline.textContent = brief.recommendedProductDirection.headline;
  directionSummary.textContent = brief.recommendedProductDirection.summary;
  nextSteps.innerHTML = brief.recommendedProductDirection.nextSteps
    .map((step) => `<li>${escapeHtml(step)}</li>`)
    .join("");

  emptyState.classList.add("hidden");
  results.classList.remove("hidden");
  results.classList.remove("fade-in");
  requestAnimationFrame(() => results.classList.add("fade-in"));
}

async function generateBrief() {
  const feedback = feedbackInput.value.trim();

  if (feedback.length < 30) {
    setStatus("Needs input", "error");
    feedbackInput.focus();
    return;
  }

  generateButton.disabled = true;
  setStatus("Analyzing", "loading");

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ feedback })
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Unable to generate brief.");
    }

    renderBrief(payload.brief);
    setStatus("Complete");
  } catch (error) {
    setStatus("Error", "error");
    emptyState.classList.remove("hidden");
    results.classList.add("hidden");
    emptyState.innerHTML = `
      <h2>Something needs attention</h2>
      <p>${escapeHtml(error.message)}</p>
    `;
  } finally {
    generateButton.disabled = false;
  }
}

generateButton.addEventListener("click", generateBrief);
sampleButton.addEventListener("click", () => {
  const randomIndex = Math.floor(Math.random() * sampleFeedbackOptions.length);
  feedbackInput.value = sampleFeedbackOptions[randomIndex];
  feedbackInput.focus();
  setStatus("Ready");
});

exampleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    feedbackInput.value = exampleFeedback[button.dataset.example] || "";
    feedbackInput.focus();
    setStatus("Ready");
  });
});
