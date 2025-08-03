import { useState, useEffect, useMemo } from 'react';
import { Search, History, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TOSRecord } from '@/types/tos';

interface EnhancedSearchProps {
  records: TOSRecord[];
  onSearch: (query: string) => void;
  onSelectRecord: (record: TOSRecord) => void;
  value: string;
  onChange: (value: string) => void;
}

export function EnhancedSearch({ records, onSearch, onSelectRecord, value, onChange }: EnhancedSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Load search history from localStorage
  useEffect(() => {
    const history = localStorage.getItem('tos-search-history');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
  }, []);

  // Enhanced search algorithm with priority levels
  const searchResults = useMemo(() => {
    if (!value.trim()) return [];

    const query = value.toLowerCase().trim();
    const results: { record: TOSRecord; priority: number }[] = [];

    records.forEach(record => {
      const stockId = record.STOCK_ID.toLowerCase();
      const contractor = record.CONTRACTOR.toLowerCase();
      
      let priority = 0;
      
      // Level 1: Exact match (highest priority)
      if (stockId === query) {
        priority = 1;
      }
      // Level 2: Prefix match
      else if (stockId.startsWith(query)) {
        priority = 2;
      }
      // Level 3: Substring match (addresses "5348" finding "BB.D.5348")
      else if (stockId.includes(query)) {
        priority = 3;
      }
      // Level 4: Contractor match
      else if (contractor.includes(query)) {
        priority = 4;
      }
      // Level 5: Fuzzy match (simple implementation)
      else if (calculateSimpleDistance(stockId, query) <= 2) {
        priority = 5;
      }

      if (priority > 0) {
        results.push({ record, priority });
      }
    });

    // Sort by priority, then by length (shorter first), then alphabetically
    return results
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        if (a.record.STOCK_ID.length !== b.record.STOCK_ID.length) {
          return a.record.STOCK_ID.length - b.record.STOCK_ID.length;
        }
        return a.record.STOCK_ID.localeCompare(b.record.STOCK_ID);
      })
      .slice(0, 8) // Limit to top 8 results
      .map(item => item.record);
  }, [value, records]);

  // Simple Levenshtein distance calculation
  function calculateSimpleDistance(str1: string, str2: string): number {
    if (str1.length < str2.length) [str1, str2] = [str2, str1];
    
    let distance = 0;
    const maxLength = Math.max(str1.length, str2.length);
    
    for (let i = 0; i < maxLength; i++) {
      if (str1[i] !== str2[i]) distance++;
    }
    
    return distance;
  }

  const handleSearch = () => {
    if (!value.trim()) return;
    
    // Add to search history
    const newHistory = [value, ...searchHistory.filter(h => h !== value)].slice(0, 5);
    setSearchHistory(newHistory);
    localStorage.setItem('tos-search-history', JSON.stringify(newHistory));
    
    setIsOpen(false);
    onSearch(value);
  };

  const handleSelectRecord = (record: TOSRecord) => {
    onChange(record.STOCK_ID);
    setIsOpen(false);
    onSelectRecord(record);
  };

  const handleSelectHistory = (historyItem: string) => {
    onChange(historyItem);
    onSearch(historyItem);
    setIsOpen(false);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('tos-search-history');
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;
    
    return (
      <>
        {text.substring(0, index)}
        <span className="bg-yellow-200 font-semibold">
          {text.substring(index, index + query.length)}
        </span>
        {text.substring(index + query.length)}
      </>
    );
  };

  return (
    <div className="relative">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                placeholder="Search by STOCK_ID (e.g., 5348 to find BB.D.5348)"
                value={value}
                onChange={(e) => {
                  onChange(e.target.value);
                  setIsOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  } else if (e.key === 'Escape') {
                    setIsOpen(false);
                  }
                }}
                onFocus={() => setIsOpen(true)}
                className="h-12 text-base pr-10"
              />
              {value && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onChange('');
                    onSearch('');
                    setIsOpen(false);
                  }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button onClick={handleSearch} size="lg" className="px-6">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </PopoverTrigger>
        
        <PopoverContent className="w-[600px] p-0" align="start">
          <Command>
            <CommandList>
              {searchResults.length > 0 && (
                <CommandGroup heading={`Found ${searchResults.length} matching records`}>
                  {searchResults.map((record) => (
                    <CommandItem
                      key={record.ID}
                      onSelect={() => handleSelectRecord(record)}
                      className="flex items-center justify-between p-3 cursor-pointer"
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-blue-900">
                          {highlightMatch(record.STOCK_ID, value)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {record.CONTRACTOR} • {record.SHIFT}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={record.STOCK_STATUS === 'Active' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {record.STOCK_STATUS}
                        </Badge>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {searchHistory.length > 0 && (
                <CommandGroup heading="Recent Searches">
                  <div className="flex items-center justify-between p-2">
                    <span className="text-sm text-gray-500">Search History</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearHistory}
                      className="h-6 text-xs"
                    >
                      Clear
                    </Button>
                  </div>
                  {searchHistory.map((historyItem, index) => (
                    <CommandItem
                      key={index}
                      onSelect={() => handleSelectHistory(historyItem)}
                      className="flex items-center gap-2 p-3 cursor-pointer"
                    >
                      <History className="h-4 w-4 text-gray-400" />
                      <span>{historyItem}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {value.trim() && searchResults.length === 0 && (
                <CommandEmpty>
                  <div className="text-center py-6">
                    <p className="text-gray-500 mb-2">No matching records found</p>
                    <p className="text-sm text-gray-400">
                      Try searching with partial STOCK_ID (e.g., "5348" to find "BB.D.5348")
                    </p>
                  </div>
                </CommandEmpty>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}