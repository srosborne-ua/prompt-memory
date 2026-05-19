Testing Log

Manual test log for Prompt Memory Chrome Extension.
All tests performed in Chrome with Developer Mode enabled via chrome://extensions.

Week 1 - Skeleton and Capture

Test Environment

Browser: Chrome (Manifest V3)
OS: macOS
Extension loaded via: Load Unpacked
Sites tested: claude.ai, chatgpt.com

T-01 - Extension loads without errors

Goal: Confirm the extension loads cleanly with no manifest errors.
Steps:
Navigate to chrome://extensions
Enable Developer Mode
Click Load Unpacked, select prompt-memory folder
Check extension card for errors

Expected: Extension card appears with no error badge
Result: Pass, extension loaded with no errors

T-02 - Content script initializes on Claude

Goal: Confirm capture.js runs when navigating to claude.ai
Steps:
Navigate to claude.ai
Open DevTools console
Look for initialization log

Expected: Console shows Prompt Memory content script loaded message
Result: Pass, log appeared on page load

T-03 - Content script initializes on ChatGPT

Goal: Confirm capture.js runs when navigating to chatgpt.com
Steps:
Navigate to chatgpt.com
Open DevTools console
Look for initialization log

Expected: Console shows content script log for ChatGPT
Result: Pass, log appeared on page load

T-04 - Content script does not run on unrelated sites

Goal: Confirm extension is scoped only to Claude and ChatGPT
Steps:
Navigate to google.com
Open DevTools console
Check for logs

Expected: No Prompt Memory logs
Result: Pass, extension inactive on unrelated sites

T-05 - Background service worker starts

Goal: Confirm background.js service worker initializes correctly
Steps:
Go to chrome://extensions
Click Service Worker under Prompt Memory
Check console

Expected: Service worker startup log appears
Result: Pass, service worker started correctly

T-06 - Short messages are not captured

Goal: Confirm messages under 80 characters are ignored
Steps:
Send message: “Hello, how are you?”
Check console

Expected: No capture log
Result: Pass, short message ignored

T-07 - Long messages are captured

Goal: Confirm messages over 80 characters are saved
Steps:
Send long message about building a Chrome extension for capturing prompts
Check console

Expected: Capture log appears with preview
Result: Pass, message captured and preview shown

T-08 - Captured message persists in storage

Goal: Confirm saved messages appear in popup
Steps:
Open extension popup after T-07
Check list

Expected: Entry appears with source and timestamp
Result: Pass, entry stored correctly

T-09 - Duplicate messages are not saved twice

Goal: Confirm same message is not stored twice
Steps:
Check entry count
Reload page
Check again

Expected: No duplicate entries
Result: Pass, duplicate prevention works

T-10 - Entries persist across browser restart

Goal: Confirm storage survives restart
Steps:
Save at least one message
Close Chrome
Reopen and check popup

Expected: Entries still exist
Result: Pass, storage persisted

T-11 - Entry can be deleted from popup

Goal: Confirm delete removes entry
Steps:
Open popup
Click delete on entry
Reopen popup

Expected: Entry is gone
Result: Pass, deletion works

Week 2 - Matching Engine and Toast UI

Test Environment

Browser: Chrome (Manifest V3)
OS: macOS
Files added: matcher.js, toast.css
Prerequisite: saved entries from Week 1

T-12 - Matcher script initializes on Claude

Goal: Confirm matcher.js loads
Steps:
Reload extension
Open Claude
Check console

Expected: No errors
Result: Pass, matcher loaded

T-13 - Short input does not trigger matching

Goal: Confirm short input does nothing
Steps:
Type “hello” in input
Wait one second

Expected: No toast
Result: Pass, no toast shown

T-14 - Unrelated input does not trigger toast

Goal: Confirm no false matches
Steps:
Type unrelated long message
Wait

Expected: No toast
Result: Pass, no match triggered

T-15 - Related input triggers toast

Goal: Confirm matching works
Steps:
Type message related to saved extension prompt
Wait about 0.6 seconds

Expected: Toast appears with Inject and Dismiss
Result: Pass, correct match shown

T-16 - Toast auto dismisses after 8 seconds

Goal: Confirm timeout works
Steps:
Trigger toast
Wait

Expected: Toast disappears after 8 seconds
Result: Pass, auto dismiss works

T-17 - Dismiss button closes toast

Goal: Confirm dismiss action works
Steps:
Click Dismiss

Expected: Toast closes, no changes to input
Result: Pass, works correctly

T-18 - Inject button prepends context

Goal: Confirm context injection works
Steps:
Click Inject on toast
Check input field

Expected: Context added at start of input
Result: Pass, input preserved and context prepended

T-19 - Injected context activates send state

Goal: Confirm site recognizes injected input
Steps:
Inject context
Check send button

Expected: Send button becomes active
Result: Pass, input event triggers correctly

T-20 - Same entry is not suggested twice

Goal: Prevent repeated suggestions
Steps:
Dismiss toast
Continue typing similar text

Expected: No repeated toast immediately
Result: Pass, duplicate suggestion blocked

T-21 - Extension inactive on non AI sites

Goal: Confirm extension does not run everywhere
Steps:
Open Gmail compose window
Type long related message
Wait

Expected: No toast or logs
Result: Pass, extension inactive outside allowed sites
