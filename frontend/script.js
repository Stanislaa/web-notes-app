var notes = [];
var trashedNotes = [];
var currentNote = null;
var saveTimeout = null;
var currentSort = 'date_desc';
var currentTheme = 'dark';
var selectedNotesForExport = new Set();

var isTrashPage = !!document.getElementById('trash_list');

var notesList = document.getElementById('notes_list');
var emptyState = document.getElementById('empty_state');
var noSelection = document.getElementById('no_selection');
var editor = document.getElementById('editor');
var editorTitle = document.getElementById('editor_title');
var editorContent = document.getElementById('editor_content');
var metaCreated = document.getElementById('meta_created');
var metaModified = document.getElementById('meta_modified');
var searchInput = document.getElementById('search_input');
var btnNewNote = document.getElementById('btn_new_note');
var btnDelete = document.getElementById('btn_delete');
var modalDelete = document.getElementById('modal_delete');
var modalExport = document.getElementById('modal_export');
var btnCancelDelete = document.getElementById('btn_cancel_delete');
var btnConfirmDelete = document.getElementById('btn_confirm_delete');
var importanceBtns = document.querySelectorAll('.importance_btn');
var statusIndicator = document.getElementById('status_indicator');
var toastContainer = document.getElementById('toast_container');
var sortSelect = document.getElementById('sort_select');
var themeToggle = document.getElementById('theme_toggle');
var btnExport = document.getElementById('btn_export');

var trashList = document.getElementById('trash_list');
var trashTitle = document.getElementById('trash_title');
var trashText = document.getElementById('trash_text');
var btnRestore = document.getElementById('btn_restore');
var btnDeleteForever = document.getElementById('btn_delete_forever');

var API_BASE = '';


// === Инициализация ===

document.addEventListener('DOMContentLoaded', function() {
  loadTheme();
  setupEventListeners();

  if (isTrashPage) {
    loadTrash();
  } else {
    loadNotes();
  }
});


// === Тема (тёмная/светлая) ===

function loadTheme() {
  var saved = localStorage.getItem('theme');
  if (saved) {
    currentTheme = saved;
  }
  applyTheme();
}

function applyTheme() {
  document.body.setAttribute('data-theme', currentTheme);
  if (themeToggle) {
    var icon = themeToggle.querySelector('svg');
    if (currentTheme === 'light') {
      icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>';
    } else {
      icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>';
    }
  }
}

function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', currentTheme);
  applyTheme();
}


// === Загрузка данных ===

async function loadNotes() {
  try {
    var response = await fetch(API_BASE + '/notes/');
    if (response.ok) {
      notes = await response.json();
      sortNotes();
      renderNotesList();
    }
  } catch (error) {
    console.error('Error loading notes:', error);
    showToast('Ошибка загрузки заметок', 'error');
  }
}

async function loadTrash() {
  try {
    var response = await fetch(API_BASE + '/trash/');
    if (response.ok) {
      trashedNotes = await response.json();
      renderTrashList();
    }
  } catch (error) {
    console.error('Error loading trash:', error);
  }
}


// === Сортировка ===

function sortNotes() {
  var sortFn;
  switch (currentSort) {
    case 'date_desc':
      sortFn = function(a, b) {
        return new Date(b.change_date || b.created_date) - new Date(a.change_date || a.created_date);
      };
      break;
    case 'date_asc':
      sortFn = function(a, b) {
        return new Date(a.change_date || a.created_date) - new Date(b.change_date || b.created_date);
      };
      break;
    case 'alpha_asc':
      sortFn = function(a, b) {
        return (a.headline || '').toLowerCase().localeCompare((b.headline || '').toLowerCase(), 'ru');
      };
      break;
    case 'alpha_desc':
      sortFn = function(a, b) {
        return (b.headline || '').toLowerCase().localeCompare((a.headline || '').toLowerCase(), 'ru');
      };
      break;
    case 'importance_desc':
      sortFn = function(a, b) {
        return (b.improtance || 1) - (a.improtance || 1);
      };
      break;
    case 'importance_asc':
      sortFn = function(a, b) {
        return (a.improtance || 1) - (b.improtance || 1);
      };
      break;
    default:
      sortFn = function() { return 0; };
  }

  notes.sort(sortFn);
}


