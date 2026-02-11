let notes = [];
let trashedNotes = [];
let currentNote = null;
let hasUnsavedChanges = false;
let currentSort = 'date_desc';
let currentTheme = 'dark';
const selectedNotesForExport = new Set();
const DRAFTS_KEY = 'zametki_drafts';

const isTrashPage = !!document.getElementById('trash_list');

const notesList = document.getElementById('notes_list');
const emptyState = document.getElementById('empty_state');
const noSelection = document.getElementById('no_selection');
const editor = document.getElementById('editor');
const editorTitle = document.getElementById('editor_title');
const editorContent = document.getElementById('editor_content');
const metaCreated = document.getElementById('meta_created');
const metaModified = document.getElementById('meta_modified');
const searchInput = document.getElementById('search_input');
const btnNewNote = document.getElementById('btn_new_note');
const btnDelete = document.getElementById('btn_delete');
const modalDelete = document.getElementById('modal_delete');
const modalExport = document.getElementById('modal_export');
const btnCancelDelete = document.getElementById('btn_cancel_delete');
const btnConfirmDelete = document.getElementById('btn_confirm_delete');
const importanceBtns = document.querySelectorAll('.importance_btn');
const statusIndicator = document.getElementById('status_indicator');
const toastContainer = document.getElementById('toast_container');
const sortSelect = document.getElementById('sort_select');
const themeToggle = document.getElementById('theme_toggle');
const btnExport = document.getElementById('btn_export');

const btnSave = document.getElementById('btn_save');

const trashList = document.getElementById('trash_list');
const trashTitle = document.getElementById('trash_title');
const trashText = document.getElementById('trash_text');
const btnRestore = document.getElementById('btn_restore');
const btnDeleteForever = document.getElementById('btn_delete_forever');

const API_BASE = '';

