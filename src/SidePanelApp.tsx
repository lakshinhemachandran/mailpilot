import { useEffect, useState } from 'react';

type EmailData = {
  subject: string;
  bodyHtml: string;
  bodyText: string;
};

export function SidePanelApp() {
  const [tone, setTone] = useState('Formal');
  const [addSignature, _setAddSignature] = useState(true);
  const [wordCount, _setWordCount] = useState(0);
  const [email, setEmail] = useState<EmailData | null>(null);

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
      }
    };

    chrome.storage.onChanged.addListener(handleChange);
    return () => chrome.storage.onChanged.removeListener(handleChange);
  }, []);

  const handleRewrite = async () => {
    if (wordCount < 10) return;
    console.log('Rewriting with tone:', tone, 'signature:', addSignature);
    console.log('Subject:', email?.subject);
    console.log('Body:', email?.bodyText);
  };

  const isTooShort = wordCount < 10;

  return (
    <div className="flex flex-col h-screen bg-white font-sans">
      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-2xl font-bold mt-6 mb-4 text-[#1a1a1a]">MailPilot AI</h1>
        <h2 className="text-lg font-medium mb-8 text-[#333333]">Enhance your email drafts with AI-powered rewriting</h2>

        <hr className="border-t border-gray-300 w-full mx-auto mb-8" />

        <div style={{ padding: 12 }}>
      <h2>MailPilot debug</h2>

      {!email && <p>No email data yet. Click the Gmail button.</p>}

        {email && (
          <>
            <h3>Subject</h3>
            <pre>{email.subject}</pre>

            <h3>Body (text)</h3>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{email.bodyText}</pre>

            <h3>Body (raw HTML)</h3>
            <pre>{email.bodyHtml}</pre>
          </>
        )}
      </div>

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
            disabled={isTooShort}
          >
            Rewrite
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Error Message */}
        {isTooShort && (
          <div className="flex rounded-md mb-4 overflow-hidden">
            <div className="w-1 bg-[#ff9800] flex-shrink-0"></div>
            <div className="flex-1 p-4 text-sm leading-relaxed bg-[#fff4e6] text-[#5f3700]">
              Your email is currently too short. Please go back to your email and write <span className="font-bold">at least 10 words</span>. You have {wordCount} words right now.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}