// === Обработчики событий ===

function setupEventListeners() {
  if (btnNewNote) {
    btnNewNote.addEventListener('click', createNewNote);
  }

  if (searchInput) {
    searchInput.addEventListener('input', function(e) {
      renderNotesList(e.target.value);
    });
  }

  if (editorTitle) {
    editorTitle.addEventListener('input', handleEditorChange);
  }

  if (editorContent) {
    editorContent.addEventListener('input', handleEditorChange);
  }

  for (var i = 0; i < importanceBtns.length; i++) {
    importanceBtns[i].addEventListener('click', function(e) {
      if (!currentNote) return;

      for (var j = 0; j < importanceBtns.length; j++) {
        importanceBtns[j].classList.remove('active');
      }
      e.target.classList.add('active');

      currentNote.improtance = parseInt(e.target.dataset.level);
      saveCurrentNote();
    });
  }

  if (btnDelete) {
    btnDelete.addEventListener('click', function() {
      if (currentNote) {
        modalDelete.classList.add('active');
      }
    });
  }

  if (btnCancelDelete) {
    btnCancelDelete.addEventListener('click', function() {
      modalDelete.classList.remove('active');
    });
  }

  if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener('click', deleteCurrentNote);
  }

  if (modalDelete) {
    modalDelete.addEventListener('click', function(e) {
      if (e.target === modalDelete) {
        modalDelete.classList.remove('active');
      }
    });
  }

  if (btnRestore) {
    btnRestore.addEventListener('click', restoreNote);
  }

  if (btnDeleteForever) {
    btnDeleteForever.addEventListener('click', function() {
      if (currentNote) {
        modalDelete.classList.add('active');
      }
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', function(e) {
      currentSort = e.target.value;
      sortNotes();
      renderNotesList(searchInput ? searchInput.value : '');
    });
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  if (btnExport) {
    btnExport.addEventListener('click', function(e) {
      e.stopPropagation();
      openExportModal();
    });
  }

  // Обработчики модалки экспорта
  var btnCancelExport = document.getElementById('btn_cancel_export');
  var btnSelectAll = document.getElementById('btn_select_all');
  var btnSelectNone = document.getElementById('btn_select_none');
  var btnExportTxt = document.getElementById('btn_export_txt');
  var btnExportJson = document.getElementById('btn_export_json');
  var btnExportPdf = document.getElementById('btn_export_pdf');

  if (btnCancelExport) {
    btnCancelExport.addEventListener('click', closeExportModal);
  }

  if (modalExport) {
    modalExport.addEventListener('click', function(e) {
      if (e.target === modalExport) {
        closeExportModal();
      }
    });
  }

  if (btnSelectAll) {
    btnSelectAll.addEventListener('click', selectAllForExport);
  }

  if (btnSelectNone) {
    btnSelectNone.addEventListener('click', selectNoneForExport);
  }

  if (btnExportTxt) {
    btnExportTxt.addEventListener('click', function() { exportSelected('txt'); });
  }

  if (btnExportJson) {
    btnExportJson.addEventListener('click', function() { exportSelected('json'); });
  }

  if (btnExportPdf) {
    btnExportPdf.addEventListener('click', function() { exportSelected('pdf'); });
  }

  // Горячие клавиши
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
      if (e.code === 'KeyS') {
        e.preventDefault();
        if (currentNote) {
          saveCurrentNote();
          showToast('Сохранено', 'success');
        }
      }
      if (e.code === 'KeyQ') {
        e.preventDefault();
        createNewNote();
      }
    }
  });
}


// === Создание заметки ===

async function createNewNote() {
  var noteData = {
    headline: 'Новая заметка',
    text: '',
    improtance: 1
  };

  try {
    var response = await fetch(API_BASE + '/notes/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noteData)
    });

    if (response.ok) {
      var newNote = await response.json();
      notes.unshift(newNote);
      sortNotes();
      renderNotesList();
      selectNote(newNote.id);

      setTimeout(function() {
        if (editorTitle) {
          editorTitle.focus();
          editorTitle.select();
        }
      }, 100);
    } else {
      showToast('Ошибка создания заметки', 'error');
    }
  } catch (error) {
    console.error('Error creating note:', error);
    showToast('Ошибка создания заметки', 'error');
  }
}


