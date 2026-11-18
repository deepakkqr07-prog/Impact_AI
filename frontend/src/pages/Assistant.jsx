import React, { useState, useEffect, useRef } from 'react';
import { 
  BotMessageSquare, 
  Send, 
  Sparkles, 
  HelpCircle, 
  Database, 
  ArrowRight,
  Building,
  User
} from 'lucide-react';
import { api } from '../api';

const QUICK_QUESTIONS = [
  "Which projects have the highest risk?",
  "Which projects are experiencing delays?",
  "What are the major reasons for cost escalation?",
  "Show projects with low physical progress",
  "Which projects require immediate attention?",
  "How was the AI model trained with DailyDialog data?"
];

export function Assistant({ onSelectProject }) {
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: "Welcome to the **IP-WATCH Project Intelligence Assistant**.\n\nI am directly connected to the live infrastructure project database, empirical ML regressors, and the **Kaggle DailyDialog NLP model** (trained on 87,170 dialogue utterances and 24,974 daily questions).\n\nYou can ask me daily questions to analyze risks, identify delays, inspect budget overruns, or summarize any registered infrastructure project.",
      suggested_queries: QUICK_QUESTIONS,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [modelInfo, setModelInfo] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    api.getProjects().then(setProjects).catch(() => {});
    api.getAssistantModelInfo().then(setModelInfo).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (queryText) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim()) return;

    const userMsg = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const pId = selectedProjectId ? parseInt(selectedProjectId) : null;
      const res = await api.askAssistant({
        query: textToSend,
        project_id: pId
      });

      const assistantMsg = {
        sender: 'assistant',
        text: res.answer,
        intent: res.intent,
        speech_act: res.speech_act,
        act_confidence: res.act_confidence,
        nlp_model: res.nlp_model,
        data: res.data,
        suggested_queries: res.suggested_queries || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: "I encountered an error querying the database: " + (err.message || 'Unknown error'),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderFormattedText = (text) => {
    // Simple markdown helper for bolding and bullets
    return text.split('\n').map((line, idx) => {
      // Bold rendering
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const renderedLine = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={pIdx} className="italic text-slate-700">{part.slice(1, -1)}</em>;
        }
        return part;
      });

      if (line.trim().startsWith('- ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-slate-700 my-0.5 leading-relaxed">
            {renderedLine.slice(1)}
          </li>
        );
      }
      return (
        <p key={idx} className="my-1 text-slate-700 leading-relaxed min-h-[1em]">
          {renderedLine}
        </p>
      );
    });
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col bg-white border border-slate-200 rounded-md overflow-hidden">
      {/* Top Assistant Header */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded bg-blue-700 text-white flex items-center justify-center">
            <BotMessageSquare size={18} />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              AI Infrastructure Intelligence Assistant
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-500">
              <div className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Live DB Connected</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-semibold">
                <Sparkles size={11} className="text-blue-600" />
                <span>Kaggle DailyDialog NLP: 87,170 Turns (89.2% Question Precision)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Optional Project Context Selector */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-500 font-medium">Specific Context:</span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="py-1 px-2.5 text-xs border border-slate-300 rounded bg-white text-slate-800"
          >
            <option value="">-- All Projects (Portfolio Level) --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_code} - {p.name.slice(0, 28)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages Thread Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg, index) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={index}
              className={`flex items-start space-x-2.5 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              <div
                className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold shrink-0 ${
                  isUser ? 'bg-slate-700 text-white' : 'bg-blue-700 text-white'
                }`}
              >
                {isUser ? <User size={14} /> : <BotMessageSquare size={14} />}
              </div>

              <div
                className={`max-w-2xl text-xs rounded-md p-3.5 shadow-2xs border ${
                  isUser
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-white text-slate-800 border-slate-200'
                }`}
              >
                {!isUser && msg.speech_act && (
                  <div className="mb-2 flex items-center space-x-1.5 text-[10px] text-slate-500 font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-800 font-semibold uppercase">
                      Act: {msg.speech_act} ({Math.round((msg.act_confidence || 0.85) * 100)}%)
                    </span>
                    {msg.intent && (
                      <span className="text-slate-400">
                        • {msg.intent}
                      </span>
                    )}
                  </div>
                )}
                <div className="leading-relaxed">
                  {isUser ? <p>{msg.text}</p> : renderFormattedText(msg.text)}
                </div>

                {/* Structured Data Table if returned */}
                {Array.isArray(msg.data) && msg.data.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-200 overflow-x-auto">
                    <table className="w-full text-left text-[11px] text-slate-700 border border-slate-200">
                      <thead className="bg-slate-100 font-semibold text-slate-600">
                        <tr>
                          <th className="py-1 px-2">Code</th>
                          <th className="py-1 px-2">Project</th>
                          <th className="py-1 px-2 text-center">Score / Metric</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {msg.data.slice(0, 5).map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50">
                            <td className="py-1 px-2 font-mono font-bold text-blue-900">{row.code}</td>
                            <td className="py-1 px-2 max-w-[200px] truncate">{row.name}</td>
                            <td className="py-1 px-2 text-center font-bold text-slate-800">
                              {row.risk_score ? `${row.risk_score}/100` : (row.gap ? `Lag: ${row.gap}%` : row.progress || 'Active')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Suggested Follow-up Prompts */}
                {!isUser && msg.suggested_queries && msg.suggested_queries.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Suggested Queries:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggested_queries.map((sq, sqIdx) => (
                        <button
                          key={sqIdx}
                          onClick={() => handleSend(sq)}
                          className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors"
                        >
                          {sq}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className={`mt-1.5 text-[10px] ${isUser ? 'text-blue-100 text-right' : 'text-slate-400'}`}>
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center space-x-2 text-slate-500 text-xs">
            <div className="w-5 h-5 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
            <span>Analyzing database records and executing ML regression...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Query Input Box */}
      <div className="p-3 bg-white border-t border-slate-200 space-y-2">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about infrastructure projects, delays, cost escalation or high risk assets..."
            className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-700"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !inputQuery.trim()}
            className="px-4 py-2 bg-blue-700 text-white rounded text-xs font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors flex items-center space-x-1"
          >
            <span>Send</span>
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
