// API Base URL
const API_URL = '';

// State
let notes = [];
let trashedNotes = [];
let currentNote = null;
let saveTimeout = null;

// DOM Elements
const notesList = document.getElementById('notes-list');
const emptyState = document.getElementById('empty-state');
const noSelection = document.getElementById('no-selection');
const editor = document.getElementById('editor');
const editorTitle = document.getElementById('editor-title');
const editorContent = document.getElementById('editor-content');
const metaCreated = document.getElementById('meta-created');
const metaModified = document.getElementById('meta-modified');
const searchInput = document.getElementById('search-input');
const btnNewNote = document.getElementById('btn-new-note');
const btnDelete = document.getElementById('btn-delete');
const modalDelete = document.getElementById('modal-delete');
const btnCancelDelete = document.getElementById('btn-cancel-delete');
const btnConfirmDelete = document.getElementById('btn-confirm-delete');
const importanceBtns = document.querySelectorAll('.importance-btn');
const statusIndicator = document.getElementById('status-indicator');
const toastContainer = document.getElementById('toast-container');

// Trash page elements
const trashList = document.getElementById('trash-list');
const trashTitle = document.getElementById('trash-title');
const trashText = document.getElementById('trash-text');
const btnRestore = document.getElementById('btn-restore');
const btnDeleteForever = document.getElementById('btn-delete-forever');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadNotes();
  setupEventListeners();
});

// Load notes from localStorage (will be replaced with API calls)
function loadNotes() {
  const saved = localStorage.getItem('notes');
  const savedTrash = localStorage.getItem('trashedNotes');

  notes = saved ? JSON.parse(saved) : [];
  trashedNotes = savedTrash ? JSON.parse(savedTrash) : [];

  renderNotesList();

  if (trashList) {
    renderTrashList();
  }
}

// Save notes to localStorage
function saveNotes() {
  localStorage.setItem('notes', JSON.stringify(notes));
  localStorage.setItem('trashedNotes', JSON.stringify(trashedNotes));
}

// Setup event listeners
function setupEventListeners() {
  // New note button
  if (btnNewNote) {
    btnNewNote.addEventListener('click', createNewNote);
  }

  // Search
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderNotesList(e.target.value);
    });
  }

  // Editor events
  if (editorTitle) {
    editorTitle.addEventListener('input', handleEditorChange);
  }

  if (editorContent) {
    editorContent.addEventListener('input', handleEditorChange);
  }

  // Importance buttons
  importanceBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!currentNote) return;

      importanceBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      currentNote.improtance = parseInt(btn.dataset.level);
      saveCurrentNote();
      renderNotesList();
    });
  });

  // Delete button
  if (btnDelete) {
    btnDelete.addEventListener('click', () => {
      if (currentNote) {
        modalDelete.classList.add('active');
      }
    });
  }

  // Modal buttons
  if (btnCancelDelete) {
    btnCancelDelete.addEventListener('click', () => {
      modalDelete.classList.remove('active');
    });
  }

  if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener('click', deleteCurrentNote);
  }

  // Close modal on overlay click
  if (modalDelete) {
    modalDelete.addEventListener('click', (e) => {
      if (e.target === modalDelete) {
        modalDelete.classList.remove('active');
      }
    });
  }

  // Formatting buttons
  const btnBold = document.getElementById('btn-bold');
  const btnItalic = document.getElementById('btn-italic');
  const btnUnderline = document.getElementById('btn-underline');

  if (btnBold) {
    btnBold.addEventListener('click', () => document.execCommand('bold'));
  }
  if (btnItalic) {
    btnItalic.addEventListener('click', () => document.execCommand('italic'));
  }
  if (btnUnderline) {
    btnUnderline.addEventListener('click', () => document.execCommand('underline'));
  }

  // Trash page buttons
  if (btnRestore) {
    btnRestore.addEventListener('click', restoreNote);
  }

  if (btnDeleteForever) {
    btnDeleteForever.addEventListener('click', () => {
      if (currentNote) {
        modalDelete.classList.add('active');
      }
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          document.execCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          document.execCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          document.execCommand('underline');
          break;
        case 's':
          e.preventDefault();
          if (currentNote) {
            saveCurrentNote();
            showToast('Сохранено', 'success');
          }
          break;
      }
    }
  });
}

// Create new note
function createNewNote() {
  const note = {
    id: Date.now(),
    headline: '',
    text: '',
    improtance: 1,
    created_date: new Date().toISOString(),
    change_date: null
  };

  notes.unshift(note);
  saveNotes();
  renderNotesList();
  selectNote(note.id);

  // Focus on title
  setTimeout(() => {
    editorTitle.focus();
  }, 100);
}

// Render notes list
function renderNotesList(searchQuery = '') {
  if (!notesList) return;

  const filteredNotes = notes.filter(note => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (note.headline && note.headline.toLowerCase().includes(query)) ||
      (note.text && note.text.toLowerCase().includes(query))
    );
  });

  if (filteredNotes.length === 0) {
    notesList.innerHTML = '';
    if (emptyState) {
      emptyState.style.display = 'flex';
    }
    return;
  }

  if (emptyState) {
    emptyState.style.display = 'none';
  }

  notesList.innerHTML = filteredNotes.map(note => `
    <div class="note-item ${currentNote && currentNote.id === note.id ? 'active' : ''}"
         data-id="${note.id}"
         data-importance="${note.improtance || 1}"
         onclick="selectNote(${note.id})">
      <div class="note-item-title">${escapeHtml(note.headline) || 'Без названия'}</div>
      <div class="note-item-preview">${getPreview(note.text)}</div>
      <div class="note-item-meta">
        <span class="note-item-date">${formatDate(note.change_date || note.created_date)}</span>
        <span class="importance-badge" data-level="${note.improtance || 1}">
          ${getImportanceLabel(note.improtance || 1)}
        </span>
      </div>
    </div>
  `).join('');
}

