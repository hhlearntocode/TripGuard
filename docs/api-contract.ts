/**
 * TripGuard — API Contract
 *
 * Single source of truth for all request/response shapes exchanged between
 * frontend (React Native / Expo) and backend (FastAPI).
 *
 * Generated from audit of:
 *   backend/routers/chat.py
 *   backend/services/agent.py   (SYSTEM_PROMPT placeholders)
 *   backend/services/vision_service.py
 *   frontend/hooks/useUserProfile.ts
 *   frontend/app/(tabs)/chat.tsx
 *
 * ⚠️  Known breaking issues (see docs/api-contract.ts § KnownIssues):
 *   1. Conversation history double-send — current user turn appears twice.
 *   2. Vision sign format mismatch — agent pre-search never fires.
 */

// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

/**
 * Tool names available to the ReAct agent.
 * Defined in backend/services/tool_registry.py → TOOL_SCHEMAS.
 */
export enum ToolName {
  RetrieveLaw     = "retrieve_law",
  LookupFine      = "lookup_fine",
  GetEmergency    = "get_emergency_steps",
  WebSearch       = "web_search",
  ScrapeUrl       = "scrape_url",
}

/**
 * Law categories available in ChromaDB.
 * Used as the `category` parameter of retrieve_law.
 */
export enum LawCategory {
  Traffic   = "traffic",
  Drone     = "drone",
  Residence = "residence",
  Customs   = "customs",
  Drug      = "drug",
  Heritage  = "heritage",
}

/**
 * IDP convention type.
 * These are the EXACT string values the backend SYSTEM_PROMPT receives
 * via user_profile.idp_type and mentions by name in legal analysis.
 */
export enum IdpType {
  Vienna1968  = "1968 Vienna Convention",   // valid in Vietnam
  Geneva1949  = "1949 Geneva",              // NOT valid in Vietnam
  ASEAN       = "ASEAN",                    // valid under ASEAN agreement
  Bilateral   = "Bilateral",               // Japan, South Korea
  None        = "None",                     // no IDP / no driving
}

// ─────────────────────────────────────────────
// USER PROFILE
// ─────────────────────────────────────────────

/**
 * User profile sent to every /api/chat call via the user_profile field.
 *
 * Field names MUST match the SYSTEM_PROMPT placeholders in agent.py exactly:
 *   {nationality}, {idp_type}, {visa_free_days}, {has_drone}, {drone_model}
 *
 * Stored locally in AsyncStorage (key: "tripguard_user_profile").
 * Set by frontend/app/onboarding/profile.tsx.
 */
export interface UserProfile {
  /** Full country name, e.g. "United States", "Germany". */
  nationality: string;

  /**
   * IDP/driving convention applicable to this nationality.
   * Use IdpType enum values — these exact strings appear in the system prompt.
   */
  idp_type: IdpType | string;

  /** Number of visa-free days for this nationality (0 = e-visa required). */
  visa_free_days: number;

  /** Whether the user is travelling with a drone. */
  has_drone: boolean;

  /**
   * Drone model name, e.g. "DJI Mini 4 Pro", "DJI Air 3".
   * Use "None" when has_drone is false.
   */
  drone_model: string;
}

// ─────────────────────────────────────────────
// CONVERSATION HISTORY
// ─────────────────────────────────────────────

/**
 * A single turn in the conversation.
 * Backend expects list[dict] with exactly {role, content} — no extra fields.
 *
 * ⚠️  KNOWN BUG (double-send):
 *   chat.tsx currently maps the full `convo` array (which already includes the
 *   new user message) into conversation_history, AND sends the same message as
 *   the top-level `message` field. Backend then appends `message` again after
 *   the history → the current user turn appears TWICE in the LLM context.
 *   Fix: exclude the last user message from conversation_history.
 */
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

// ─────────────────────────────────────────────
// /api/chat
// ─────────────────────────────────────────────

/**
 * POST /api/chat
 *
 * Defined in backend/routers/chat.py → ChatRequest.
 */
export interface ChatRequest {
  /** The current user message (plain text, or text with appended vision context). */
  message: string;

  /**
   * Caller's travel profile.
   * All five fields are required — SYSTEM_PROMPT.format(**user_profile) will
   * raise KeyError if any field is missing.
   */
  user_profile: UserProfile;

  /**
   * Prior conversation turns (not including the current message).
   * Defaults to [] if omitted.
   * See ConversationMessage for the ⚠️ double-send caveat.
   */
  conversation_history?: ConversationMessage[];
}

/**
 * A single tool invocation logged by the agent.
 */
export interface ToolUsed {
  tool: ToolName | string;
  args: Record<string, unknown>;
}

/**
 * POST /api/chat — response body.
 *
 * Defined in backend/routers/chat.py → chat() return value.
 * agent.py → run_agent() return value.
 */
export interface ChatResponse {
  /**
   * The final answer text from the LLM.
   * Formatted per the RESPONSE FORMAT in the system prompt:
   *   Line 1: ✅ / ⚠️ / ❌ verdict
   *   Sections: "What the law says:", "How it applies to you:",
   *             "Consequence if violated:", "What you can do:", "Source:"
   */
  answer: string;

