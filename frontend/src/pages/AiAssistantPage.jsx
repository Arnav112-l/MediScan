import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, AlertCircle } from 'lucide-react';
import { askAiAssistant } from '../services/api';
import Card from '../components/ui/Card';

const AiAssistantPage = () => {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm your MedScan AI Health Assistant. Ask me anything about medicines, side-effects, or health queries.", sender: 'ai' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { id: Date.now(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await askAiAssistant(userMessage.text);
      setMessages(prev => [...prev, { id: Date.now() + 1, text: response.text, sender: 'ai' }]);
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now() + 1, text: "I'm sorry, I'm having trouble connecting to the server right now. Please try again later.", sender: 'ai', isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">AI Health Assistant</h2>
        <p className="text-gray-600 mt-1">Ask any health or medicine related question safely.</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden border border-gray-200">
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 space-y-6">
          <div className="flex items-center justify-center mb-8">
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Today</span>
          </div>

          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.sender === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-green-600 text-white shadow-sm'}`}>
                {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed
                ${msg.sender === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-sm shadow-sm' 
                  : msg.isError 
                    ? 'bg-red-50 text-red-700 border border-red-100 rounded-tl-sm'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm shadow-sm'
                }`}
              >
                {msg.isError && <AlertCircle size={14} className="inline mr-2 mb-0.5" />}
                <span className="whitespace-pre-wrap">{msg.text}</span>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-4 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
                <Bot size={16} />
              </div>
              <div className="px-4 py-4 rounded-2xl bg-white border border-gray-200 rounded-tl-sm shadow-sm flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question here..."
              className="w-full pl-4 pr-14 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white transition-all shadow-inner text-sm"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:hover:bg-green-600 transition-colors"
            >
              <Send size={18} />
            </button>
          </form>
          <p className="text-center text-xs text-gray-400 mt-2">
            AI can make mistakes. Always consult a doctor for medical advice.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default AiAssistantPage;
