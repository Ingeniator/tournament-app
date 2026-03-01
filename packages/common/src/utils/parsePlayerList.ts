/**
 * Parses a pasted player list into individual player names.
 *
 * Handles formats like:
 *   1.  🟢 Наталья Бусыгина
 *   2.  🔵 Maxim Podstrechnyy
 *   - ⊗ Ivan Evplov
 *   • Anton: some message
 */

// Status-indicator emojis commonly used in organizer lists.
// Multi-byte emojis must use alternation, not character classes.
const STATUS_EMOJI_PATTERN =
  /^\s*(?:⊗|🟢|🔵|🟠|🟡|⚫|⚪|🔴|🟣|🟤|●|○|◉|◎|✕|✗|✘|☑|☐)\s*/;

// Ordered list marker: "1." "2." etc., with optional surrounding whitespace
const ORDERED_MARKER = /^\d+[.)]\s*/;

// Unordered list markers: -, *, •, ‣
const UNORDERED_MARKER = /^[-*•‣]\s*/;

export function parsePlayerList(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map(line => {
      // Strip trailing status message after colon (e.g. "Anton: купит гараж")
      let cleaned = line.replace(/\s*:.*$/, '');

      // Trim whitespace
      cleaned = cleaned.trim();

      // Remove ordered list markers
      cleaned = cleaned.replace(ORDERED_MARKER, '');

      // Remove unordered list markers
      cleaned = cleaned.replace(UNORDERED_MARKER, '');

      // Trim again after marker removal
      cleaned = cleaned.trim();

      // Remove leading status emoji
      cleaned = cleaned.replace(STATUS_EMOJI_PATTERN, '');

      // Final trim
      return cleaned.trim();
    })
    .filter(name => name.length > 0);
}
