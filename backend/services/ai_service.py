"""Handles calls to the Gemini API to generate structured stock analysis."""
import json
import re
import google.generativeai as genai
from config import Config


class AIServiceError(Exception):
    pass


_configured = False


def _ensure_configured():
    global _configured
    if not Config.GEMINI_API_KEY:
        raise AIServiceError(
            "GEMINI_API_KEY is not set. Add it to your backend/.env file."
        )
    if not _configured:
        genai.configure(api_key=Config.GEMINI_API_KEY)
        _configured = True


PROMPT_TEMPLATE = """You are an equity research assistant. Using ONLY the data
provided below, produce a structured analysis of {name} ({symbol}).

DATA:
- Current Price: {price} {currency}
- Market Cap: {market_cap}
- PE Ratio: {pe_ratio}
- 52 Week High: {week_high}
- 52 Week Low: {week_low}
- Sector: {sector}
- Industry: {industry}
- Revenue Growth (YoY): {revenue_growth}
- Debt to Equity: {debt_to_equity}
- Business Summary: {summary}

Respond with STRICT JSON only, no markdown fences, no commentary, matching
this exact schema:
{{
  "companySummary": "2-3 sentence plain-English summary of what the company does and its current position",
  "bullCase": ["point 1", "point 2", "point 3"],
  "bearCase": ["point 1", "point 2", "point 3"],
  "risks": ["risk 1", "risk 2", "risk 3"],
  "keyTakeaways": ["takeaway 1", "takeaway 2", "takeaway 3"]
}}

This is for educational/informational purposes only, not financial advice.
"""


def _extract_json(text):
    text = text.strip()
    text = re.sub(r"^```json\s*|\s*```$", "", text, flags=re.MULTILINE).strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise AIServiceError("AI response did not contain valid JSON.")
    return json.loads(match.group(0))


def generate_analysis(quote):
    _ensure_configured()

    prompt = PROMPT_TEMPLATE.format(
        name=quote.get("shortName", quote["symbol"]),
        symbol=quote["symbol"],
        price=quote.get("currentPrice", "N/A"),
        currency=quote.get("currency", "USD"),
        market_cap=quote.get("marketCap", "N/A"),
        pe_ratio=quote.get("peRatio", "N/A"),
        week_high=quote.get("week52High", "N/A"),
        week_low=quote.get("week52Low", "N/A"),
        sector=quote.get("sector", "N/A"),
        industry=quote.get("industry", "N/A"),
        revenue_growth=quote.get("revenueGrowth", "N/A"),
        debt_to_equity=quote.get("debtToEquity", "N/A"),
        summary=(quote.get("longBusinessSummary") or "N/A")[:1200],
    )

    try:
        model = genai.GenerativeModel(Config.GEMINI_MODEL)
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.4,
                "max_output_tokens": 4096,
                "response_mime_type": "application/json",
            },
        )
        raw_text = response.text
    except Exception as e:
        raise AIServiceError(f"Gemini API call failed: {e}")

    if not raw_text or not raw_text.strip():
        finish_reason = None
        try:
            finish_reason = response.candidates[0].finish_reason
        except Exception:
            pass
        raise AIServiceError(
            f"Gemini returned an empty response (finish_reason={finish_reason}). "
            "Try again, or the model may have hit its token limit while thinking."
        )

    try:
        parsed = _extract_json(raw_text)
    except Exception as e:
        raise AIServiceError(f"Could not parse AI response: {e}")

    required_keys = ["companySummary", "bullCase", "bearCase", "risks", "keyTakeaways"]
    for key in required_keys:
        if key not in parsed:
            raise AIServiceError(f"AI response missing '{key}' field.")

    return parsed