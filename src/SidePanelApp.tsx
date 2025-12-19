import { useEffect, useState } from 'react';

type EmailData = {
  subject: string;
  bodyHtml: string;
  bodyText: string;
};

type RewrittenEmail = {
  subject: string;
  body: string;
};

export function SidePanelApp() {
  const [tone, setTone] = useState('Formal');
  const [addSignature, _setAddSignature] = useState(true);
  const [email, setEmail] = useState<EmailData | null>(null);
  const [translate, setTranslate] = useState(false);
  const [fromLanguage, setFromLanguage] = useState('English');
  const [toLanguage, setToLanguage] = useState('Spanish');
  const [rewritten, setRewritten] = useState<RewrittenEmail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate character count from email body
  const charCount = email?.bodyText ? email.bodyText.trim().length : 0;
  // Load existing data when side panel opens
  useEffect(() => {
    // 1) Load latest email when panel opens
    chrome.storage.local.get('mailpilotEmailData', (result) => {
      console.log('[MailPilot sidepanel] initial storage.get', result);
      if (result.mailpilotEmailData) {
        setEmail(result.mailpilotEmailData as EmailData);
      }
    });

    // 2) Listen for future updates
    const handleChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string,
    ) => {
      if (areaName !== 'local') return;
      if (changes.mailpilotEmailData?.newValue) {
        console.log(
          '[MailPilot sidepanel] storage.onChanged',
          changes.mailpilotEmailData.newValue,
        );
        setEmail(changes.mailpilotEmailData.newValue as EmailData);
        // Clear rewritten email when new email is loaded
        setRewritten(null);
      }
    };

    chrome.storage.onChanged.addListener(handleChange);
    return () => chrome.storage.onChanged.removeListener(handleChange);
  }, []);

  // Listen for rewrite responses from background script
  useEffect(() => {
    // Method 1: Listen for runtime messages
    const handleMessage = (message: any) => {
      console.log('[MailPilot sidepanel] Received message:', message);
      
      if (message.type === 'REWRITE_COMPLETE') {
        console.log('[MailPilot sidepanel] Got rewritten email:', message.rewritten);
        setRewritten(message.rewritten as RewrittenEmail);
        setIsLoading(false);
        setError(null);
      }
      if (message.type === 'REWRITE_ERROR') {
        console.error('[MailPilot sidepanel] Rewrite error:', message.error);
        setError(message.error as string);
        setIsLoading(false);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    
    // Method 2: Also listen for storage changes as backup
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string,
    ) => {
      if (areaName !== 'local') return;
      
      if (changes.mailpilotRewrittenEmail?.newValue) {
        console.log('[MailPilot sidepanel] Got rewritten email from storage:', changes.mailpilotRewrittenEmail.newValue);
        setRewritten(changes.mailpilotRewrittenEmail.newValue as RewrittenEmail);
        setIsLoading(false);
        setError(null);
      }
      
      if (changes.mailpilotRewriteError?.newValue) {
        console.error('[MailPilot sidepanel] Got error from storage:', changes.mailpilotRewriteError.newValue);
        // Fix: Add type assertion to ensure it's a string
        setError(changes.mailpilotRewriteError.newValue as string);
        setIsLoading(false);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    
    // Also check storage on mount in case message was missed
    chrome.storage.local.get(['mailpilotRewrittenEmail', 'mailpilotRewriteError'], (result) => {
      if (result.mailpilotRewrittenEmail) {
        setRewritten(result.mailpilotRewrittenEmail as RewrittenEmail);
        setIsLoading(false);
      }
      if (result.mailpilotRewriteError) {
        setError(result.mailpilotRewriteError as string);
        setIsLoading(false);
      }
    });

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const handleRewrite = async () => {
    if (charCount < 30) return;
    
    if (!email) return;

    setIsLoading(true);
    setError(null);
    setRewritten(null);

    console.log('Rewriting with tone:', tone, 'signature:', addSignature);
    if (translate) {
      console.log('Translation:', fromLanguage, '→', toLanguage);
    }

    // Send rewrite request to background script
    chrome.runtime.sendMessage({
      type: 'REWRITE_EMAIL',
      email,
      tone,
      translate: translate ? {
        from: fromLanguage,
        to: toLanguage,
      } : undefined,
    });
  };

  const handleApply = () => {
    if (!rewritten) return;

    console.log('[MailPilot sidepanel] Applying email:', rewritten);

    // Send message to background script, which will forward to Gmail tab
    chrome.runtime.sendMessage({
      type: 'APPLY_EMAIL',
      subject: rewritten.subject,
      body: rewritten.body,
    }, (_response) => {
      if (chrome.runtime.lastError) {
        console.error('[MailPilot sidepanel] Error applying email:', chrome.runtime.lastError);
      } else {
        console.log('[MailPilot sidepanel] Email applied successfully');
      }
    });
  };

  const isTooShort = charCount < 30;

  const languages = [
    'English',
    'Spanish',
    'French',
    'German',
    'Italian',
    'Portuguese',
    'Chinese',
    'Japanese',
    'Korean',
    'Arabic',
    'Hindi',
    'Russian',
    'Dutch',
    'Polish',
    'Turkish',
  ];

  return (
    <div className="flex flex-col h-screen bg-white font-sans">
      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-2xl font-bold mt-6 mb-4 text-[#1a1a1a]">MailPilot AI</h1>
        <h2 className="text-lg font-medium mb-8 text-[#333333]">
          Enhance your email drafts with AI-powered rewriting
        </h2>

        <hr className="border-t border-gray-300 w-full mx-auto mb-8" />

        <h1 className="text-2xl font-semibold mb-6 text-[#1a1a1a]">Select your tone</h1>

        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex-1 min-w-[120px]">
            <select
              className="w-full px-3 py-2.5 border border-[#d0d0d0] rounded-md text-sm bg-white text-[#1a1a1a] cursor-pointer appearance-none hover:border-[#a0a0a0] focus:outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/10 pr-9"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M3 4.5l3 3 3-3' stroke='%231a1a1a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
              }}
            >
              <option value="Formal">Formal</option>
              <option value="Casual">Casual</option>
              <option value="Professional">Professional</option>
              <option value="Friendly">Friendly</option>
            </select>
          </div>

          <button
            className="bg-[#1a73e8] text-white border-none rounded-md px-5 py-2.5 text-sm font-medium cursor-pointer flex items-center gap-2 hover:bg-[#1557b0] transition-colors flex-shrink-0 disabled:bg-[#c0c0c0] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleRewrite}
            disabled={isTooShort || isLoading}
          >
            {isLoading ? 'Rewriting...' : 'Rewrite'}
            {!isLoading && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M3 4.5l3 3 3-3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Translation Section */}
        <div className="mb-6">
          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={translate}
              onChange={(e) => setTranslate(e.target.checked)}
              className="w-4 h-4 text-[#1a73e8] border-[#d0d0d0] rounded focus:ring-2 focus:ring-[#1a73e8]/10 cursor-pointer"
            />
            <span className="text-sm font-medium text-[#1a1a1a]">Translate</span>
          </label>

          {translate && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs text-[#666] mb-1">From language</label>
                <select
                  className="w-full px-3 py-2.5 border border-[#d0d0d0] rounded-md text-sm bg-white text-[#1a1a1a] cursor-pointer appearance-none hover:border-[#a0a0a0] focus:outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/10 pr-9"
                  value={fromLanguage}
                  onChange={(e) => setFromLanguage(e.target.value)}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M3 4.5l3 3 3-3' stroke='%231a1a1a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                  }}
                >
                  {languages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center text-[#666] text-sm mt-6">
                →
              </div>

              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs text-[#666] mb-1">To language</label>
                <select
                  className="w-full px-3 py-2.5 border border-[#d0d0d0] rounded-md text-sm bg-white text-[#1a1a1a] cursor-pointer appearance-none hover:border-[#a0a0a0] focus:outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/10 pr-9"
                  value={toLanguage}
                  onChange={(e) => setToLanguage(e.target.value)}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M3 4.5l3 3 3-3' stroke='%231a1a1a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                  }}
                >
                  {languages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex rounded-md mb-4 overflow-hidden">
            <div className="w-1 bg-[#dc3545] flex-shrink-0"></div>
            <div className="flex-1 p-4 text-sm leading-relaxed bg-[#f8d7da] text-[#721c24]">
              {error}
            </div>
          </div>
        )}

        {/* Too Short Error */}
        {isTooShort && (
          <div className="flex rounded-md mb-4 overflow-hidden">
            <div className="w-1 bg-[#ff9800] flex-shrink-0"></div>
            <div className="flex-1 p-4 text-sm leading-relaxed bg-[#fff4e6] text-[#5f3700]">
              Your email is currently too short. Please go back to your email and write{' '}
              <span className="font-bold">at least 30 characters</span>. You have {charCount} characters right
              now.
            </div>
          </div>
        )}

        <hr className="border-t border-gray-300 w-full mx-auto mt-2 mb-8" />

        {/* Rewritten Email Display */}
        {rewritten && (
          <div className="mt-4 p-4 border border-[#d0d0d0] rounded-md bg-[#f8f9fa]">
            <h2 className="text-lg font-semibold mb-4 text-[#1a1a1a]">Rewritten Email</h2>
            
            <div className="mb-4">
              <label className="block text-xs font-medium text-[#666] mb-1">Subject</label>
              <div className="px-3 py-2 bg-white border border-[#d0d0d0] rounded-md text-sm text-[#1a1a1a]">
                {rewritten.subject}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-[#666] mb-1">Body</label>
              <div className="px-3 py-2 bg-white border border-[#d0d0d0] rounded-md text-sm text-[#1a1a1a] whitespace-pre-wrap min-h-[100px] max-h-[300px] overflow-y-auto">
                {rewritten.body}
              </div>
            </div>

            <button
              className="w-full bg-[#28a745] text-white border-none rounded-md px-5 py-2.5 text-sm font-medium cursor-pointer hover:bg-[#218838] transition-colors"
              onClick={handleApply}
            >
              Apply to Gmail
            </button>
          </div>
        )}
      </div>
    </div>
  );
}