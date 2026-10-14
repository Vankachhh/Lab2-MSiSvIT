const SYMBOLS = [
    '<=>', '**=', '...', '>>>', '..<',
    '==', '!=', '<=', '>=', '&&', '||', '+=', '-=', '*=', '/=', '%=',
    '++', '--', '**', '->', '=~', '?:', '?.', '*.', '<<', '>>', '..',
    '+', '-', '*', '/', '%', '<', '>', '=', '!', '?', ':', '.', ',', ';',
    '(', ')', '[', ']', '{', '}', '&', '|', '^', '~', '@', '$'
].sort((a, b) => b.length - a.length);

const isLetter = (c) => c !== undefined &&
    ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_' || (c >= '\u0400' && c <= '\u04ff'));
const isDigit = (c) => c !== undefined && c >= '0' && c <= '9';

// Разбивает текст на лексемы {kind, value, line}; комментарии отбрасываются.
function tokenize(source) {
    const tokens = [];
    let pos = 0;
    let line = 1;
    const push = (kind, value, at) => tokens.push({ kind, value, line: at });

    while (pos < source.length) {
        const ch = source[pos];
        if (ch === '\n') { line += 1; pos += 1; continue; }
        if (ch === ' ' || ch === '\t' || ch === '\r') { pos += 1; continue; }
        if (ch === '/' && source[pos + 1] === '/') {
            while (pos < source.length && source[pos] !== '\n') pos += 1;
            continue;
        }
        if (ch === '/' && source[pos + 1] === '*') {
            pos += 2;
            while (pos < source.length && !(source[pos] === '*' && source[pos + 1] === '/')) {
                if (source[pos] === '\n') line += 1;
                pos += 1;
            }
            pos += 2;
            continue;
        }
        if (ch === '"' || ch === '\'') {
            const triple = source.startsWith(ch + ch + ch, pos);
            const quote = triple ? ch + ch + ch : ch;
            const start = pos;
            const startLine = line;
            pos += quote.length;
            while (pos < source.length && !source.startsWith(quote, pos)) {
                if (source[pos] === '\\') pos += 1;
                if (source[pos] === '\n') {
                    if (!triple) break;
                    line += 1;
                }
                pos += 1;
            }
            pos += quote.length;
            push('text', source.slice(start, Math.min(pos, source.length)), startLine);
            continue;
        }
        if (isDigit(ch)) {
            const start = pos;
            while (isDigit(source[pos]) || source[pos] === '_') pos += 1;
            if (source[pos] === '.' && isDigit(source[pos + 1])) {
                pos += 1;
                while (isDigit(source[pos])) pos += 1;
            }
            if ('dDfFlLgGiI'.indexOf(source[pos]) >= 0 && source[pos] !== undefined) pos += 1;
            push('number', source.slice(start, pos), line);
            continue;
        }
        if (isLetter(ch)) {
            const start = pos;
            while (isLetter(source[pos]) || isDigit(source[pos])) pos += 1;
            push('word', source.slice(start, pos), line);
            continue;
        }
        const symbol = SYMBOLS.find((s) => source.startsWith(s, pos));
        if (symbol) {
            push('symbol', symbol, line);
            pos += symbol.length;
            continue;
        }
        pos += 1;
    }
    return tokens;
}
