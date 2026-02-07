import { PROVIDERS } from '../services/llm/provider.js';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const providerList = Object.values(PROVIDERS);

export default function ProviderSelect({ providerId, modelId, onProviderChange, onModelChange, disabled }) {
  const provider = PROVIDERS[providerId];
  const models = provider?.models || [];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <Label className="font-ocr text-[13px] uppercase tracking-[1.5px] text-muted-foreground">
          Provider
        </Label>
        <Select value={providerId} onValueChange={onProviderChange} disabled={disabled}>
          <SelectTrigger className="w-full font-ocr text-sm bg-white/[0.04] border-white/10 text-card-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1e26] border-white/10">
            {providerList.map(p => (
              <SelectItem key={p.id} value={p.id} className="font-ocr text-sm">
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="font-ocr text-[13px] uppercase tracking-[1.5px] text-muted-foreground">
          Model
        </Label>
        <Select value={modelId} onValueChange={onModelChange} disabled={disabled}>
          <SelectTrigger className="w-full font-ocr text-sm bg-white/[0.04] border-white/10 text-card-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1e26] border-white/10">
            {models.map(m => (
              <SelectItem key={m.id} value={m.id} className="font-ocr text-sm">
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
