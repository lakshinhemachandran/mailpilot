console.log('[MailPilot background] loaded');

const GMAIL_ORIGIN = 'https://mail.google.com';
const OUTLOOK_ORIGINS = [
  'https://outlook.office.com',
  'https://outlook.office365.com',
  'https://outlook.live.com',
];

// Helper function to check if URL is supported
function isSupportedOrigin(origin: string): boolean {
  return origin === GMAIL_ORIGIN || OUTLOOK_ORIGINS.includes(origin);
}

// Enable side panel on Gmail + Outlook tabs
chrome.tabs.onUpdated.addListener((tabId, _info, tab) => {
  if (!tab.url) return;

  const url = new URL(tab.url);
  const isSupported = isSupportedOrigin(url.origin);

  chrome.sidePanel.setOptions({
    tabId,
    path: 'sidepanel.html',
    enabled: isSupported,
  });
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  if (!tab.url) return;

  const url = new URL(tab.url);
  const isSupported = isSupportedOrigin(url.origin);

  chrome.sidePanel.setOptions({
    tabId,
    path: 'sidepanel.html',
    enabled: isSupported,
  });
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  if (!tab.url) return;

  const url = new URL(tab.url);
  const isSupported = isSupportedOrigin(url.origin);

  chrome.sidePanel.setOptions({
    tabId,
    path: 'sidepanel.html',
    enabled: isSupported,
  });
});

chrome.runtime.onMessage.addListener(async(message, sender, _sendResponse) => {
  if (message?.type === 'OPEN_SIDE_PANEL') {
    console.log('[MailPilot bg] got OPEN_SIDE_PANEL', message.payload);

    chrome.storage.local.set(
      {
        mailpilotEmailData: message.payload,
        mailpilotActiveTabId: sender.tab?.id,
      },
      () => console.log('[MailPilot bg] stored mailpilotEmailData + tabId'),
    );

    if (sender.tab?.id !== undefined) {
      chrome.sidePanel.open({ tabId: sender.tab.id });
    } else if (sender.tab?.windowId !== undefined) {
      chrome.sidePanel.open({ windowId: sender.tab.windowId });
    }

    return true;
  }

  if (message?.type === 'REWRITE_EMAIL') {
    const { email, tone, translate } = message;
    
    console.log('[MailPilot bg] Got REWRITE_EMAIL request', { email, tone, translate });
    
    try {
      const backendUrl = 'https://mailpilot-backend-21rf.onrender.com/api/rewrite';
      
      console.log('[MailPilot bg] Calling backend:', backendUrl);
      
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          tone,
          translate
        }),
      });

      console.log('[MailPilot bg] Backend response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[MailPilot bg] Backend error:', errorData);
        throw new Error(errorData.error || `Backend error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[MailPilot bg] Got rewritten data:', data);
      
      chrome.storage.local.set(
        { mailpilotRewrittenEmail: data.rewritten },
        () => {
          console.log('[MailPilot bg] Stored rewritten email');
          chrome.runtime.sendMessage({
            type: 'REWRITE_COMPLETE',
            rewritten: data.rewritten,
          });
        }
      );
      
      return true;
    } catch (error) {
      console.error('[MailPilot] Rewrite error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      chrome.storage.local.set(
        { mailpilotRewriteError: errorMessage },
        () => {
          chrome.runtime.sendMessage({
            type: 'REWRITE_ERROR',
            error: errorMessage,
          });
        }
      );
      
      return true;
    }
  }

  if (message?.type === 'APPLY_EMAIL') {
    const { subject, body } = message;

    chrome.storage.local.get('mailpilotActiveTabId', (res) => {
      const tabId = res.mailpilotActiveTabId as number | undefined;
      if (!tabId) {
        console.error('[MailPilot bg] No active tab stored');
        return;
      }

      console.log('[MailPilot bg] Sending APPLY_EMAIL to tab:', tabId);

      chrome.tabs.sendMessage(tabId, {
        type: 'APPLY_EMAIL',
        subject,
        body,
      }).catch((error) => {
        console.error('[MailPilot bg] Error sending message to content script:', error);
      });
    });

    return true;
  }

  return true;
});

