/**
 * LINDA CONVERSATION LEARNER
 * ═══════════════════════════════════════════════════════════════════════════
 * Logs conversations and commands for ML training and analytics
 * 
 * Responsibilities:
 * 1. Log all conversations (user → Linda)
 * 2. Track command usage and outcomes
 * 3. Store user feedback for training
 * 4. Log learning patterns for future improvements
 * 5. Provide analytics and statistics
 * 
 * Data Stored (JSON files):
 * - conversations.jsonl - Line-delimited conversation logs
 * - commands.jsonl - Command usage and execution logs
 * - feedback.jsonl - User feedback for improvement
 * - learning.jsonl - Learned patterns for ML
 * - statistics.json - Aggregated statistics
 * 
 * Architecture: Append-only logs with periodic statistics aggregation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class LindaConversationLearner {
  constructor() {
    this.logsDir = path.join(__dirname, '..', '..', 'logs');
    this.conversationFile = path.join(this.logsDir, 'conversations.jsonl');
    this.commandFile = path.join(this.logsDir, 'commands.jsonl');
    this.feedbackFile = path.join(this.logsDir, 'feedback.jsonl');
    this.learningFile = path.join(this.logsDir, 'learning.jsonl');
    this.statsFile = path.join(this.logsDir, 'statistics.json');

    this.initializeLogs();
  }

  /**
   * Ensure logs directory exists
   */
  initializeLogs() {
    try {
      if (!fs.existsSync(this.logsDir)) {
        fs.mkdirSync(this.logsDir, { recursive: true });
      }

      // Initialize files if they don't exist
      for (const file of [
        this.conversationFile,
        this.commandFile,
        this.feedbackFile,
        this.learningFile
      ]) {
        if (!fs.existsSync(file)) {
          fs.writeFileSync(file, '');
        }
      }

      // Initialize statistics
      if (!fs.existsSync(this.statsFile)) {
        fs.writeFileSync(this.statsFile, JSON.stringify({
          totalMessages: 0,
          totalCommands: 0,
          totalFeedback: 0,
          totalLearned: 0,
          uniqueUsers: new Set(),
          commandStats: {},
          categoryStats: {},
          lastUpdated: new Date().toISOString()
        }, null, 2));
      }
    } catch (error) {
      console.error(`Failed to initialize conversation logs: ${error.message}`);
    }
  }

  /**
   * Log a conversation
   */
  async logConversation(data) {
    try {
      const logEntry = {
        timestamp: data.timestamp || new Date().toISOString(),
        phoneNumber: data.phoneNumber,
        message: data.message,
        isFromUser: data.isFromUser,
        chatId: data.chatId,
        messageId: data.messageId,
        length: data.message?.length || 0
      };

      await this.appendToFile(this.conversationFile, logEntry);
      await this.updateStatistics({ conversations: 1, user: data.phoneNumber });
    } catch (error) {
      console.error(`Failed to log conversation: ${error.message}`);
    }
  }

  /**
   * Log a command execution
   */
  async logCommand(data) {
    try {
      const logEntry = {
        timestamp: data.timestamp || new Date().toISOString(),
        phoneNumber: data.phoneNumber,
        command: data.command,
        args: data.args || [],
        success: data.success,
        chatId: data.chatId
      };

      await this.appendToFile(this.commandFile, logEntry);
      await this.updateStatistics({ commands: 1, user: data.phoneNumber });
    } catch (error) {
      console.error(`Failed to log command: ${error.message}`);
    }
  }

  /**
   * Log user feedback
   */
  async logFeedback(data) {
    try {
      const logEntry = {
        timestamp: data.timestamp || new Date().toISOString(),
        phoneNumber: data.phoneNumber,
        messageId: data.messageId,
        sentiment: data.sentiment, // 'positive' or 'negative'
        comment: data.comment,
        chatId: data.chatId
      };

      await this.appendToFile(this.feedbackFile, logEntry);
      await this.updateStatistics({ feedback: 1, user: data.phoneNumber });
    } catch (error) {
      console.error(`Failed to log feedback: ${error.message}`);
    }
  }

  /**
   * Log a learning pattern
   */
  async logLearning(data) {
    try {
      const logEntry = {
        timestamp: data.timestamp || new Date().toISOString(),
        phoneNumber: data.phoneNumber,
        question: data.question,
        answer: data.answer,
        source: data.source || 'user', // 'user', 'admin', 'system'
        confidence: data.confidence || 1.0
      };

      await this.appendToFile(this.learningFile, logEntry);
      await this.updateStatistics({ learning: 1, user: data.phoneNumber });
    } catch (error) {
      console.error(`Failed to log learning: ${error.message}`);
    }
  }

  /**
   * Append a JSON object to a JSONL file
   */
  async appendToFile(filePath, data) {
    return new Promise((resolve, reject) => {
      try {
        const line = JSON.stringify(data) + '\n';
        fs.appendFileSync(filePath, line);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Update statistics file
   */
  async updateStatistics(updates) {
    try {
      // Read current stats
      let stats = {
        totalMessages: 0,
        totalCommands: 0,
        totalFeedback: 0,
        totalLearned: 0,
        uniqueUsers: [],
        commandStats: {},
        categoryStats: {},
        lastUpdated: new Date().toISOString()
      };

      if (fs.existsSync(this.statsFile)) {
        const content = fs.readFileSync(this.statsFile, 'utf-8');
        if (content) {
          stats = JSON.parse(content);
        }
      }

      // Update counts
      if (updates.conversations) {
        stats.totalMessages = (stats.totalMessages || 0) + updates.conversations;
      }
      if (updates.commands) {
        stats.totalCommands = (stats.totalCommands || 0) + updates.commands;
      }
      if (updates.feedback) {
        stats.totalFeedback = (stats.totalFeedback || 0) + updates.feedback;
      }
      if (updates.learning) {
        stats.totalLearned = (stats.totalLearned || 0) + updates.learning;
      }

      // Track unique users
      if (updates.user) {
        if (!stats.uniqueUsers.includes(updates.user)) {
          stats.uniqueUsers.push(updates.user);
        }
      }

      stats.lastUpdated = new Date().toISOString();

      // Write back
      fs.writeFileSync(this.statsFile, JSON.stringify(stats, null, 2));
    } catch (error) {
      console.error(`Failed to update statistics: ${error.message}`);
    }
  }

  /**
   * Get aggregated statistics
   */
  async getStatistics() {
    try {
      if (!fs.existsSync(this.statsFile)) {
        return {
          totalMessages: 0,
          totalCommands: 0,
          totalFeedback: 0,
          learnedPatterns: 0,
          uniqueUsers: 0,
          feedbackCount: 0
        };
      }

      const stats = JSON.parse(fs.readFileSync(this.statsFile, 'utf-8'));
      return {
        totalMessages: stats.totalMessages || 0,
        totalCommands: stats.totalCommands || 0,
        totalFeedback: stats.totalFeedback || 0,
        learnedPatterns: stats.totalLearned || 0,
        uniqueUsers: (stats.uniqueUsers || []).length,
        feedbackCount: stats.totalFeedback || 0,
        lastUpdated: stats.lastUpdated
      };
    } catch (error) {
      console.error(`Failed to get statistics: ${error.message}`);
      return {};
    }
  }

  /**
   * Get recent conversations
   */
  async getRecentConversations(limit = 50) {
    return this.readLastNLines(this.conversationFile, limit);
  }

  /**
   * Get recent commands
   */
  async getRecentCommands(limit = 50) {
    return this.readLastNLines(this.commandFile, limit);
  }

  /**
   * Get recent feedback
   */
  async getRecentFeedback(limit = 50) {
    return this.readLastNLines(this.feedbackFile, limit);
  }

  /**
   * Get learned patterns
   */
  async getLearnedPatterns(limit = 50) {
    return this.readLastNLines(this.learningFile, limit);
  }

  /**
   * Get conversations from a specific user
   */
  async getUserConversations(phoneNumber, limit = 100) {
    try {
      if (!fs.existsSync(this.conversationFile)) {
        return [];
      }

      const lines = fs.readFileSync(this.conversationFile, 'utf-8')
        .split('\n')
        .filter(line => line.trim());

      return lines
        .map(line => JSON.parse(line))
        .filter(entry => entry.phoneNumber === phoneNumber)
        .slice(-limit);
    } catch (error) {
      console.error(`Failed to get user conversations: ${error.message}`);
      return [];
    }
  }

  /**
   * Get most common questions (for ML training)
   */
  async getMostCommonQuestions(limit = 20) {
    try {
      if (!fs.existsSync(this.learningFile)) {
        return [];
      }

      const lines = fs.readFileSync(this.learningFile, 'utf-8')
        .split('\n')
        .filter(line => line.trim());

      const questions = {};
      lines.forEach(line => {
        const entry = JSON.parse(line);
        questions[entry.question] = (questions[entry.question] || 0) + 1;
      });

      return Object.entries(questions)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([question, count]) => ({ question, count }));
    } catch (error) {
      console.error(`Failed to get common questions: ${error.message}`);
      return [];
    }
  }

  /**
   * Get feedback summary
   */
  async getFeedbackSummary() {
    try {
      if (!fs.existsSync(this.feedbackFile)) {
        return { positive: 0, negative: 0, ratio: 0 };
      }

      const lines = fs.readFileSync(this.feedbackFile, 'utf-8')
        .split('\n')
        .filter(line => line.trim());

      let positive = 0;
      let negative = 0;

      lines.forEach(line => {
        const entry = JSON.parse(line);
        if (entry.sentiment === 'positive') {
          positive++;
        } else if (entry.sentiment === 'negative') {
          negative++;
        }
      });

      const total = positive + negative;
      const ratio = total > 0 ? Math.round((positive / total) * 100) : 0;

      return { positive, negative, ratio, total };
    } catch (error) {
      console.error(`Failed to get feedback summary: ${error.message}`);
      return {};
    }
  }

  /**
   * Read last N lines from a file
   */
  readLastNLines(filePath, limit = 50) {
    try {
      if (!fs.existsSync(filePath)) {
        return [];
      }

      const lines = fs.readFileSync(filePath, 'utf-8')
        .split('\n')
        .filter(line => line.trim());

      return lines
        .slice(-limit)
        .map(line => JSON.parse(line));
    } catch (error) {
      console.error(`Failed to read file: ${error.message}`);
      return [];
    }
  }

  /**
   * Export logs for analysis
   */
  async exportLogs(format = 'json') {
    try {
      const conversations = await this.getRecentConversations(1000);
      const commands = await this.getRecentCommands(1000);
      const feedback = await this.getRecentFeedback(1000);
      const learning = await this.getLearnedPatterns(1000);
      const stats = await this.getStatistics();

      const exportData = {
        timestamp: new Date().toISOString(),
        statistics: stats,
        conversations: conversations.slice(-100), // Last 100
        commands: commands.slice(-100),
        feedback: feedback.slice(-100),
        learning: learning.slice(-100)
      };

      if (format === 'json') {
        return exportData;
      } else if (format === 'csv') {
        // TODO: Implement CSV export
        return null;
      }

      return exportData;
    } catch (error) {
      console.error(`Failed to export logs: ${error.message}`);
      return null;
    }
  }

  /**
   * Clear old logs (archive or delete)
   */
  async clearOldLogs(ageInDays = 30) {
    try {
      const cutoffTime = Date.now() - (ageInDays * 24 * 60 * 60 * 1000);

      for (const file of [
        this.conversationFile,
        this.commandFile,
        this.feedbackFile,
        this.learningFile
      ]) {
        if (!fs.existsSync(file)) continue;

        const lines = fs.readFileSync(file, 'utf-8')
          .split('\n')
          .filter(line => line.trim());

        const retained = lines.filter(line => {
          try {
            const entry = JSON.parse(line);
            const timestamp = new Date(entry.timestamp).getTime();
            return timestamp > cutoffTime;
          } catch {
            return true; // Keep lines that can't be parsed
          }
        });

        fs.writeFileSync(file, retained.join('\n') + (retained.length > 0 ? '\n' : ''));
      }

      return { success: true, message: `Cleaned logs older than ${ageInDays} days` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default LindaConversationLearner;
