/**
 * AI Financial Agent Page View
 * Dedicated AI Command Center driven by active dataset
 */

import { appState } from '../state.js';
import { icons } from '../utils/icons.js';
import { agentService } from '../services/agentService.js';
import { modal } from '../components/modal.js';
import { formatCurrency } from '../utils/formatters.js';

export function renderAgentPage(containerEl) {
  if (!containerEl) return;

  const state = appState.getState();
  const messages = state.agent.messages || [];
  const currency = state.user.currency;
  const summary = appState.getFinancialSummary();
  const hasData = state.csvLoaded && state.expenses.length > 0;

  const suggestedPrompts = hasData ? [
    'Where am I overspending?',
    'Top spending category',
    'Analyze my subscriptions',
    'Show unusual transactions',
    'Formulate 50/30/20 Budget',
    'Can I save more this month?'
  ] : [
    'Import CSV File',
    'How do I format my CSV?',
    'What columns are required?',
    'Why is CSV parsing frontend-only?'
  ];

  containerEl.innerHTML = `
    <!-- Header -->
    <div class="page-header" style="margin-bottom:16px;">
      <div class="page-title-group">
        <h1>AI Financial Agent Command Center</h1>
        <p>Real-time autonomous spending intelligence, diagnostics, and conversational advisory</p>
      </div>
      <div class="header-action-buttons">
        <span class="ai-status-badge">
          <span class="status-dot"></span>
          <span>Agent Model ${hasData ? 'Active' : 'Awaiting Data'}</span>
        </span>
      </div>
    </div>

    <!-- Agent Page Container (Chat + Tools Sidebar) -->
    <div class="agent-page-container">
      
      <!-- Main Chat Panel -->
      <div class="agent-chat-panel">
        <div class="agent-chat-header">
          <div class="agent-chat-identity">
            <div class="agent-avatar-glow">🤖</div>
            <div class="agent-name-status">
              <h2>Financial Agent</h2>
              <p>
                <span class="status-dot" style="width:6px; height:6px;"></span>
                ${hasData ? `Full Ledger Context (${state.expenses.length} Records)` : 'No Ledger Loaded'}
              </p>
            </div>
          </div>
          <button class="btn btn-secondary btn-pill" id="agent-clear-chat-btn" style="font-size:0.75rem;">
            Clear History
          </button>
        </div>

        <!-- Messages Area -->
        <div class="agent-chat-messages" id="agent-messages-container">
          ${messages.map(msg => renderChatMessage(msg)).join('')}
        </div>

        <!-- Chat Input Form -->
        <div class="agent-chat-input-area">
          <form id="agent-chat-form" class="agent-input-row">
            <input type="text" id="agent-message-input" placeholder="${hasData ? 'Ask anything about your budget, transactions, or savings strategy...' : 'Import a CSV or ask how to format your financial dataset...'}" autocomplete="off" />
            <button type="submit" class="btn btn-primary" id="agent-submit-btn" style="height:48px; padding:0 20px;">
              ${icons.send(16)} Send
            </button>
          </form>
        </div>
      </div>

      <!-- Right Tools Sidebar -->
      <div class="agent-tools-panel">
        
        <!-- Suggested Prompts -->
        <div class="agent-tool-section">
          <h3>Quick Prompt Library</h3>
          <div class="suggested-prompts-list">
            ${suggestedPrompts.map(p => `
              <button class="suggested-prompt-btn" data-prompt="${p}">
                ${p}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Automated Diagnostics -->
        <div class="agent-tool-section">
          <h3>Autonomous Agent Tools</h3>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <button class="btn btn-secondary" id="agent-tool-audit-subs" style="justify-content:flex-start; font-size:0.8rem;">
              📺 Audit Subscriptions
            </button>
            <button class="btn btn-secondary" id="agent-tool-plan-50-30-20" style="justify-content:flex-start; font-size:0.8rem;">
              📋 Formulate 50/30/20 Budget
            </button>
            <button class="btn btn-secondary" id="agent-tool-anom-scan" style="justify-content:flex-start; font-size:0.8rem;">
              🔍 Deep Anomaly Scan
            </button>
            <button class="btn btn-secondary" id="agent-tool-import-csv" style="justify-content:flex-start; font-size:0.8rem; color:var(--cyan);">
              📁 Import / Replace CSV
            </button>
          </div>
        </div>

        <!-- Context Overview -->
        <div class="agent-tool-section" style="margin-top:auto; background:rgba(255,255,255,0.02); padding:12px; border-radius:var(--radius-md); border:1px solid var(--border);">
          <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Context Snapshot</div>
          <div style="font-size:0.8rem; color:#cbd5e1; margin-top:4px;">
            • ${state.expenses.length} Total Ledger Records<br>
            • ${state.budgets.length} Category Budgets<br>
            • ${hasData ? formatCurrency(summary.monthlySpending, currency) : '—'} Outflow Volume
          </div>
        </div>

      </div>

    </div>
  `;

  function renderChatMessage(msg) {
    const isUser = msg.sender === 'user';
    const textFormatted = msg.text.replace(/\n/g, '<br>');

    return `
      <div class="chat-msg ${isUser ? 'user' : 'agent'}">
        <div class="msg-bubble">
          ${textFormatted}
          ${msg.actions && msg.actions.length > 0 ? `
            <div class="msg-meta-actions">
              ${msg.actions.map(act => `<button class="quick-chip msg-action-chip" data-action="${act}">${act}</button>`).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  const messagesContainer = containerEl.querySelector('#agent-messages-container');
  const chatForm = containerEl.querySelector('#agent-chat-form');
  const msgInput = containerEl.querySelector('#agent-message-input');
  const submitBtn = containerEl.querySelector('#agent-submit-btn');

  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  const sendMessage = async (text) => {
    if (!text || !text.trim()) return;

    if (text.toLowerCase().includes('import csv file') || text.toLowerCase() === 'import csv') {
      modal.openCsvUploadModal();
      return;
    }

    if (text.toLowerCase().includes('how do i format my csv') || text.toLowerCase().includes('what columns are required')) {
      const infoMsg = {
        id: 'msg-' + Date.now(),
        sender: 'user',
        text: text.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const agentReply = {
        id: 'msg-resp-' + Date.now(),
        sender: 'agent',
        text: `📁 **CSV Format Guide**:\n\nRequired columns:\n• **date** (e.g. 2026-03-01)\n• **title** (e.g. Swiggy, Uber, Amazon)\n• **category** (e.g. Food, Transport, Shopping)\n• **amount** (e.g. 450.00)\n• **type** ("expense" or "income")\n\nOptional columns:\n• **payment_method** (e.g. UPI, Credit Card)\n• **description** / notes`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: ['Import CSV File']
      };

      const current = appState.getState().agent.messages;
      appState.setState({
        agent: {
          ...appState.getState().agent,
          messages: [...current, infoMsg, agentReply]
        }
      });
      renderAgentPage(containerEl);
      return;
    }

    // Append user message
    const userMsg = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const current = appState.getState().agent.messages;
    appState.setState({
      agent: {
        ...appState.getState().agent,
        messages: [...current, userMsg]
      }
    });

    messagesContainer.innerHTML += renderChatMessage(userMsg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Show thinking bubble
    const thinkingId = 'thinking-' + Date.now();
    messagesContainer.innerHTML += `
      <div class="chat-msg agent" id="${thinkingId}">
        <div class="msg-bubble" style="display:flex; align-items:center; gap:8px;">
          <span style="color:var(--cyan);">Agent is reasoning & analyzing ledger metrics...</span>
          <span class="status-dot"></span>
        </div>
      </div>
    `;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    submitBtn.disabled = true;

    // Call service
    const res = await agentService.askAgent(text);
    const thinkingEl = document.getElementById(thinkingId);
    if (thinkingEl) thinkingEl.remove();

    messagesContainer.innerHTML += renderChatMessage(res);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    submitBtn.disabled = false;
    msgInput.value = '';

    // Reattach action chip listeners
    containerEl.querySelectorAll('.msg-action-chip').forEach(chip => {
      chip.onclick = () => {
        const actionText = chip.getAttribute('data-action');
        sendMessage(actionText);
      };
    });
  };

  chatForm.onsubmit = (e) => {
    e.preventDefault();
    sendMessage(msgInput.value);
  };

  // Quick Prompt Library Buttons
  containerEl.querySelectorAll('.suggested-prompt-btn').forEach(btn => {
    btn.onclick = () => {
      const prompt = btn.getAttribute('data-prompt');
      sendMessage(prompt);
    };
  });

  // Action chips
  containerEl.querySelectorAll('.msg-action-chip').forEach(chip => {
    chip.onclick = () => {
      const actionText = chip.getAttribute('data-action');
      sendMessage(actionText);
    };
  });

  // Tools Buttons
  containerEl.querySelector('#agent-tool-audit-subs').onclick = () => sendMessage('Analyze my subscriptions');
  containerEl.querySelector('#agent-tool-plan-50-30-20').onclick = () => sendMessage('Formulate 50/30/20 Budget');
  containerEl.querySelector('#agent-tool-anom-scan').onclick = () => sendMessage('Show unusual transactions');
  containerEl.querySelector('#agent-tool-import-csv').onclick = () => modal.openCsvUploadModal();

  // Clear Chat
  containerEl.querySelector('#agent-clear-chat-btn').onclick = () => {
    appState.setState({
      agent: {
        ...appState.getState().agent,
        messages: [
          {
            id: 'msg-init',
            sender: 'agent',
            text: 'History cleared. How can I assist with your financial intelligence today?',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actions: hasData ? ['Where am I overspending?', 'Top spending category'] : ['Import CSV File']
          }
        ]
      }
    });
    renderAgentPage(containerEl);
  };
}
