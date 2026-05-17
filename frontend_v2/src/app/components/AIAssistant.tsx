import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Send, Bot, User, Sparkles, FileText, Calculator, Calendar } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'assistant',
      content: "Hello! I'm your compliance co-pilot. I can help you with:\n\n• Understanding compliance requirements\n• Generating GST returns (GSTR-1, GSTR-3B)\n• Analyzing your financial data\n• Answering tax and compliance questions\n• Tracking deadlines\n\nHow can I assist you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInput('');

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: messages.length + 2,
        role: 'assistant',
        content: getAIResponse(input),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1000);
  };

  const getAIResponse = (question: string): string => {
    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes('gstr-1') || lowerQuestion.includes('gstr1')) {
      return "GSTR-1 is an outward supplies return that needs to be filed monthly (or quarterly for small taxpayers). Based on your current data:\n\n• Total taxable sales: ₹67,000\n• CGST: ₹6,030\n• SGST: ₹6,030\n• Due date: May 15, 2026\n\nWould you like me to generate the GSTR-1 return for you?";
    }

    if (lowerQuestion.includes('gstr-3b') || lowerQuestion.includes('gstr3b')) {
      return "GSTR-3B is a summary return with tax payment details. For the current period:\n\n• Total outward supplies: ₹67,000\n• Total inward supplies: ₹40,000\n• Net tax liability: ₹4,860\n• Due date: May 20, 2026\n\nI can help you generate this return with all the necessary details.";
    }

    if (lowerQuestion.includes('deadline') || lowerQuestion.includes('due')) {
      return "You have 4 upcoming compliance deadlines:\n\n1. GSTR-1: May 15 (2 days)\n2. GSTR-3B: May 20 (7 days)\n3. TDS Return: May 31 (18 days)\n4. Advance Tax: June 15 (33 days)\n\nI recommend prioritizing GSTR-1 as it's due in 2 days.";
    }

    if (lowerQuestion.includes('revenue') || lowerQuestion.includes('sales')) {
      return "Based on your financial data:\n\n• Current month revenue: ₹67,000\n• Previous month: ₹55,000\n• Growth: +21.8%\n• Year-to-date: ₹328,000\n\nYour revenue is trending upward. Great progress!";
    }

    return "I understand you're asking about " + question + ". I can help you with compliance requirements, financial analysis, and document generation. Could you please provide more specific details about what you'd like to know?";
  };

  const quickActions = [
    { label: 'Generate GSTR-1', icon: FileText },
    { label: 'Check Deadlines', icon: Calendar },
    { label: 'Revenue Analysis', icon: Calculator },
    { label: 'Tax Calculator', icon: Calculator },
  ];

  return (
    <div className="p-6 h-[calc(100vh-8rem)]">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Chat Interface */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              AI Compliance Assistant
            </CardTitle>
            <CardDescription>Ask questions about compliance, taxes, and financial data</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 pr-4 -mr-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className="bg-blue-600">
                          <Bot className="w-4 h-4 text-white" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <span className={`text-xs mt-1 block ${
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {message.role === 'user' && (
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className="bg-gray-600">
                          <User className="w-4 h-4 text-white" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="mt-4 flex gap-2">
              <Input
                placeholder="Ask about compliance, deadlines, or financial data..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              />
              <Button onClick={handleSend}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and queries</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setInput(action.label)}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {action.label}
                </Button>
              );
            })}

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                AI Capabilities
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Auto-generate GST returns</li>
                <li>• Smart deadline tracking</li>
                <li>• Financial data analysis</li>
                <li>• Compliance recommendations</li>
                <li>• Tax calculations</li>
              </ul>
            </div>

            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-900 mb-2">Recent Actions</h4>
              <div className="text-sm text-green-700 space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Generated GSTR-1 draft</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Set deadline reminder</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
