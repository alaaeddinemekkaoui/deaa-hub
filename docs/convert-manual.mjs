import fs from 'node:fs';
import path from 'node:path';

const source = path.resolve('docs/deaa-hub-manuel-utilisation.md');
const output = path.resolve('docs/deaa-hub-manuel-utilisation.html');

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function imageToHtml(line) {
  const match = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (!match) return null;

  const alt = escapeHtml(match[1]);
  const imagePath = match[2];
  const absoluteImagePath = path.resolve(path.dirname(source), imagePath);
  const src = `file:///${absoluteImagePath.replaceAll('\\', '/')}`;
  return `<figure><img src="${src}" alt="${alt}"><figcaption>${alt}</figcaption></figure>`;
}

function parseTable(lines, start) {
  const rows = [];
  let index = start;

  while (index < lines.length && /^\|.*\|$/.test(lines[index].trim())) {
    rows.push(lines[index].trim());
    index += 1;
  }

  if (rows.length < 2 || !/^\|[\s:.-]+\|$/.test(rows[1])) {
    return null;
  }

  const header = rows[0].split('|').slice(1, -1).map((cell) => inlineMarkdown(cell.trim()));
  const bodyRows = rows.slice(2).map((row) =>
    row.split('|').slice(1, -1).map((cell) => inlineMarkdown(cell.trim())),
  );

  const html = [
    '<table>',
    '<thead><tr>',
    ...header.map((cell) => `<th>${cell}</th>`),
    '</tr></thead>',
    '<tbody>',
    ...bodyRows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`),
    '</tbody>',
    '</table>',
  ].join('');

  return { html, next: index };
}

function markdownToHtml(markdown) {
  const lines = markdown.replaceAll('\r\n', '\n').split('\n');
  const html = [];
  let index = 0;

  while (index < lines.length) {
    const raw = lines[index];
    const line = raw.trim();

    if (!line) {
      index += 1;
      continue;
    }

    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      index += 1;
      const code = [];
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      html.push(`<pre><code class="language-${escapeHtml(language)}">${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    const table = parseTable(lines, index);
    if (table) {
      html.push(table.html);
      index = table.next;
      continue;
    }

    const image = imageToHtml(line);
    if (image) {
      html.push(image);
      index += 1;
      continue;
    }

    if (/^---+$/.test(line)) {
      html.push('<hr>');
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^- /.test(line)) {
      const items = [];
      while (index < lines.length && /^- /.test(lines[index].trim())) {
        items.push(`<li>${inlineMarkdown(lines[index].trim().slice(2))}</li>`);
        index += 1;
      }
      html.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    if (/^\d+\. /.test(line)) {
      const items = [];
      while (index < lines.length && /^\d+\. /.test(lines[index].trim())) {
        items.push(`<li>${inlineMarkdown(lines[index].trim().replace(/^\d+\. /, ''))}</li>`);
        index += 1;
      }
      html.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,6})\s+/.test(lines[index].trim()) &&
      !/^(!\[|\|.*\||---+$|- |\d+\. |```)/.test(lines[index].trim())
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    html.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
  }

  return html.join('\n');
}

const markdown = fs.readFileSync(source, 'utf8');
const body = markdownToHtml(markdown);
const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>DEAA-Hub - Manuel d'utilisation complet</title>
  <style>
    @page { size: A4; margin: 1.6cm; }
    body {
      color: #102033;
      font-family: Calibri, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.45;
    }
    h1 {
      color: #0f3d2e;
      font-size: 24pt;
      margin: 0 0 14pt;
      page-break-after: avoid;
    }
    h2 {
      border-bottom: 1px solid #d6e2dc;
      color: #10543f;
      font-size: 18pt;
      margin-top: 24pt;
      padding-bottom: 4pt;
      page-break-after: avoid;
    }
    h3 {
      color: #143f6b;
      font-size: 13.5pt;
      margin-top: 14pt;
      page-break-after: avoid;
    }
    p, li { margin: 4pt 0; }
    table {
      border-collapse: collapse;
      margin: 10pt 0;
      width: 100%;
    }
    th, td {
      border: 1px solid #c9d8d1;
      padding: 6pt;
      vertical-align: top;
    }
    th {
      background: #eaf3ef;
      color: #103d2d;
      font-weight: 700;
    }
    figure {
      margin: 10pt 0 16pt;
      page-break-inside: avoid;
    }
    figcaption {
      color: #52667a;
      font-size: 9.5pt;
      margin-top: 4pt;
      text-align: center;
    }
    img {
      border: 1px solid #cfdad6;
      display: block;
      height: auto;
      max-width: 100%;
    }
    code {
      background: #eef3f1;
      border-radius: 3px;
      font-family: Consolas, monospace;
      font-size: 10pt;
      padding: 1pt 3pt;
    }
    pre {
      background: #f2f5f4;
      border: 1px solid #d6e0dc;
      padding: 8pt;
      white-space: pre-wrap;
    }
    hr {
      border: 0;
      border-top: 1px solid #d6e2dc;
      margin: 16pt 0;
    }
  </style>
</head>
<body>
${body}
</body>
</html>`;

fs.writeFileSync(output, html, 'utf8');
console.log(output);
