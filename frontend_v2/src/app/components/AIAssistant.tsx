import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Send, Bot, User, Sparkles, FileText, Calculator, Calendar, Download } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { apiClient } from '../../api/client';
import { toast } from 'sonner';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  downloadUrl?: string | null;
  downloadFilename?: string | null;
  downloadLabel?: string | null;
}

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'assistant',
      content: 'Hi I am Asta, your compliance co-pilot. I can help you with any of your queries.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);

  const sendMessage = async (text: string) => {
    if (!text.trim() || busy) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setBusy(true);

    try {
      const res = await apiClient.chat(text, sessionId);
      setSessionId(res.session_id);
      const aiResponse: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date(),
        downloadUrl: res.download_url,
        downloadFilename: res.download_filename,
        downloadLabel: res.download_label,
      };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Chat failed');
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          role: 'assistant',
          content: 'Sorry — I could not reach Asta. Check that the backend is running.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const handleSend = () => {
    void sendMessage(input);
  };

  const handleDownload = async (message: Message) => {
    if (!message.downloadUrl) return;
    try {
      setDownloading(message.id);
      const blob = await apiClient.downloadGstr1File(message.downloadUrl);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = message.downloadFilename || 'gstr1.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(null);
    }
  };

  const quickActions = [
    { label: 'Generate GSTR-1', icon: FileText, prompt: 'Help me generate GSTR-1 from my confirmed sales invoices' },
    { label: 'Check Deadlines', icon: Calendar, prompt: 'What are my upcoming GST deadlines?' },
    { label: 'Revenue Analysis', icon: Calculator, prompt: 'Summarize my sales and tax totals' },
    { label: 'GSTR-3B tips', icon: Calculator, prompt: 'What do I need to prepare for GSTR-3B?' },
  ];

  return (
    <div className="p-6 h-[calc(100vh-8rem)]">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Asta
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 pr-4 -mr-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex w-full items-end gap-3 ${
                      message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback className={message.role === 'assistant' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200'}>
                        {message.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`max-w-[75%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                        message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {message.content}
                      {message.downloadUrl && (
                        <div className="mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-white"
                            disabled={downloading === message.id}
                            onClick={() => void handleDownload(message)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            {downloading === message.id
                              ? 'Downloading…'
                              : message.downloadLabel || 'Download GSTR-1'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex gap-2 mt-4">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Asta about GST, deadlines, HSN…"
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={busy}
              />
              <Button onClick={handleSend} disabled={busy}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="w-full justify-start"
                disabled={busy}
                onClick={() => void sendMessage(action.prompt)}
              >
                <action.icon className="w-4 h-4 mr-2" />
                {action.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
