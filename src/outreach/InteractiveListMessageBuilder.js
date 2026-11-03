/**
 * InteractiveListMessageBuilder.js
 * 
 * Single responsibility: Format compliant WhatsApp interactive list messages and quick-reply action buttons.
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class InteractiveListMessageBuilder {
  buildListMessage({
    title,
    description,
    buttonText = 'View Options',
    sections = [],
  }) {
    if (!title || !description) throw new Error('title and description are required');
    if (!Array.isArray(sections) || sections.length === 0) {
      throw new Error('At least one section is required for list message');
    }

    return {
      type: 'interactive_list',
      title,
      description,
      buttonText,
      sections: sections.map((sec, secIdx) => ({
        title: sec.title || `Section ${secIdx + 1}`,
        rows: (sec.rows || []).map((row, rowIdx) => ({
          id: row.id || `row_${secIdx}_${rowIdx}`,
          title: row.title,
          description: row.description || '',
        })),
      })),
    };
  }

  buildQuickReplyButtons(text, buttons = []) {
    if (!text) throw new Error('text body is required for buttons');
    if (buttons.length > 3) {
      throw new Error('WhatsApp allows maximum 3 quick reply buttons');
    }

    return {
      type: 'quick_reply',
      body: text,
      buttons: buttons.map((btn, idx) => ({
        id: btn.id || `btn_${idx}`,
        displayText: btn.displayText || btn.text,
      })),
    };
  }
}

export default new InteractiveListMessageBuilder();

