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
  actionType?: string | null;
  actionPayload?: any | null;
}

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './ui/sheet';

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

  // Review Filing State
  const [reviewingPeriod, setReviewingPeriod] = useState<string | null>(null);
  const [previewJson, setPreviewJson] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [filingInProgress, setFilingInProgress] = useState(false);

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
        actionType: res.action_type,
        actionPayload: res.action_payload,
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

  const handleReviewFiling = async (period: string) => {
    setReviewingPeriod(period);
    setPreviewLoading(true);
    setPreviewJson('');
    try {
      const res = await apiClient.previewGstr1(period);
      setPreviewJson(JSON.stringify(res.rows, null, 2));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSandboxFile = async () => {
    if (!reviewingPeriod) return;
    try {
      setFilingInProgress(true);
      let rowsToSubmit = undefined;
      if (previewJson) {
         rowsToSubmit = JSON.parse(previewJson);
      }
      const res = await apiClient.sandboxFileGstr1(reviewingPeriod, rowsToSubmit);
      toast.success(res.message || 'Filed successfully in sandbox');
      
      const successMessage: Message = {
        id: Date.now() + 10,
        role: 'assistant',
        content: `✅ I have successfully filed your GSTR-1 for **${reviewingPeriod}** in the Sandbox environment.\n\nFiling Acknowledgement Number: **${res.acknowledgement_number || 'N/A'}**\n\nYour dashboard and compliance status have been updated accordingly.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMessage]);
      
      setReviewingPeriod(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sandbox filing failed');
    } finally {
      setFilingInProgress(false);
    }
  };

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
                      {message.actionType === 'review_filing' && message.actionPayload?.period && (
                        <div className="mt-3">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white w-full shadow-sm"
                            onClick={() => void handleReviewFiling(message.actionPayload.period)}
                          >
                            Review & File ({message.actionPayload.period})
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

      {/* Review Filing Drawer */}
      <Sheet open={!!reviewingPeriod} onOpenChange={(open) => {
          if (!open) {
             setReviewingPeriod(null);
             setPreviewJson('');
          }
      }}>
        <SheetContent className="sm:max-w-xl overflow-y-auto w-[600px]">
          {reviewingPeriod && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle className="text-2xl">
                  Review & File GSTR-1
                </SheetTitle>
                <SheetDescription>
                  Period: {reviewingPeriod}
                </SheetDescription>
              </SheetHeader>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Generated Payload</h4>
                  <p className="text-sm text-gray-600 mb-4">Please review the JSON data generated by AI before submitting to Sandbox.co.in.</p>
                  
                  {previewLoading ? (
                    <div className="p-8 text-center text-gray-500 bg-slate-50 rounded-lg">Loading preview...</div>
                  ) : previewJson ? (
                    <textarea 
                      className="w-full h-[400px] font-mono text-xs bg-slate-900 text-slate-50 p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={previewJson}
                      onChange={(e) => setPreviewJson(e.target.value)}
                    />
                  ) : (
                    <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg">Failed to load preview data.</div>
                  )}
                </div>
                
                <div className="pt-6 border-t flex flex-col gap-2">
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white" 
                    disabled={previewLoading || !previewJson || filingInProgress}
                    onClick={() => {
                        void handleSandboxFile();
                    }}
                  >
                    {filingInProgress ? 'Submitting to Sandbox...' : 'Approve & Submit'}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setReviewingPeriod(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
