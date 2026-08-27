import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Newspaper, ExternalLink, Calendar as CalendarIcon } from 'lucide-react';
import { apiClient } from '../../api/client';
import { toast } from 'sonner';

type NewsItem = {
  id: string;
  source: string;
  title: string;
  url: string;
  summary: string;
  published_at?: string;
};

export function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNews = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getNews();
      setNews(data);
    } catch (err) {
      toast.error('Failed to load compliance news');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNews();
  }, []);

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Recent';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Newspaper className="w-6 h-6 text-blue-600" />
            Government Updates
          </h2>
          <p className="text-sm text-gray-500 mt-1">Latest news from CBIC, GSTN, and DGFT portals</p>
        </div>
        <Button variant="outline" onClick={() => void loadNews()}>
          Refresh News
        </Button>
      </div>

      <div className="space-y-4">
        {loading && <p className="text-gray-500 text-center py-8">Loading latest updates...</p>}
        {!loading && news.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            <Newspaper className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No recent updates found</p>
          </div>
        )}
        
        {news.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex gap-4">
              <div className="hidden sm:flex flex-col items-center justify-center bg-blue-50 w-16 h-16 rounded-lg border border-blue-100 shrink-0">
                <Newspaper className="w-6 h-6 text-blue-600 mb-1" />
                <span className="text-[10px] font-bold text-blue-800 uppercase">{item.source}</span>
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="sm:hidden text-[10px] font-bold text-blue-800 uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {item.source}
                      </span>
                      <h3 className="font-semibold text-gray-900 text-lg leading-snug">
                        {item.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      {formatDate(item.published_at)}
                    </div>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <Button size="sm" variant="secondary" className="gap-2">
                      Read Source
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </a>
                </div>
                
                <p className="text-sm text-gray-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {item.summary}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
