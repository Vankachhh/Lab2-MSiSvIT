const byId = (id) => {
    const node = document.getElementById(id);
    if (!node) throw new Error('Не найден элемент ' + id);
    return node;
};
const editor = byId('source');
const statusLine = byId('status');
const metricsHost = byId('metrics');
const branchesHost = byId('branches');
const fileInput = byId('file');

const clearResult = (message) => {
    metricsHost.innerHTML = '';
    branchesHost.innerHTML = '';
    statusLine.textContent = message;
    statusLine.className = 'status warn';
};

const run = () => {
    const source = editor.value;
    if (!source.trim()) {
        clearResult('Введите или загрузите код на Groovy');
        return;
    }
    const result = analyze(source);
    renderMetrics(metricsHost, result);
    renderBranches(branchesHost, result);
    const lines = source.replace(/\s+$/, '').split('\n').length;
    statusLine.textContent = 'Обработано строк: ' + lines +
        '; операторов всего: ' + result.total +
        ' (простых ' + result.simple + ', ветвлений ' + result.CL + ')' +
        (result.balanced ? '' : '. Внимание: лишняя закрывающая скобка');
    statusLine.className = result.balanced ? 'status ok' : 'status warn';
};

byId('run').addEventListener('click', run);
byId('sample').addEventListener('click', () => { editor.value = SAMPLE; run(); });
byId('clear').addEventListener('click', () => { editor.value = ''; clearResult('Поле очищено'); });
editor.addEventListener('input', run);
fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { editor.value = String(reader.result); run(); };
    reader.readAsText(file);
    fileInput.value = '';
});
editor.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        run();
    }
});
editor.value = SAMPLE;
run();
