const fmt = (x) => x.toFixed(2).replace('.', ',');

function renderMetrics(host, r) {
    const items = [
        ['Абсолютная сложность CL', 'число ветвлений', String(r.CL)],
        ['Относительная сложность cl',
            'CL / операторы = ' + r.CL + ' / ' + r.total, fmt(r.cl)],
        ['Макс. вложенность CLI', 'самый внешний оператор = 0', String(r.CLI)]
    ];
    host.innerHTML = '';
    items.forEach((item) => {
        const box = document.createElement('div');
        box.className = 'metric';
        const title = document.createElement('span');
        title.textContent = item[0];
        const formula = document.createElement('span');
        formula.className = 'metric-formula';
        formula.textContent = item[1];
        const value = document.createElement('strong');
        value.className = 'metric-value';
        value.textContent = item[2];
        box.append(title, formula, value);
        host.appendChild(box);
    });
}

function renderBranches(host, r) {
    host.innerHTML = '';
    r.branches.forEach((b, i) => {
        const row = document.createElement('tr');
        [[String(i + 1), 'num'], [String(b.line), 'num'], [b.kind, ''],
            [String(b.level), 'num'], [b.text, 'code']].forEach(([text, css]) => {
            const td = document.createElement('td');
            td.textContent = text;
            if (css) td.className = css;
            row.appendChild(td);
        });
        host.appendChild(row);
    });
}