  /**
   * Source references collected during the agent run.
   * Contains: scraped URLs, explicit "Source: ..." lines from answer,
   * and Vietnamese decree patterns (e.g. "NĐ 168/2024/NĐ-CP Điều 5").
   *
   * ⚠️  Frontend currently does not consume this field.
   */
  sources: string[];

  /** Debug information — internal agent trace. Not intended for end-user display. */
  debug: {
    /** Human-readable log of each agent step. */
    steps: string[];
    /** List of tool invocations made during this request. */
    tools_used: ToolUsed[];
  };
}

// ─────────────────────────────────────────────
// /api/vision
// ─────────────────────────────────────────────

/**
 * POST /api/vision
 *
 * Defined in backend/routers/chat.py → VisionRequest.
 * Accepts an image and identifies it as a Vietnamese traffic sign.
 */
export interface VisionRequest {
  /**
   * Raw base64-encoded image string — NO data-URI prefix.
   * Correct:   "/9j/4AAQSkZJRg..."
   * Incorrect: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
   *
   * The backend's vision_service.py prepends "data:image/jpeg;base64," internally
   * before sending to the Gemini Flash model.
   */
  image_b64: string;
}

/**
 * POST /api/vision — response body.
 *
 * Defined in backend/services/vision_service.py → identify_sign() return value.
 * The endpoint normalises None returns to null-valued fields.
 */
export interface VisionResponse {
  /** Traffic sign code per QCVN 41:2024, e.g. "P.102". null if not a traffic sign. */
  code: string | null;

  /** Human-readable sign name, e.g. "No Entry". null if not identified. */
  name: string | null;

  /**
   * Sign category, e.g. "prohibition", "warning", "mandatory".
   * ⚠️  Frontend currently does not consume this field.
   */
  category?: string | null;

  /** Plain-language meaning/description of the sign. null if not identified. */
  meaning: string | null;
}

/**
 * The string format that must be injected into the chat message after a vision
 * call so that the agent's _SIGN_PATTERN regex triggers the pre-search.
 *
 * ⚠️  KNOWN BUG (format mismatch):
 *   chat.tsx currently formats the sign as:
 *     `- Image N: ${sign.code} ${sign.name} — ${sign.meaning}`
 *   But agent.py's _SIGN_PATTERN expects:
 *     `[Traffic sign in photo: CODE — "NAME"]`
 *   As a result, _presearch_sign() never fires and the agent's STEP 6 logic
 *   is never activated.
 *
 * Fix: format the injected string as shown below.
 *
 * @example
 *   `[Traffic sign in photo: ${sign.code} — "${sign.name}"]`
 */
export const VISION_SIGN_INJECT_FORMAT =
  '[Traffic sign in photo: {CODE} — "{NAME}"]';

// ─────────────────────────────────────────────
// /health
// ─────────────────────────────────────────────

/**
 * GET /health — liveness probe.
 * No request body.
 */
export interface HealthResponse {
  status: "ok";
}

// ─────────────────────────────────────────────
// LOCAL-ONLY TABS (no API calls)
// ─────────────────────────────────────────────

/**
 * Tabs that are purely local — they read AsyncStorage and/or hardcoded
 * constants and make NO network requests to the backend.
 *
 * Emergency tab:  reads frontend/constants/emergency.ts  (offline-safe)
 * Checklist tab:  reads AsyncStorage (user profile + chat threads)
 */
export type LocalOnlyTab = "emergency" | "checklist";

/**
 * Tabs that call the backend.
 *
 * Chat tab: calls POST /api/chat and POST /api/vision.
 */
export type BackendTab = "chat";

// ─────────────────────────────────────────────
// KNOWN ISSUES
// ─────────────────────────────────────────────

/**
 * KnownIssues — breaking mismatches found in the 2026-03-21 audit.
 *
 * 1. CONVERSATION HISTORY DOUBLE-SEND
 *    File:    frontend/app/(tabs)/chat.tsx  ~line 247–269
 *    Problem: `convo` already contains the new user message before being
 *             mapped into `conversation_history`.  Backend then appends
 *             `message` again → LLM sees the same user turn twice.
 *    Fix:     Send `convo.slice(0, -1)` (all messages except the last) as
 *             `conversation_history`, or build `history` from messages before
 *             appending the new user message.
 *
 * 2. VISION SIGN FORMAT MISMATCH
 *    File:    frontend/app/(tabs)/chat.tsx  ~line 228
 *             backend/services/agent.py     ~line 244 (_SIGN_PATTERN)
 *    Problem: Frontend formats vision result as:
 *               `- Image N: CODE NAME — MEANING`
 *             Agent regex _SIGN_PATTERN expects:
 *               `[Traffic sign in photo: CODE — "NAME"]`
 *             _presearch_sign() is therefore never called; the agent
 *             receives sign info as plain text but loses the structured
 *             pre-search enrichment (web_search + scrape_url on sign-specific
 *             legal sources before the LLM loop begins).
 *    Fix:     Change the frontend formatting line to:
 *               `[Traffic sign in photo: ${sign.code} — "${sign.name}"]`
 */
export declare const KnownIssues: unique symbol;
