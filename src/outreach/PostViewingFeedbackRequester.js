/**
 * PostViewingFeedbackRequester.js
 * 
 * Single responsibility: Schedule polite post-viewing feedback survey prompts 2 hours after scheduled site visits.
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class PostViewingFeedbackRequester {
  constructor({ delayHours = 2 } = {}) {
    this.delayHours = delayHours;
  }

  calculateDispatchTime(viewingDateString) {
    const viewingTime = new Date(viewingDateString).getTime();
    return viewingTime + (this.delayHours * 60 * 60 * 1000);
  }

  formatFeedbackPrompt(leadFirstName = 'there', propertyTitle = 'the villa') {
    return `Hi ${leadFirstName}! Thank you for attending the viewing for ${propertyTitle} earlier today. How did you find the layout and finishes? Would you like me to share the payment breakdown or alternative floor plans?`;
  }
}

export default new PostViewingFeedbackRequester();