function getDrafts() {
  try {
    return JSON.parse(localStorage.getItem(DRAFTS_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveDraft(noteId, headline, text, improtance) {
  const drafts = getDrafts();
  drafts[noteId] = { headline: headline, text: text, improtance: improtance };
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

function getDraft(noteId) {
  const drafts = getDrafts();
  return drafts[noteId] || null;
}

function deleteDraft(noteId) {
  const drafts = getDrafts();
  delete drafts[noteId];
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

function hasDraft(noteId) {
  const drafts = getDrafts();
  return !!drafts[noteId];
}

document.addEventListener('DOMContentLoaded', function() {
  loadTheme();
  setupEventListeners();

  if (isTrashPage) {
    loadTrash();
  } else {
    loadNotes();
  }
});

function loadTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) {
    currentTheme = saved;
  }
  applyTheme();
}

function applyTheme() {
  document.body.setAttribute('data-theme', currentTheme);
  if (themeToggle) {
    const icon = themeToggle.querySelector('svg');
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

async function loadNotes() {
  try {
    const response = await fetch(API_BASE + '/notes/');
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
    const response = await fetch(API_BASE + '/trash/');
    if (response.ok) {
      trashedNotes = await response.json();
      renderTrashList();
    }
  } catch (error) {
    console.error('Error loading trash:', error);
  }
}

function sortNotes() {
  let sortFn;
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

  for (let i = 0; i < importanceBtns.length; i++) {
    importanceBtns[i].addEventListener('click', function(e) {
      if (!currentNote) return;

      for (let j = 0; j < importanceBtns.length; j++) {
        importanceBtns[j].classList.remove('active');
      }
      e.target.classList.add('active');

      currentNote.improtance = parseInt(e.target.dataset.level);
      hasUnsavedChanges = true;
      saveDraft(currentNote.id, currentNote.headline, currentNote.text, currentNote.improtance);
      updateStatus('unsaved');
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

  if (btnSave) {
    btnSave.addEventListener('click', function() {
      if (currentNote && hasUnsavedChanges) {
        saveCurrentNote();
        showToast('Сохранено', 'success');
      }
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

  const btnCancelExport = document.getElementById('btn_cancel_export');
  const btnSelectAll = document.getElementById('btn_select_all');
  const btnSelectNone = document.getElementById('btn_select_none');
  const btnExportTxt = document.getElementById('btn_export_txt');
  const btnExportJson = document.getElementById('btn_export_json');
  const btnExportPdf = document.getElementById('btn_export_pdf');

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

  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
      if (e.code === 'KeyS') {
        e.preventDefault();
        if (currentNote && hasUnsavedChanges) {
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

async function createNewNote() {
  const noteData = {
    headline: 'Новая заметка',
    text: '',
    improtance: 1
  };

  try {
    const response = await fetch(API_BASE + '/notes/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noteData)
    });

    if (response.ok) {
      const newNote = await response.json();
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

function renderNotesList(searchQuery) {
  if (!notesList) return;

  if (!searchQuery) searchQuery = '';

  const filteredNotes = [];
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    if (searchQuery === '') {
      filteredNotes.push(note);
    } else {
      const query = searchQuery.toLowerCase();
      const headlineMatch = note.headline && note.headline.toLowerCase().indexOf(query) !== -1;
      const textMatch = note.text && note.text.toLowerCase().indexOf(query) !== -1;
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

  let html = '';
  for (let i = 0; i < filteredNotes.length; i++) {
    const note = filteredNotes[i];
    const isActive = currentNote && currentNote.id === note.id;
    const draft = getDraft(note.id);
    const isDraft = !!draft;
    const displayHeadline = isDraft ? draft.headline : note.headline;
    const displayText = isDraft ? draft.text : note.text;
    const importance = isDraft ? (draft.improtance || 1) : (note.improtance || 1);
    const title = escapeHtml(displayHeadline) || 'Без названия';
    const preview = getPreview(displayText);
    const date = formatDate(note.change_date || note.created_date);
    const label = getImportanceLabel(importance);

    html += '<div class="note_item ' + (isActive ? 'active' : '') + '" ';
    html += 'data-id="' + note.id + '" ';
    html += 'data-importance="' + importance + '" ';
    html += 'onclick="selectNote(' + note.id + ')">';
    html += '<div class="note_item_title">' + title + (isDraft ? '<span class="draft_badge">черновик</span>' : '') + '</div>';
    html += '<div class="note_item_preview">' + preview + '</div>';
    html += '<div class="note_item_meta">';
    html += '<span class="note_item_date">' + date + '</span>';
    html += '<span class="importance_badge" data-level="' + importance + '">' + label + '</span>';
    html += '</div>';
    html += '</div>';
  }

  notesList.innerHTML = html;
}

function renderTrashList() {
  if (!trashList) return;

  if (trashedNotes.length === 0) {
    trashList.innerHTML = '<div class="empty_state" style="display: flex;"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 13l4 4L19 7"/></svg><p>Корзина пуста</p></div>';
    return;
  }

  let html = '';
  for (let i = 0; i < trashedNotes.length; i++) {
    const note = trashedNotes[i];
    const isActive = currentNote && currentNote.id === note.id;
    const importance = note.improtance || 1;
    const title = escapeHtml(note.headline) || 'Без названия';
    const preview = getPreview(note.text);
    const date = formatDate(note.deleted_date);

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

function selectNote(id) {
  currentNote = null;
  for (let i = 0; i < notes.length; i++) {
    if (notes[i].id === id) {
      currentNote = notes[i];
      break;
    }
  }

  if (!currentNote) return;

  if (noSelection) noSelection.style.display = 'none';
  if (editor) editor.style.display = 'flex';

  const draft = getDraft(id);
  if (draft) {
    editorTitle.value = draft.headline || '';
    editorContent.value = draft.text || '';
    currentNote.headline = draft.headline;
    currentNote.text = draft.text;
    currentNote.improtance = draft.improtance;
    hasUnsavedChanges = true;
    updateStatus('unsaved');
  } else {
    editorTitle.value = currentNote.headline || '';
    editorContent.value = currentNote.text || '';
    hasUnsavedChanges = false;
    updateStatus('saved');
  }

  if (metaCreated) {
    metaCreated.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>Создано: ' + formatDate(currentNote.created_date);
  }

  if (metaModified) {
    const modifiedDate = currentNote.change_date ? formatDate(currentNote.change_date) : '—';
    metaModified.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Изменено: ' + modifiedDate;
  }

  for (let i = 0; i < importanceBtns.length; i++) {
    const btn = importanceBtns[i];
    const level = parseInt(btn.dataset.level);
    if (level === (currentNote.improtance || 1)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }

  const searchValue = searchInput ? searchInput.value : '';
  renderNotesList(searchValue);
}

function selectTrashNote(id) {
  currentNote = null;
  for (let i = 0; i < trashedNotes.length; i++) {
    if (trashedNotes[i].id === id) {
      currentNote = trashedNotes[i];
      break;
    }
  }

  if (!currentNote) return;

  if (noSelection) noSelection.style.display = 'none';
  if (editor) editor.style.display = 'flex';

  if (trashTitle) {
    trashTitle.textContent = currentNote.headline || 'Без названия';
  }

  if (trashText) {
    trashText.textContent = currentNote.text || 'Нет текста';
  }

  const metaDeleted = document.getElementById('meta_deleted');
  if (metaDeleted) {
    metaDeleted.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>Удалено: ' + formatDate(currentNote.deleted_date);
  }

  renderTrashList();
}

function handleEditorChange() {
  if (!currentNote) return;

  hasUnsavedChanges = true;
  currentNote.headline = editorTitle.value;
  currentNote.text = editorContent.value;

  saveDraft(currentNote.id, currentNote.headline, currentNote.text, currentNote.improtance);
  updateStatus('unsaved');

  const searchValue = searchInput ? searchInput.value : '';
  renderNotesList(searchValue);
}

async function saveCurrentNote() {
  if (!currentNote) return;

  updateStatus('saving');

  try {
    const response = await fetch(API_BASE + '/notes/' + currentNote.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        headline: currentNote.headline,
        text: currentNote.text,
        improtance: currentNote.improtance
      })
    });

    if (response.ok) {
      const updatedNote = await response.json();
      currentNote.change_date = updatedNote.change_date;

      for (let i = 0; i < notes.length; i++) {
        if (notes[i].id === currentNote.id) {
          notes[i] = updatedNote;
          break;
        }
      }

      deleteDraft(currentNote.id);
      hasUnsavedChanges = false;

      const searchValue = searchInput ? searchInput.value : '';
      renderNotesList(searchValue);

      if (metaModified) {
        metaModified.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Изменено: ' + formatDate(updatedNote.change_date);
      }

      updateStatus('saved');
    }
  } catch (error) {
    console.error('Error saving note:', error);
    updateStatus('error');
    showToast('Ошибка сохранения', 'error');
  }
}

async function deleteCurrentNote() {
  if (!currentNote) return;

  if (isTrashPage) {
    try {
      const response = await fetch(API_BASE + '/trash/' + currentNote.id, {
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
    try {
      const response = await fetch(API_BASE + '/notes/' + currentNote.id + '/trash', {
        method: 'POST'
      });

      if (response.ok) {
        deleteDraft(currentNote.id);
        hasUnsavedChanges = false;
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

async function restoreNote() {
  if (!currentNote) return;

  try {
    const response = await fetch(API_BASE + '/trash/' + currentNote.id + '/restore', {
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
  const exportList = document.getElementById('export_notes_list');
  if (!exportList) return;

  let html = '';
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const isChecked = selectedNotesForExport.has(note.id);
    const importance = note.improtance || 1;
    const title = escapeHtml(note.headline) || 'Без названия';
    const preview = getPreview(note.text);

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

  const checkboxes = exportList.querySelectorAll('.export_checkbox');
  for (let i = 0; i < checkboxes.length; i++) {
    checkboxes[i].addEventListener('change', handleExportCheckbox);
  }
}

function handleExportCheckbox(e) {
  const id = parseInt(e.target.dataset.id);
  const item = e.target.closest('.export_item');

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
  const countEl = document.getElementById('export_count');
  if (countEl) {
    countEl.textContent = 'Выбрано: ' + selectedNotesForExport.size + ' из ' + notes.length;
  }

  const btns = document.querySelectorAll('.export_actions .btn_export_action');
  for (let i = 0; i < btns.length; i++) {
    btns[i].disabled = selectedNotesForExport.size === 0;
  }
}

function selectAllForExport() {
  selectedNotesForExport.clear();
  for (let i = 0; i < notes.length; i++) {
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
  const selected = notes.filter(function(n) { return selectedNotesForExport.has(n.id); });
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
  let content = '';
  for (let i = 0; i < notesToExport.length; i++) {
    const note = notesToExport[i];
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
  const exportData = notesToExport.map(function(note) {
    return {
      headline: note.headline,
      text: note.text,
      importance: note.improtance,
      created_date: note.created_date,
      change_date: note.change_date
    };
  });

  const content = JSON.stringify(exportData, null, 2);
  downloadFile(content, notesToExport.length === 1 ? 'note.json' : 'notes.json', 'application/json');
  showToast('Экспортировано ' + notesToExport.length + ' заметок в JSON', 'success');
}

function exportToPdf(notesToExport) {
  const printWindow = window.open('', '_blank');
  let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Заметки</title>';
  html += '<style>';
  html += 'body { font-family: Arial, sans-serif; padding: 20px; }';
  html += '.note { margin-bottom: 30px; page-break-inside: avoid; border-bottom: 1px solid #ccc; padding-bottom: 20px; }';
  html += '.note-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }';
  html += '.note-meta { font-size: 12px; color: #666; margin-bottom: 10px; }';
  html += '.note-content { font-size: 14px; line-height: 1.6; white-space: pre-wrap; }';
  html += '</style></head><body>';
  html += '<h1>Мои заметки</h1>';
  html += '<p style="color: #666;">Экспортировано: ' + new Date().toLocaleString('ru-RU') + ' | Заметок: ' + notesToExport.length + '</p><hr>';

  for (let i = 0; i < notesToExport.length; i++) {
    const note = notesToExport[i];
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
  const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

function updateStatus(status) {
  if (!statusIndicator) return;

  const dot = statusIndicator.querySelector('.status_dot');
  const text = statusIndicator.querySelector('span:last-child');

  dot.classList.remove('saving', 'unsaved', 'error');

  if (status === 'saving') {
    dot.classList.add('saving');
    text.textContent = 'Сохранение...';
  } else if (status === 'unsaved') {
    dot.classList.add('unsaved');
    text.textContent = 'Черновик';
  } else if (status === 'error') {
    dot.classList.add('error');
    text.textContent = 'Ошибка';
  } else {
    text.textContent = 'Сохранено';
  }

  if (btnSave) {
    btnSave.disabled = status !== 'unsaved';
  }

  const btnDiscard = document.getElementById('btn_discard');
  if (btnDiscard) {
    btnDiscard.style.display = status === 'unsaved' ? '' : 'none';
  }
}

function showToast(message, type) {
  if (!toastContainer) return;
  if (!type) type = 'success';

  const toast = document.createElement('div');
  toast.className = 'toast ' + type;

  let icon;
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
  const div = document.createElement('div');
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

  let dateStr = dateString;
  if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
    dateStr = dateStr + 'Z';
  }

  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;

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

async function discardDraft() {
  if (!currentNote) return;

  const noteId = currentNote.id;
  deleteDraft(noteId);
  hasUnsavedChanges = false;

  try {
    const response = await fetch(API_BASE + '/notes/' + noteId);
    if (response.ok) {
      const serverNote = await response.json();

      for (let i = 0; i < notes.length; i++) {
        if (notes[i].id === noteId) {
          notes[i] = serverNote;
          break;
        }
      }

      currentNote = serverNote;
      editorTitle.value = serverNote.headline || '';
      editorContent.value = serverNote.text || '';

      for (let i = 0; i < importanceBtns.length; i++) {
        const btn = importanceBtns[i];
        const level = parseInt(btn.dataset.level);
        if (level === (serverNote.improtance || 1)) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    }
  } catch (error) {
    console.error('Error restoring note:', error);
  }

  updateStatus('saved');
  const searchValue = searchInput ? searchInput.value : '';
  renderNotesList(searchValue);
  showToast('Черновик отменён', 'success');
}

window.addEventListener('beforeunload', function(e) {
  if (hasUnsavedChanges) {
    e.preventDefault();
    e.returnValue = '';
  }
});

window.selectNote = selectNote;
window.selectTrashNote = selectTrashNote;
window.discardDraft = discardDraft;
