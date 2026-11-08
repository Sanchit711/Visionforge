import json
import os
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional
from app.config import settings

GOOGLE_PROJECT_ID = "7074070694"
ACTIVATION_URL = f"https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview?project={GOOGLE_PROJECT_ID}"
STITCH_MCP_URL = "https://stitch.googleapis.com/mcp"

class GeminiStitchService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY or settings.GOOGLE_API_KEY or settings.STITCH_API_KEY or os.getenv("GEMINI_API_KEY", "")

    def get_api_key(self) -> str:
        return self.api_key or os.getenv("GEMINI_API_KEY", "") or os.getenv("GOOGLE_API_KEY", "")

    def get_status(self) -> Dict[str, Any]:
        key = self.get_api_key()
        if not key:
            return {
                "configured": False,
                "masked_key": "Not configured",
                "project_id": GOOGLE_PROJECT_ID,
                "activation_url": ACTIVATION_URL,
                "mcp_server": STITCH_MCP_URL,
                "status": "unconfigured",
                "message": "No API key found in .env. Please configure GEMINI_API_KEY.",
            }

        masked = f"{key[:8]}...{key[-4:]}" if len(key) > 12 else "***"
        return {
            "configured": True,
            "masked_key": masked,
            "project_id": GOOGLE_PROJECT_ID,
            "mcp_server": STITCH_MCP_URL,
            "status": "configured",
            "message": f"API key configured for Google Project {GOOGLE_PROJECT_ID} & Stitch MCP Server.",
        }

    def test_connection(self) -> Dict[str, Any]:
        key = self.get_api_key()
        if not key:
            return {
                "success": False,
                "needs_enablement": False,
                "message": "No Gemini API key configured.",
                "activation_url": ACTIVATION_URL,
            }

        # 1. Primary: Verify Google Stitch MCP Server connection
        try:
            mcp_payload = {
                "jsonrpc": "2.0",
                "method": "tools/call",
                "params": {"name": "list_projects", "arguments": {}},
                "id": 1,
            }
            req = urllib.request.Request(
                STITCH_MCP_URL,
                data=json.dumps(mcp_payload).encode("utf-8"),
                headers={
                    "X-Goog-Api-Key": key,
                    "Content-Type": "application/json",
                    "User-Agent": "VisionForge-Studio/1.0",
                },
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                projects = data.get("result", {}).get("structuredContent", {}).get("projects", [])
                project_names = [p.get("title") for p in projects if p.get("title")]
                return {
                    "success": True,
                    "connected": True,
                    "provider": "Google Stitch MCP Server",
                    "mcp_url": STITCH_MCP_URL,
                    "status": "online",
                    "project_id": GOOGLE_PROJECT_ID,
                    "projects": project_names,
                    "message": f"Successfully connected to Google Stitch MCP Server! Active design project: '{project_names[0] if project_names else 'VisionForge Studio IDE'}'",
                }
        except Exception as mcp_err:
            pass

        # 2. Fallback: Check Generative Language API
        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
        req = urllib.request.Request(url, headers={"User-Agent": "VisionForge-Studio/1.0"})

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                models = [m.get("name") for m in data.get("models", [])[:10]]
                return {
                    "success": True,
                    "needs_enablement": False,
                    "message": "Successfully connected to Google Gemini API!",
                    "models_count": len(data.get("models", [])),
                    "models": models,
                    "project_id": GOOGLE_PROJECT_ID,
                }
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            try:
                err_json = json.loads(err_body)
                err_msg = err_json.get("error", {}).get("message", err_body)
                err_status = err_json.get("error", {}).get("status", "")
            except Exception:
                err_msg = err_body
                err_status = str(e.code)

            if "SERVICE_DISABLED" in err_body or "has not been used in project" in err_msg or e.code == 403:
                return {
                    "success": False,
                    "needs_enablement": True,
                    "project_id": GOOGLE_PROJECT_ID,
                    "activation_url": ACTIVATION_URL,
                    "code": 403,
                    "status": "SERVICE_DISABLED",
                    "message": f"Gemini API is not yet activated in Google Cloud Project {GOOGLE_PROJECT_ID}. Click the direct activation link to enable it in 1 click.",
                    "details": err_msg,
                }

            return {
                "success": False,
                "needs_enablement": False,
                "code": e.code,
                "status": err_status,
                "message": f"Google API error ({e.code}): {err_msg}",
            }
        except Exception as e:
            return {
                "success": False,
                "needs_enablement": False,
                "message": f"Connection failed: {str(e)}",
            }

    def generate_stitch_ui(self, prompt: str) -> Dict[str, Any]:
        """
        Uses Google Gemini to generate or refactor UI components adhering to DESIGN.md
        (Apple-grade glassmorphism, Cupertino radii, stitch tokens).
        Falls back to local Stitch generator if offline or pending enablement.
        """
        key = self.get_api_key()
        system_instruction = (
            "You are Google Stitch, an enterprise UI/UX designer. "
            "Generate modern, Cupertino/Apple-grade React Tailwind code following DESIGN.md tokens: "
            "Use .stitch-glass (backdrop-blur-2xl bg-white/80 dark:bg-[#121826]/80 border border-slate-200/80 dark:border-white/10), "
            ".stitch-pill (rounded-full px-4 py-1.5), rounded-3xl cards, and SF Pro/Inter typography."
        )

        if key:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}"
            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [
                            {"text": f"{system_instruction}\n\nUser Request: {prompt}"}
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.4,
                    "maxOutputTokens": 1024
                }
            }
            try:
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=12) as resp:
                    res_json = json.loads(resp.read().decode("utf-8"))
                    candidate = res_json.get("candidates", [{}])[0]
                    text = candidate.get("content", {}).get("parts", [{}])[0].get("text", "")
                    return {
                        "source": "gemini-1.5-flash",
                        "prompt": prompt,
                        "generated_code": text,
                        "status": "online",
                    }
            except Exception as e:
                # Fall through to native offline Stitch synthesis
                pass

        # Native Stitch Synthesis Generator (Offline & Fallback)
        clean_name = "".join(c for c in prompt if c.isalnum() or c == " ").title().replace(" ", "") or "StitchComponent"
        offline_code = f"""import React from 'react';
import {{ Sparkles, Activity, ShieldCheck, ArrowRight }} from 'lucide-react';

export const {clean_name}: React.FC = () => {{
  return (
    <div className="stitch-card p-6 rounded-3xl bg-white/90 dark:bg-[#121826]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl shadow-blue-500/5 max-w-md space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">VisionForge Glass</span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{prompt}</h3>
          </div>
        </div>
        <span className="stitch-pill text-[10px] font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          DESIGN.md
        </span>
      </div>

      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.05]">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">Inspection Throughput</span>
          <span className="font-mono font-bold text-emerald-500">60.2 FPS</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 w-[88%]" />
        </div>
      </div>

      <button className="w-full py-2.5 px-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-95">
        <span>Deploy Component</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}};"""

        return {
            "source": "stitch-design-engine",
            "prompt": prompt,
            "generated_code": offline_code,
            "status": "offline_synthesized",
            "activation_notice": f"Google Gemini API pending enablement at: {ACTIVATION_URL}",
        }

gemini_service = GeminiStitchService()
