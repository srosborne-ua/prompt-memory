Prompt Memory
A Chrome extension that passively captures your AI conversations and surfaces relevant saved context when you start a related conversation — so you never lose the thread of a previous session.
Built with vanilla JavaScript and Chrome's Manifest V3 extension APIs.

What it does:
When you chat on Claude or ChatGPT, Prompt Memory silently saves your messages in the background. When you start a new conversation and begin typing something related, a small toast appears asking if you want to inject that previous context into your current message — no copy-pasting, no digging through old tabs.
The core loop:

You ask a detailed question about PostgreSQL on Monday
You close the tab and move on
Tuesday you open a new chat and start typing something about sql syntax
Prompt Memory detects the overlap and asks: "Inject context from a previous conversation?"
One click and your previous context is apended to your new message


Features:
Passive capture — saves your prompts automatically as you chat, no manual action needed
Keyword matching — compares what you're currently typing against saved entries using token overlap scoring
AI summarization — condenses saved AI responses via the Anthropic API before storing them, keeping context lean and useful
Non-intrusive UI — a minimal toast notification that auto-dismisses after 8 seconds if ignored
One-click injection — prepends saved context directly into the active input field
Persistent storage — saved entries survive browser restarts via chrome.storage.local
Scoped to AI sites — only activates on claude.ai and chatgpt.com, not every site you visit


Tech stack:
Chrome Extension Manifest V3 — service workers, content scripts, declarative permissions
Vanilla JavaScript — no framework dependencies
MutationObserver API — detects new messages in dynamically rendered chat UIs
chrome.storage.local — persistent local key-value storage, no backend required
Anthropic API — claude-haiku model for fast, cheap summarization of AI responses
CSS animations — toast slide-in/out transitions

