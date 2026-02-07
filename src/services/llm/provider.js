export const PROVIDERS = {
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    models: [
      { id: 'claude-haiku-4-5-20251001', name: 'Haiku 4.5 (fast, cheap)', default: true },
      { id: 'claude-sonnet-4-5-20250929', name: 'Sonnet 4.5 (balanced)' },
    ],
    sendMessage: async (apiKey, model, messages, systemPrompt) => {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 300,
          system: systemPrompt,
          messages,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        if (res.status === 401) throw new Error('Invalid API key');
        if (res.status === 429) throw new Error('Rate limited — wait a moment and try again');
        throw new Error(`API error ${res.status}: ${body}`);
      }

      const data = await res.json();
      const text = data.content?.[0]?.text || '';
      return text;
    },
  },
};

export function getProvider(providerId) {
  return PROVIDERS[providerId] || null;
}

export function getDefaultModel(providerId) {
  const provider = PROVIDERS[providerId];
  if (!provider) return null;
  return provider.models.find(m => m.default) || provider.models[0];
}
