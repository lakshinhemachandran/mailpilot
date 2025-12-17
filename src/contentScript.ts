type EmailData = {
  subject: string;
  bodyHtml: string;
  bodyText: string;
};

// Helper to check if extension context is still valid
function isExtensionContextValid(): boolean {
  try {
    return chrome.runtime?.id !== undefined;
  } catch {
    return false;
  }
}

function getComposeEmailData(): EmailData {
  const subjectInput = document.querySelector<HTMLInputElement>(
    'input[name="subjectbox"]',
  );

  // More specific, matches the editable compose area
  const bodyDiv =
    document.querySelector<HTMLDivElement>('div[aria-label="Message body"][g_editable="true"]') ??
    document.querySelector<HTMLDivElement>('.Am.Al.editable');

  console.log('[MailPilot] Compose - Subject input found:', !!subjectInput);
  console.log('[MailPilot] Compose - Body div found:', !!bodyDiv);
  console.log('[MailPilot] Compose - Subject value:', subjectInput?.value);
  console.log('[MailPilot] Compose - Body text length:', bodyDiv?.innerText?.length);

  return {
    subject: subjectInput?.value ?? '',
    bodyHtml: bodyDiv?.innerHTML ?? '',
    bodyText: bodyDiv?.innerText ?? '',
  };
}

function getOpenedEmailData(): EmailData {
  const subjectEl = document.querySelector<HTMLElement>('h2.hP');
  // Try the common body containers Gmail uses for read view
  const bodyEl =
    document.querySelector<HTMLElement>('.ii .a3s') ??
    document.querySelector<HTMLElement>('.a3s.aiL'); // fallback

  console.log('[MailPilot] Read - Subject element found:', !!subjectEl);
  console.log('[MailPilot] Read - Body element found:', !!bodyEl);
  console.log('[MailPilot] Read - Subject text:', subjectEl?.innerText);
  console.log('[MailPilot] Read - Body text length:', bodyEl?.innerText?.length);

  return {
    subject: subjectEl?.innerText ?? '',
    bodyHtml: bodyEl?.innerHTML ?? '',
    bodyText: bodyEl?.innerText ?? '',
  };
}

function getCurrentEmailData(): EmailData {
  // If compose subject exists, treat this as compose mode
  const isCompose = document.querySelector('input[name="subjectbox"]');
  console.log('[MailPilot] Is compose mode:', !!isCompose);
  
  const email = isCompose ? getComposeEmailData() : getOpenedEmailData();
  console.log('[MailPilot] Extracted email data:', email);
  
  return email;
}

function addMailPilotButton(anchorEl: HTMLElement) {
  const composeRow = anchorEl.closest('.btC');
  if (!composeRow) return;

  const td = anchorEl.closest('td') as HTMLTableCellElement | null;
  if (!td) return;

  if (composeRow.querySelector('td.mailpilot-cell')) return;

  // Check if extension context is still valid before using chrome APIs
  if (!isExtensionContextValid()) {
    console.warn('[MailPilot] Extension context invalidated, skipping button creation');
    return;
  }

  // Clone the Aa <td> for identical styling
  const mailpilotTd = td.cloneNode(false) as HTMLTableCellElement;
  mailpilotTd.classList.add('mailpilot-cell');

  // Create button with icon
  const btn = document.createElement('div');
  btn.className = 'mailpilot-button';
  btn.style.cursor = 'pointer';
  btn.style.userSelect = 'none';
  btn.style.display = 'flex';
  btn.style.alignItems = 'center';
  btn.style.justifyContent = 'center';
  btn.style.marginLeft = '4px';
  btn.style.marginRight = '4px';

  const img = document.createElement('img');
  try {
    img.src = chrome.runtime.getURL('icons/icon32.png');
  } catch (err) {
    console.error('[MailPilot] Failed to get icon URL:', err);
    return; // Don't add button if we can't get the icon
  }
  img.alt = 'Mail Pilot';
  img.width = 25;
  img.height = 25;
  img.style.width = '25px';
  img.style.height = '25px';
  img.style.display = 'block';
  img.style.objectFit = 'contain';
  img.style.filter = 'none';

  btn.appendChild(img);
  mailpilotTd.appendChild(btn);

  btn.addEventListener('click', () => {
  const email = getCurrentEmailData();
  console.log('[MailPilot] sending OPEN_SIDE_PANEL with', email);

  chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL', payload: email });
});

  const tr = td.parentElement;
  if (tr && tr.tagName === 'TR') {
    tr.insertBefore(mailpilotTd, td);
  }
}

function findComposeAnchors(root: ParentNode): HTMLElement[] {
  const anchors: HTMLElement[] = [];
  const rows = root.querySelectorAll<HTMLElement>('.btC');
  rows.forEach((row) => {
    const dvNodes = row.querySelectorAll<HTMLElement>('div.dv > div.a3I');
    dvNodes.forEach((a3I) => {
      const dv = a3I.parentElement as HTMLElement | null;
      if (dv) anchors.push(dv);
    });
  });
  return anchors;
}

function watchForGmailCompose() {
  const maybeAddButtons = (root: ParentNode) => {
    // Check if context is still valid before processing
    if (!isExtensionContextValid()) {
      return;
    }
    
    const anchors = findComposeAnchors(root);
    anchors.forEach(addMailPilotButton);
  };

  maybeAddButtons(document);

  const observer = new MutationObserver((mutations) => {
    // Check context before processing mutations
    if (!isExtensionContextValid()) {
      observer.disconnect();
      return;
    }
    
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement || node instanceof DocumentFragment) {
          maybeAddButtons(node);
        }
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// Initialize
watchForGmailCompose();