import { getDiagnosticSystemPrompt } from './SystemPrompt';

export type ProviderType = 'openai' | 'gemini' | 'claude' | 'deepseek' | 'grok' | 'custom';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

class LLMProviderService {
  private activeProvider: ProviderType = 'gemini';
  private apiKey: string = '';
  private customEndpoint: string = '';
  private activeModel: string = 'gemini-1.5-flash';

  setCredentials(provider: ProviderType, key: string, model: string, endpoint?: string) {
    this.activeProvider = provider;
    this.apiKey = key;
    this.activeModel = model;
    if (endpoint) this.customEndpoint = endpoint;
    
    // Save to local storage for persistence across reloads
    localStorage.setItem('satan_ai_provider', provider);
    localStorage.setItem('satan_ai_key', key);
    localStorage.setItem('satan_ai_model', model);
  }

  loadCredentials() {
    const p = localStorage.getItem('satan_ai_provider') as ProviderType;
    const k = localStorage.getItem('satan_ai_key');
    const m = localStorage.getItem('satan_ai_model');
    if (p && k && m) {
      this.activeProvider = p;
      this.apiKey = k;
      this.activeModel = m;
      return true;
    }
    return false;
  }

  getProvider() { return this.activeProvider; }
  hasKey() { return this.apiKey.length > 5; }

  async sendMessage(history: ChatMessage[], contextData: string, onChunk: (text: string) => void): Promise<string> {
    if (!this.hasKey()) throw new Error("API Key not set");

    // Prepend system prompt and context to the internal history payload
    const payloadHistory: ChatMessage[] = [
      { role: 'system', content: getDiagnosticSystemPrompt() },
      { role: 'system', content: "CURRENT SERIAL CONTEXT:\n" + contextData },
      ...history
    ];

    // For now, implement standard OpenAI-compatible API fetching which works for OpenRouter/DeepSeek/Grok
    // In future versions, this will route through the Render backend.
    
    let endpoint = this.customEndpoint;
    let headers: any = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };

    if (this.activeProvider === 'gemini') {
      // Gemini native API
      endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.activeModel}:streamGenerateContent?key=${this.apiKey}`;
      delete headers['Authorization']; // Gemini uses URL key
      
      const contents = payloadHistory.filter(m => m.role !== 'system').map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
      
      // Inject system instruction for Gemini
      const systemInstruction = payloadHistory.filter(m => m.role === 'system').map(m => m.content).join("\n\n");

      const body = {
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: { temperature: 0.2 }
      };

      return this.streamFetch(endpoint, headers, body, onChunk, 'gemini');
    }

    if (this.activeProvider === 'openai' || this.activeProvider === 'deepseek' || this.activeProvider === 'grok') {
      if (this.activeProvider === 'openai') endpoint = 'https://api.openai.com/v1/chat/completions';
      if (this.activeProvider === 'deepseek') endpoint = 'https://api.deepseek.com/v1/chat/completions';
      if (this.activeProvider === 'grok') endpoint = 'https://api.x.ai/v1/chat/completions';

      const body = {
        model: this.activeModel,
        messages: payloadHistory,
        stream: true,
        temperature: 0.2
      };

      return this.streamFetch(endpoint, headers, body, onChunk, 'openai');
    }

    throw new Error("Provider streaming not fully implemented yet");
  }

  private async streamFetch(endpoint: string, headers: any, body: any, onChunk: (t: string) => void, format: 'gemini' | 'openai'): Promise<string> {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    if (!reader) throw new Error("No reader available");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(l => l.trim() !== '');

      for (const line of lines) {
        if (format === 'openai') {
          if (line === 'data: [DONE]') continue;
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const delta = data.choices[0]?.delta?.content || "";
              fullText += delta;
              onChunk(fullText);
            } catch (e) {}
          }
        } else if (format === 'gemini') {
          try {
             // Basic naive parsing for Gemini JSON streaming
             const dataStr = chunk.replace(/^data: /, '').trim();
             // Gemini stream format is complex JSON arrays, this is simplified for now
             // In production, we'd use the proper Google GenAI SDK or robust regex
             const match = dataStr.match(/"text":\s*"([^"]+)"/);
             if (match) {
               const unescaped = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
               fullText += unescaped;
               onChunk(fullText);
             }
          } catch(e) {}
        }
      }
    }
    return fullText;
  }
}

export const LLMProvider = new LLMProviderService();
