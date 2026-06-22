(function () {
    var currentType = 'tracks';

    window.toggleTypeDropdown = function () {
        var dd  = document.getElementById('type-dropdown');
        var btn = document.getElementById('type-toggle-btn');
        if (!dd) return;
        var open = dd.classList.toggle('open');
        btn && btn.classList.toggle('open', open);
    };

    window.selectType = function (el, type, label) {
        currentType = type;
        var lbl = document.getElementById('type-label');
        if (lbl) lbl.textContent = label;
        document.querySelectorAll('.type-dropdown button').forEach(function (b) { b.classList.remove('active'); });
        el.classList.add('active');
        var dd  = document.getElementById('type-dropdown');
        var btn = document.getElementById('type-toggle-btn');
        dd  && dd.classList.remove('open');
        btn && btn.classList.remove('open');
    };

    // Close dropdown on outside click
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.nav-search-type')) {
            document.getElementById('type-dropdown')?.classList.remove('open');
            document.getElementById('type-toggle-btn')?.classList.remove('open');
        }
    });

    document.addEventListener('DOMContentLoaded', function () {
        var input = document.getElementById('global-search-input')
            || document.getElementById('filter-search');
        if (!input) return;

        var isCatalog = !!document.getElementById('catalogue-grid');

        // Pre-fill from URL on catalog page
        if (isCatalog) {
            var q = new URLSearchParams(location.search).get('search');
            if (q) input.value = q;
        }

        function applySearch() {
            var q = input.value.trim();
            if (isCatalog) {
                if (typeof activeSearch !== 'undefined') {
                    activeSearch = q;
                    if (typeof renderCatalog === 'function') renderCatalog();
                }
            } else {
                window.location.href = q ? 'catalog.html?search=' + encodeURIComponent(q) : 'catalog.html';
            }
        }

        // Lupa icon = submit
        var iconBtn = document.querySelector('.nav-search-icon-btn');
        if (iconBtn) {
            iconBtn.addEventListener('click', function (e) {
                e.preventDefault();
                applySearch();
            });
        }

        // Form submit (Enter key)
        var form = input.closest('form');
        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                applySearch();
            });
        }

        // Real-time filter on catalog page
        if (isCatalog) {
            var timer;
            input.addEventListener('input', function () {
                clearTimeout(timer);
                timer = setTimeout(applySearch, 200);
            });
        }

        // ⌘K / Ctrl+K shortcut
        document.addEventListener('keydown', function (e) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                input.focus();
                input.select();
            }
        });
    });
})();
