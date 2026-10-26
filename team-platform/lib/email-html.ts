function escapeHtml(value: string) {
  return value.replace(/[&<>'\"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character] ?? character)
}

export function brandedEmailHtml({
  body,
  senderName = 'Top100 Africa Future Leaders',
}: {
  body: string
  senderName?: string
}) {
  const paragraphs = body
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => `<p style="margin:0 0 18px">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('')

  return `<!doctype html><html><body style="margin:0;background:#f5f0e8;color:#201f1c;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f0e8;padding:32px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fffdf9;border:1px solid #e7dfd3">
      <tr><td style="padding:26px 30px;border-bottom:4px solid #de4b1f"><div style="font-size:13px;letter-spacing:3px;font-weight:700;color:#de4b1f">T100</div><div style="margin-top:5px;font-size:12px;letter-spacing:2px;color:#6e675f">AFRICA FUTURE LEADERS</div></td></tr>
      <tr><td style="padding:30px;font-size:15px;line-height:1.65">${paragraphs}</td></tr>
      <tr><td style="padding:18px 30px;border-top:1px solid #e7dfd3;color:#6e675f;font-size:12px;line-height:1.5">${escapeHtml(senderName)}<br>Top100 Africa Future Leaders</td></tr>
    </table>
  </td></tr></table></body></html>`
}