// === Рендер списка заметок ===

function renderNotesList(searchQuery) {
  if (!notesList) return;

  if (!searchQuery) searchQuery = '';

  var filteredNotes = [];
  for (var i = 0; i < notes.length; i++) {
    var note = notes[i];
    if (searchQuery === '') {
      filteredNotes.push(note);
    } else {
      var query = searchQuery.toLowerCase();
      var headlineMatch = note.headline && note.headline.toLowerCase().indexOf(query) !== -1;
      var textMatch = note.text && note.text.toLowerCase().indexOf(query) !== -1;
      if (headlineMatch || textMatch) {
        filteredNotes.push(note);
      }
    }
  }

  if (filteredNotes.length === 0) {
    notesList.innerHTML = '';
    if (emptyState) emptyState.style.display = 'flex';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  var html = '';
  for (var i = 0; i < filteredNotes.length; i++) {
    var note = filteredNotes[i];
    var isActive = currentNote && currentNote.id === note.id;
    var importance = note.improtance || 1;
    var title = escapeHtml(note.headline) || 'Без названия';
    var preview = getPreview(note.text);
    var date = formatDate(note.change_date || note.created_date);
    var label = getImportanceLabel(importance);

    html += '<div class="note_item ' + (isActive ? 'active' : '') + '" ';
    html += 'data-id="' + note.id + '" ';
    html += 'data-importance="' + importance + '" ';
    html += 'onclick="selectNote(' + note.id + ')">';
    html += '<div class="note_item_title">' + title + '</div>';
    html += '<div class="note_item_preview">' + preview + '</div>';
    html += '<div class="note_item_meta">';
    html += '<span class="note_item_date">' + date + '</span>';
    html += '<span class="importance_badge" data-level="' + importance + '">' + label + '</span>';
    html += '</div>';
    html += '</div>';
  }

  notesList.innerHTML = html;
}


// === Рендер списка корзины ===

function renderTrashList() {
  if (!trashList) return;

  if (trashedNotes.length === 0) {
    trashList.innerHTML = '<div class="empty_state" style="display: flex;"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 13l4 4L19 7"/></svg><p>Корзина пуста</p></div>';
    return;
  }

  var html = '';
  for (var i = 0; i < trashedNotes.length; i++) {
    var note = trashedNotes[i];
    var isActive = currentNote && currentNote.id === note.id;
    var importance = note.improtance || 1;
    var title = escapeHtml(note.headline) || 'Без названия';
    var preview = getPreview(note.text);
    var date = formatDate(note.deleted_date);

    html += '<div class="note_item ' + (isActive ? 'active' : '') + '" ';
    html += 'data-id="' + note.id + '" ';
    html += 'data-importance="' + importance + '" ';
    html += 'onclick="selectTrashNote(' + note.id + ')">';
    html += '<div class="note_item_title">' + title + '</div>';
    html += '<div class="note_item_preview">' + preview + '</div>';
    html += '<div class="note_item_meta">';
    html += '<span class="note_item_date">Удалено ' + date + '</span>';
    html += '</div>';
    html += '</div>';
  }

  trashList.innerHTML = html;
}


// === Выбор заметки для редактирования ===

function selectNote(id) {
  currentNote = null;
  for (var i = 0; i < notes.length; i++) {
    if (notes[i].id === id) {
      currentNote = notes[i];
      break;
    }
  }

  if (!currentNote) return;

  if (noSelection) noSelection.style.display = 'none';
  if (editor) editor.style.display = 'block';

  editorTitle.value = currentNote.headline || '';
  editorContent.value = currentNote.text || '';

  if (metaCreated) {
    metaCreated.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>Создано: ' + formatDate(currentNote.created_date);
  }

  if (metaModified) {
    var modifiedDate = currentNote.change_date ? formatDate(currentNote.change_date) : '—';
    metaModified.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Изменено: ' + modifiedDate;
  }

  for (var i = 0; i < importanceBtns.length; i++) {
    var btn = importanceBtns[i];
    var level = parseInt(btn.dataset.level);
    if (level === (currentNote.improtance || 1)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }

  var searchValue = searchInput ? searchInput.value : '';
  renderNotesList(searchValue);
}


// === Выбор заметки в корзине ===

function selectTrashNote(id) {
  currentNote = null;
  for (var i = 0; i < trashedNotes.length; i++) {
    if (trashedNotes[i].id === id) {
      currentNote = trashedNotes[i];
      break;
    }
  }

  if (!currentNote) return;

  if (noSelection) noSelection.style.display = 'none';
  if (editor) editor.style.display = 'block';

  if (trashTitle) {
    trashTitle.textContent = currentNote.headline || 'Без названия';
  }

  if (trashText) {
    trashText.textContent = currentNote.text || 'Нет текста';
  }

  var metaDeleted = document.getElementById('meta_deleted');
  if (metaDeleted) {
    metaDeleted.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>Удалено: ' + formatDate(currentNote.deleted_date);
  }

  renderTrashList();
}


// === Автосохранение ===

function handleEditorChange() {
  if (!currentNote) return;

  updateStatus('saving');

  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(function() {
    currentNote.headline = editorTitle.value;
    currentNote.text = editorContent.value;

    saveCurrentNote();
    updateStatus('saved');
  }, 500);
}

async function saveCurrentNote() {
  if (!currentNote) return;

  try {
    var response = await fetch(API_BASE + '/notes/' + currentNote.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        headline: currentNote.headline,
        text: currentNote.text,
        improtance: currentNote.improtance
      })
    });

    if (response.ok) {
      var updatedNote = await response.json();
      currentNote.change_date = updatedNote.change_date;

      for (var i = 0; i < notes.length; i++) {
        if (notes[i].id === currentNote.id) {
          notes[i] = updatedNote;
          break;
        }
      }

      var searchValue = searchInput ? searchInput.value : '';
      renderNotesList(searchValue);

      if (metaModified) {
        metaModified.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Изменено: ' + formatDate(updatedNote.change_date);
      }
    }
  } catch (error) {
    console.error('Error saving note:', error);
    showToast('Ошибка сохранения', 'error');
  }
}