// Render trash list
function renderTrashList() {
  if (!trashList) return;

  if (trashedNotes.length === 0) {
    trashList.innerHTML = '<div class="empty-state"><p>Корзина пуста</p></div>';
    return;
  }

  trashList.innerHTML = trashedNotes.map(note => `
    <div class="note-item ${currentNote && currentNote.id === note.id ? 'active' : ''}"
         data-id="${note.id}"
         data-importance="${note.improtance || 1}"
         onclick="selectTrashNote(${note.id})">
      <div class="note-item-title">${escapeHtml(note.headline) || 'Без названия'}</div>
      <div class="note-item-preview">${getPreview(note.text)}</div>
      <div class="note-item-meta">
        <span class="note-item-date">${formatDate(note.deleted_date)}</span>
      </div>
    </div>
  `).join('');
}

// Select note
function selectNote(id) {
  currentNote = notes.find(n => n.id === id);

  if (!currentNote) return;

  // Update UI
  if (noSelection) noSelection.style.display = 'none';
  if (editor) editor.style.display = 'block';

  // Fill editor
  editorTitle.value = currentNote.headline || '';
  editorContent.innerHTML = currentNote.text || '';

  // Update meta
  if (metaCreated) {
    metaCreated.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
      </svg>
      Создано: ${formatDate(currentNote.created_date)}
    `;
  }

  if (metaModified) {
    metaModified.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      Изменено: ${currentNote.change_date ? formatDate(currentNote.change_date) : '—'}
    `;
  }

  // Update importance buttons
  importanceBtns.forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.level) === (currentNote.improtance || 1));
  });

  // Update notes list
  renderNotesList(searchInput ? searchInput.value : '');
}

// Select trash note
function selectTrashNote(id) {
  currentNote = trashedNotes.find(n => n.id === id);

  if (!currentNote) return;

  if (trashTitle) {
    trashTitle.textContent = currentNote.headline || 'Без названия';
  }

  if (trashText) {
    trashText.innerHTML = currentNote.text || '<em>Нет текста</em>';
  }

  renderTrashList();
}

// Handle editor change
function handleEditorChange() {
  if (!currentNote) return;

  // Show saving status
  updateStatus('saving');

  // Debounce save
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    currentNote.headline = editorTitle.value;
    currentNote.text = editorContent.innerHTML;
    currentNote.change_date = new Date().toISOString();

    saveCurrentNote();
    updateStatus('saved');
  }, 500);
}

// Save current note
function saveCurrentNote() {
  if (!currentNote) return;

  const index = notes.findIndex(n => n.id === currentNote.id);
  if (index !== -1) {
    notes[index] = { ...currentNote };
  }

  saveNotes();
  renderNotesList(searchInput ? searchInput.value : '');
}

// Delete current note
function deleteCurrentNote() {
  if (!currentNote) return;

  // Check if we're on trash page
  if (trashList) {
    // Permanent delete
    trashedNotes = trashedNotes.filter(n => n.id !== currentNote.id);
    saveNotes();
    currentNote = null;

    if (trashTitle) trashTitle.textContent = 'Выберите заметку';
    if (trashText) trashText.innerHTML = '';

    renderTrashList();
    showToast('Заметка удалена навсегда', 'success');
  } else {
    // Move to trash
    currentNote.deleted_date = new Date().toISOString();
    trashedNotes.unshift(currentNote);
    notes = notes.filter(n => n.id !== currentNote.id);

    saveNotes();
    currentNote = null;

    if (noSelection) noSelection.style.display = 'flex';
    if (editor) editor.style.display = 'none';

    renderNotesList();
    showToast('Заметка перемещена в корзину', 'success');
  }

  modalDelete.classList.remove('active');
}

// Restore note from trash
function restoreNote() {
  if (!currentNote) return;

  delete currentNote.deleted_date;
  notes.unshift(currentNote);
  trashedNotes = trashedNotes.filter(n => n.id !== currentNote.id);

  saveNotes();
  currentNote = null;

  if (trashTitle) trashTitle.textContent = 'Выберите заметку';
  if (trashText) trashText.innerHTML = '';

  renderTrashList();
  showToast('Заметка восстановлена', 'success');
}

// Update status indicator
function updateStatus(status) {
  if (!statusIndicator) return;

  const dot = statusIndicator.querySelector('.status-dot');
  const text = statusIndicator.querySelector('span:last-child');

  if (status === 'saving') {
    dot.classList.add('saving');
    text.textContent = 'Сохранение...';
  } else {
    dot.classList.remove('saving');
    text.textContent = 'Сохранено';
  }
}

// Show toast notification
function showToast(message, type = 'success') {
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = type === 'success'
    ? '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';

  toast.innerHTML = `${icon}<span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Utility functions
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getPreview(html) {
  if (!html) return 'Нет текста';
  const div = document.createElement('div');
  div.innerHTML = html;
  const text = div.textContent || div.innerText;
  return text.length > 50 ? text.substring(0, 50) + '...' : text || 'Нет текста';
}

function formatDate(dateString) {
  if (!dateString) return '—';

  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  // Less than 1 minute
  if (diff < 60000) {
    return 'Только что';
  }

  // Less than 1 hour
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return `${mins} мин. назад`;
  }

  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} ч. назад`;
  }

  // Same year
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  }

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getImportanceLabel(level) {
  switch (level) {
    case 1: return 'Обычная';
    case 2: return 'Важная';
    case 3: return 'Срочная';
    default: return 'Обычная';
  }
}

// Make functions available globally
window.selectNote = selectNote;
window.selectTrashNote = selectTrashNote;
