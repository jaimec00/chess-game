import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function ApiKeyInput({ providerId, apiKey, onApiKeyChange }) {
  const [draft, setDraft] = useState('');
  const hasKey = !!apiKey;

  const handleSave = () => {
    const trimmed = draft.trim();
    if (trimmed) {
      onApiKeyChange(trimmed);
      setDraft('');
    }
  };

  const handleClear = () => {
    onApiKeyChange('');
    setDraft('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="font-ocr text-[11px] uppercase tracking-[1.5px] text-muted-foreground">
        API Key
      </Label>
      <div className="flex gap-2 items-center">
        <span className={`w-2 h-2 rounded-full shrink-0 ${hasKey
          ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]'
          : 'bg-red-400/60 shadow-[0_0_6px_rgba(248,113,113,0.3)]'
        }`} />
        {hasKey ? (
          <>
            <span className="font-ocr text-xs text-muted-foreground flex-1 truncate">
              {apiKey.slice(0, 12)}...
            </span>
            <Button
              variant="outline"
              size="sm"
              className="font-ocr text-[10px] uppercase tracking-[1px] h-7 px-2.5 bg-white/[0.04] border-white/10 hover:bg-red-500/10 hover:border-red-400/30 hover:text-red-300 transition-all"
              onClick={handleClear}
            >
              Clear
            </Button>
          </>
        ) : (
          <>
            <Input
              type="password"
              placeholder="sk-ant-..."
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-7 font-ocr text-xs bg-white/[0.04] border-white/10 placeholder:text-white/20 flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              className="font-ocr text-[10px] uppercase tracking-[1px] h-7 px-2.5 bg-white/[0.04] border-white/10 hover:bg-white/[0.10] hover:border-white/20 transition-all"
              onClick={handleSave}
              disabled={!draft.trim()}
            >
              Save
            </Button>
          </>
        )}
      </div>
      <p className="font-ocr text-[9px] text-white/25 leading-tight">
        Stored locally. Sent only to the provider's API.
      </p>
    </div>
  );
}
