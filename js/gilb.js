// Метрика Джилба.
//   CL  — число ветвлений: if, else if, for, for…in, while, do…while
//         и каждая ветка case оператора switch.
//   cl  — CL / общее число операторов программы
//         (простые операторы + условные операторы и циклы).
//   CLI — максимальный уровень вложенности (самый внешний оператор = 0).
//
// switch заменяется цепочкой вложенных if:
//   case 1 → if (уровень L), case 2 → if в его else (L+1), …,
//   default — это else последнего if, условием не считается.
//   Селектор switch в метрику не входит.

const DECL_START = new Set([
    'def', 'void', 'static', 'public', 'private', 'protected', 'final',
    'int', 'long', 'short', 'byte', 'float', 'double', 'char', 'boolean',
    'String', 'Object', 'List', 'Map', 'Set', 'BigDecimal'
]);
const TYPE_WORDS = new Set(['class', 'interface', 'enum', 'trait']);
const CONTINUE_NEXT = new Set([
    '.', '?.', '*.', '&&', '||', '?', '?:', ':', '=', '==', '!=', '<<', '+', '*', '/', '%',
    '>', '<', '>=', '<=', '->'
]);
const END_PREV = new Set([')', ']', '}', '++', '--']);

function analyze(source) {
    const tokens = tokenize(source);
    const lines = source.split('\n');
    const branches = [];
    let simple = 0;
    let stray = false;
    let pos = 0;

    const isSym = (t, v) => t !== undefined && t.kind === 'symbol' && t.value === v;
    const isWord = (t, v) => t !== undefined && t.kind === 'word' && t.value === v;
    const lineText = (n) => (lines[n - 1] || '').trim();
    const add = (kind, line, level) => {
        branches.push({ kind, line, level, text: lineText(line) });
    };

    // Пропускает «( … )», возвращает true, если внутри верхнего уровня есть слово in.
    const skipParens = () => {
        if (!isSym(tokens[pos], '(')) return false;
        let depth = 0;
        let hasIn = false;
        while (pos < tokens.length) {
            const t = tokens[pos];
            if (isSym(t, '(')) depth += 1;
            else if (isSym(t, ')')) {
                depth -= 1;
                if (depth === 0) { pos += 1; break; }
            } else if (depth === 1 && isWord(t, 'in')) hasIn = true;
            pos += 1;
        }
        return hasIn;
    };

    const closeBrace = () => {
        if (isSym(tokens[pos], '}')) pos += 1;
    };

    const continues = (prev, next) => {
        if (prev.kind === 'symbol' && !END_PREV.has(prev.value) &&
            prev.value !== '{' && prev.value !== '(' && prev.value !== '[') return true;
        return next.kind === 'symbol' && CONTINUE_NEXT.has(next.value);
    };

    // Простой оператор: до «;», конца строки или закрывающей «}».
    const parseSimple = () => {
        const start = pos;
        let depth = 0;
        while (pos < tokens.length) {
            const t = tokens[pos];
            if (depth === 0) {
                if (isSym(t, ';')) { pos += 1; break; }
                if (isSym(t, '}')) break;
                if (pos > start && t.line !== tokens[pos - 1].line &&
                    !continues(tokens[pos - 1], t)) break;
            }
            if (isSym(t, '(') || isSym(t, '[') || isSym(t, '{')) depth += 1;
            else if (isSym(t, ')') || isSym(t, ']') || isSym(t, '}')) depth = Math.max(0, depth - 1);
            pos += 1;
        }
        if (pos === start) pos += 1;
        simple += 1;
    };

    const parseBody = (level) => {
        if (isSym(tokens[pos], '{')) {
            pos += 1;
            parseStatements(level, false);
            closeBrace();
        } else if (pos < tokens.length) {
            parseStatement(level);
        }
    };

    const parseIf = (level, elseIf) => {
        add(elseIf ? 'else if' : 'if', tokens[pos].line, level);
        pos += 1;
        skipParens();
        parseBody(level + 1);
        if (isWord(tokens[pos], 'else')) {
            pos += 1;
            if (isWord(tokens[pos], 'if')) parseIf(level + 1, true);
            else parseBody(level + 1);
        }
    };

    const parseSwitch = (level) => {
        pos += 1;
        skipParens();
        if (!isSym(tokens[pos], '{')) return;
        pos += 1;
        let cases = 0;
        while (pos < tokens.length && !isSym(tokens[pos], '}')) {
            const t = tokens[pos];
            if (isWord(t, 'case')) {
                add('case → if', t.line, level + cases);
                cases += 1;
                let depth = 0;
                while (pos < tokens.length) {
                    const c = tokens[pos];
                    if (isSym(c, '(') || isSym(c, '[')) depth += 1;
                    else if (isSym(c, ')') || isSym(c, ']')) depth -= 1;
                    else if (depth === 0 && isSym(c, ':')) { pos += 1; break; }
                    pos += 1;
                }
                parseStatements(level + cases, true);
            } else if (isWord(t, 'default')) {
                pos += 1;
                if (isSym(tokens[pos], ':')) pos += 1;
                parseStatements(level + cases, true);
            } else {
                pos += 1;
            }
        }
        closeBrace();
    };

    const methodBodyStart = () => {
        const t = tokens[pos];
        if (t.kind !== 'word' || !DECL_START.has(t.value)) return -1;
        let j = pos;
        while (tokens[j] !== undefined && tokens[j].kind === 'word') j += 1;
        if (j - pos < 2 || !isSym(tokens[j], '(')) return -1;
        let depth = 0;
        while (j < tokens.length) {
            if (isSym(tokens[j], '(')) depth += 1;
            else if (isSym(tokens[j], ')')) {
                depth -= 1;
                if (depth === 0) break;
            }
            j += 1;
        }
        j += 1;
        while (tokens[j] !== undefined && tokens[j].kind === 'word') j += 1;
        return isSym(tokens[j], '{') ? j : -1;
    };

    const parseStatement = (level) => {
        const t = tokens[pos];
        if (isSym(t, ';')) { pos += 1; return; }
        if (isSym(t, '{')) {
            pos += 1;
            parseStatements(level, false);
            closeBrace();
            return;
        }
        if (t.kind === 'word') {
            switch (t.value) {
                case 'if':
                    parseIf(level, false);
                    return;
                case 'for': {
                    const line = t.line;
                    pos += 1;
                    const isIn = skipParens();
                    add(isIn ? 'for…in' : 'for', line, level);
                    parseBody(level + 1);
                    return;
                }
                case 'while':
                    add('while', t.line, level);
                    pos += 1;
                    skipParens();
                    parseBody(level + 1);
                    return;
                case 'do':
                    add('do…while', t.line, level);
                    pos += 1;
                    parseBody(level + 1);
                    if (isWord(tokens[pos], 'while')) {
                        pos += 1;
                        skipParens();
                    }
                    return;
                case 'switch':
                    parseSwitch(level);
                    return;
                case 'else':
                    pos += 1;
                    return;
                default:
                    break;
            }
            if (TYPE_WORDS.has(t.value)) {
                while (pos < tokens.length && !isSym(tokens[pos], '{')) pos += 1;
                if (pos < tokens.length) {
                    pos += 1;
                    parseStatements(0, false);
                    closeBrace();
                }
                return;
            }
            const body = methodBodyStart();
            if (body >= 0) {
                pos = body + 1;
                parseStatements(0, false);
                closeBrace();
                return;
            }
        }
        parseSimple();
    };

    function parseStatements(level, inSwitch) {
        while (pos < tokens.length) {
            const t = tokens[pos];
            if (isSym(t, '}')) return;
            if (inSwitch && (isWord(t, 'case') || isWord(t, 'default'))) return;
            parseStatement(level);
        }
    }

    while (pos < tokens.length) {
        parseStatements(0, false);
        if (pos < tokens.length) {
            stray = true;
            pos += 1;
        }
    }

    const CL = branches.length;
    const total = simple + CL;
    const CLI = branches.reduce((max, b) => Math.max(max, b.level), 0);
    return {
        branches,
        CL,
        simple,
        total,
        cl: total > 0 ? CL / total : 0,
        CLI,
        balanced: !stray
    };
}
