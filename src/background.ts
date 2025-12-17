console.log('[MailPilot background] loaded');

chrome.tabs.onUpdated.addListener(async (tabId, _info, tab) => {
  if (!tab.url) return;

  const url = new URL(tab.url);

  if (url.origin === 'https://mail.google.com') {
    await chrome.sidePanel.setOptions({
      tabId,
      path: 'sidepanel.html',
      enabled: true,
    });
  } else {
    await chrome.sidePanel.setOptions({
      tabId,
      enabled: false,
    });
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  if (!tab.url) return;

  const url = new URL(tab.url);
  const isGmail = url.origin === 'https://mail.google.com';

  await chrome.sidePanel.setOptions({
    tabId,
    path: 'sidepanel.html',
    enabled: isGmail,
  });
});

chrome.runtime.onMessage.addListener((message, sender, _sendResponse) => {
  if (message?.type === 'OPEN_SIDE_PANEL') {
    console.log('[MailPilot bg] got OPEN_SIDE_PANEL', message.payload);

    chrome.storage.local.set(
      { mailpilotEmailData: message.payload },
      () => console.log('[MailPilot bg] stored mailpilotEmailData'),
    );

    if (sender.tab?.id !== undefined) {
      chrome.sidePanel.open({ tabId: sender.tab.id });
    } else if (sender.tab?.windowId !== undefined) {
      chrome.sidePanel.open({ windowId: sender.tab.windowId });
    }
  }
});
