import { Context } from '@google/adk';

/**
 * Generates a friendly Markdown filename based on the user's research topic and the current date.
 * Format: [sanitized_topic]_[DayMonthYear].md
 */
export function getFilename(callbackContext: Context): string {
    // Extract user prompt/topic
    const userPrompt =
        callbackContext.userContent?.parts
            ?.map((part) => ('text' in part ? part.text : ''))
            .join(' ')
            .trim() || '';

    // Clean up the prompt to make it a friendly filename
    let topic = userPrompt
        .toLowerCase()
        .replace(
            /\b(research|study|guide|prepare|for|about|on|can|you|please|me|a|an|the|write|create|generate|make)\b/gi,
            '',
        )
        .replace(/[^a-z0-9\s-_]/g, '')
        .trim()
        .replace(/\s+/g, '_');

    if (!topic) {
        topic = 'research';
    }

    // Format current date as DayMonthYear (e.g. 25May2026)
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const dateStr = `${day}${month}${year}`;

    return `${topic}_${dateStr}.md`;
}