// === Удаление ===

async function deleteCurrentNote() {
  if (!currentNote) return;

  if (isTrashPage) {
    // Удаление навсегда из корзины
    try {
      var response = await fetch(API_BASE + '/trash/' + currentNote.id, {
        method: 'DELETE'
      });

      if (response.ok) {
        trashedNotes = trashedNotes.filter(function(n) { return n.id !== currentNote.id; });
        currentNote = null;

        if (noSelection) noSelection.style.display = 'flex';
        if (editor) editor.style.display = 'none';

        renderTrashList();
        showToast('Заметка удалена навсегда', 'success');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      showToast('Ошибка удаления', 'error');
    }
  } else {
    // Перемещение в корзину
    try {
      var response = await fetch(API_BASE + '/notes/' + currentNote.id + '/trash', {
        method: 'POST'
      });

      if (response.ok) {
        notes = notes.filter(function(n) { return n.id !== currentNote.id; });
        currentNote = null;

        if (noSelection) noSelection.style.display = 'flex';
        if (editor) editor.style.display = 'none';

        renderNotesList();
        showToast('Заметка перемещена в корзину', 'success');
      }
    } catch (error) {
      console.error('Error trashing note:', error);
      showToast('Ошибка удаления', 'error');
    }
  }

  modalDelete.classList.remove('active');
}


// === Восстановление из корзины ===

async function restoreNote() {
  if (!currentNote) return;

  try {
    var response = await fetch(API_BASE + '/trash/' + currentNote.id + '/restore', {
      method: 'POST'
    });

    if (response.ok) {
      trashedNotes = trashedNotes.filter(function(n) { return n.id !== currentNote.id; });
      currentNote = null;

      if (noSelection) noSelection.style.display = 'flex';
      if (editor) editor.style.display = 'none';

      renderTrashList();
      showToast('Заметка восстановлена', 'success');
    }
  } catch (error) {
    console.error('Error restoring note:', error);
    showToast('Ошибка восстановления', 'error');
  }
}


// === Экспорт ===

function openExportModal() {
  if (notes.length === 0) {
    showToast('Нет заметок для экспорта', 'error');
    return;
  }

  selectedNotesForExport.clear();
  if (currentNote) {
    selectedNotesForExport.add(currentNote.id);
  }

  renderExportList();
  updateExportCount();
  modalExport.classList.add('active');
}

function closeExportModal() {
  modalExport.classList.remove('active');
}

function renderExportList() {
  var exportList = document.getElementById('export_notes_list');
  if (!exportList) return;

  var html = '';
  for (var i = 0; i < notes.length; i++) {
    var note = notes[i];
    var isChecked = selectedNotesForExport.has(note.id);
    var importance = note.improtance || 1;
    var title = escapeHtml(note.headline) || 'Без названия';
    var preview = getPreview(note.text);

    html += '<label class="export_item' + (isChecked ? ' selected' : '') + '">';
    html += '<input type="checkbox" class="export_checkbox" data-id="' + note.id + '"' + (isChecked ? ' checked' : '') + '>';
    html += '<div class="export_item_check">';
    html += '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>';
    html += '</div>';
    html += '<div class="export_item_content">';
    html += '<div class="export_item_title">' + title + '</div>';
    html += '<div class="export_item_preview">' + preview + '</div>';
    html += '</div>';
    html += '<span class="importance_badge" data-level="' + importance + '">' + getImportanceLabel(importance) + '</span>';
    html += '</label>';
  }

  exportList.innerHTML = html;

  var checkboxes = exportList.querySelectorAll('.export_checkbox');
  for (var i = 0; i < checkboxes.length; i++) {
    checkboxes[i].addEventListener('change', handleExportCheckbox);
  }
}

function handleExportCheckbox(e) {
  var id = parseInt(e.target.dataset.id);
  var item = e.target.closest('.export_item');

  if (e.target.checked) {
    selectedNotesForExport.add(id);
    item.classList.add('selected');
  } else {
    selectedNotesForExport.delete(id);
    item.classList.remove('selected');
  }

  updateExportCount();
}

function updateExportCount() {
  var countEl = document.getElementById('export_count');
  if (countEl) {
    countEl.textContent = 'Выбрано: ' + selectedNotesForExport.size + ' из ' + notes.length;
  }

  var btns = document.querySelectorAll('.export_actions .btn_export_action');
  for (var i = 0; i < btns.length; i++) {
    btns[i].disabled = selectedNotesForExport.size === 0;
  }
}

function selectAllForExport() {
  selectedNotesForExport.clear();
  for (var i = 0; i < notes.length; i++) {
    selectedNotesForExport.add(notes[i].id);
  }
  renderExportList();
  updateExportCount();
}

function selectNoneForExport() {
  selectedNotesForExport.clear();
  renderExportList();
  updateExportCount();
}

function exportSelected(format) {
  var selected = notes.filter(function(n) { return selectedNotesForExport.has(n.id); });
  if (selected.length === 0) {
    showToast('Выберите заметки для экспорта', 'error');
    return;
  }

  closeExportModal();

  if (format === 'txt') exportToTxt(selected);
  else if (format === 'json') exportToJson(selected);
  else if (format === 'pdf') exportToPdf(selected);
}

function exportToTxt(notesToExport) {
  var content = '';
  for (var i = 0; i < notesToExport.length; i++) {
    var note = notesToExport[i];
    content += '='.repeat(50) + '\n';
    content += 'Заголовок: ' + (note.headline || 'Без названия') + '\n';
    content += 'Важность: ' + getImportanceLabel(note.improtance || 1) + '\n';
    content += 'Создано: ' + new Date(note.created_date).toLocaleString('ru-RU') + '\n';
    if (note.change_date) {
      content += 'Изменено: ' + new Date(note.change_date).toLocaleString('ru-RU') + '\n';
    }
    content += '-'.repeat(50) + '\n';
    content += (note.text || 'Нет текста') + '\n\n';
  }

  downloadFile(content, notesToExport.length === 1 ? 'note.txt' : 'notes.txt', 'text/plain');
  showToast('Экспортировано ' + notesToExport.length + ' заметок в TXT', 'success');
}

function exportToJson(notesToExport) {
  var exportData = notesToExport.map(function(note) {
    return {
      headline: note.headline,
      text: note.text,
      importance: note.improtance,
      created_date: note.created_date,
      change_date: note.change_date
    };
  });

  var content = JSON.stringify(exportData, null, 2);
  downloadFile(content, notesToExport.length === 1 ? 'note.json' : 'notes.json', 'application/json');
  showToast('Экспортировано ' + notesToExport.length + ' заметок в JSON', 'success');
}

function exportToPdf(notesToExport) {
  var printWindow = window.open('', '_blank');
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Заметки</title>';
  html += '<style>';
  html += 'body { font-family: Arial, sans-serif; padding: 20px; }';
  html += '.note { margin-bottom: 30px; page-break-inside: avoid; border-bottom: 1px solid #ccc; padding-bottom: 20px; }';
  html += '.note-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }';
  html += '.note-meta { font-size: 12px; color: #666; margin-bottom: 10px; }';
  html += '.note-content { font-size: 14px; line-height: 1.6; white-space: pre-wrap; }';
  html += '</style></head><body>';
  html += '<h1>Мои заметки</h1>';
  html += '<p style="color: #666;">Экспортировано: ' + new Date().toLocaleString('ru-RU') + ' | Заметок: ' + notesToExport.length + '</p><hr>';

  for (var i = 0; i < notesToExport.length; i++) {
    var note = notesToExport[i];
    html += '<div class="note">';
    html += '<div class="note-title">' + escapeHtml(note.headline || 'Без названия') + '</div>';
    html += '<div class="note-meta">';
    html += getImportanceLabel(note.improtance || 1) + ' | ';
    html += 'Создано: ' + new Date(note.created_date).toLocaleString('ru-RU');
    if (note.change_date) {
      html += ' | Изменено: ' + new Date(note.change_date).toLocaleString('ru-RU');
    }
    html += '</div>';
    html += '<div class="note-content">' + escapeHtml(note.text || 'Нет текста') + '</div>';
    html += '</div>';
  }

  html += '</body></html>';
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
  showToast('Откройте диалог печати для сохранения PDF', 'success');
}

function downloadFile(content, filename, mimeType) {
  var blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}


// === Вспомогательные функции ===

function updateStatus(status) {
  if (!statusIndicator) return;

  var dot = statusIndicator.querySelector('.status_dot');
  var text = statusIndicator.querySelector('span:last-child');

  if (status === 'saving') {
    dot.classList.add('saving');
    text.textContent = 'Сохранение...';
  } else {
    dot.classList.remove('saving');
    text.textContent = 'Сохранено';
  }
}

function showToast(message, type) {
  if (!toastContainer) return;
  if (!type) type = 'success';

  var toast = document.createElement('div');
  toast.className = 'toast ' + type;

  var icon;
  if (type === 'success') {
    icon = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
  } else {
    icon = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';
  }

  toast.innerHTML = icon + '<span>' + message + '</span>';
  toastContainer.appendChild(toast);

  setTimeout(function() {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(function() { toast.remove(); }, 300);
  }, 3000);
}

function escapeHtml(text) {
  if (!text) return '';
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getPreview(text) {
  if (!text) return 'Нет текста';
  if (text.length > 50) return text.substring(0, 50) + '...';
  return text;
}

function formatDate(dateString) {
  if (!dateString) return '—';

  var dateStr = dateString;
  if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
    dateStr = dateStr + 'Z';
  }

  var date = new Date(dateStr);
  var now = new Date();
  var diff = now - date;

  if (diff < 60000) return 'Только что';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' мин. назад';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' ч. назад';

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  }

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getImportanceLabel(level) {
  if (level === 1) return 'Обычная';
  if (level === 2) return 'Важная';
  if (level === 3) return 'Срочная';
  return 'Обычная';
}


// === Глобальные функции для onclick в HTML ===

window.selectNote = selectNote;
window.selectTrashNote = selectTrashNote;
