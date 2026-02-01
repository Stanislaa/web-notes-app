var notes = [];
var trashedNotes = [];
var currentNote = null;
var saveTimeout = null;

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
var btnCancelDelete = document.getElementById('btn_cancel_delete');
var btnConfirmDelete = document.getElementById('btn_confirm_delete');
var importanceBtns = document.querySelectorAll('.importance_btn');
var statusIndicator = document.getElementById('status_indicator');
var toastContainer = document.getElementById('toast_container');

var trashList = document.getElementById('trash_list');
var trashTitle = document.getElementById('trash_title');
var trashText = document.getElementById('trash_text');
var btnRestore = document.getElementById('btn_restore');
var btnDeleteForever = document.getElementById('btn_delete_forever');

document.addEventListener('DOMContentLoaded', function() {
  loadNotes();
  setupEventListeners();
});

function loadNotes() {
  var saved = localStorage.getItem('notes');
  var savedTrash = localStorage.getItem('trashedNotes');

  if (saved) {
    notes = JSON.parse(saved);
  } else {
    notes = [];
  }

  if (savedTrash) {
    trashedNotes = JSON.parse(savedTrash);
  } else {
    trashedNotes = [];
  }

  renderNotesList();

  if (trashList) {
    renderTrashList();
  }
}

function saveNotes() {
  localStorage.setItem('notes', JSON.stringify(notes));
  localStorage.setItem('trashedNotes', JSON.stringify(trashedNotes));
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

  for (var i = 0; i < importanceBtns.length; i++) {
    importanceBtns[i].addEventListener('click', function(e) {
      if (!currentNote) return;

      for (var j = 0; j < importanceBtns.length; j++) {
        importanceBtns[j].classList.remove('active');
      }
      e.target.classList.add('active');

      currentNote.improtance = parseInt(e.target.dataset.level);
      saveCurrentNote();
      renderNotesList();
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

  var btnBold = document.getElementById('btn_bold');
  var btnItalic = document.getElementById('btn_italic');
  var btnUnderline = document.getElementById('btn_underline');

  if (btnBold) {
    btnBold.addEventListener('click', function() {
      document.execCommand('bold');
    });
  }
  if (btnItalic) {
    btnItalic.addEventListener('click', function() {
      document.execCommand('italic');
    });
  }
  if (btnUnderline) {
    btnUnderline.addEventListener('click', function() {
      document.execCommand('underline');
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

  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') {
        e.preventDefault();
        document.execCommand('bold');
      }
      if (e.key === 'i') {
        e.preventDefault();
        document.execCommand('italic');
      }
      if (e.key === 'u') {
        e.preventDefault();
        document.execCommand('underline');
      }
      if (e.key === 's') {
        e.preventDefault();
        if (currentNote) {
          saveCurrentNote();
          showToast('Сохранено', 'success');
        }
      }
    }
  });
}

function createNewNote() {
  var note = {
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

  setTimeout(function() {
    editorTitle.focus();
  }, 100);
}

function renderNotesList(searchQuery) {
  if (!notesList) return;

  if (!searchQuery) {
    searchQuery = '';
  }

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
    if (emptyState) {
      emptyState.style.display = 'flex';
    }
    return;
  }

  if (emptyState) {
    emptyState.style.display = 'none';
  }

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

function renderTrashList() {
  if (!trashList) return;

  if (trashedNotes.length === 0) {
    trashList.innerHTML = '<div class="empty_state"><p>Корзина пуста</p></div>';
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
    html += '<span class="note_item_date">' + date + '</span>';
    html += '</div>';
    html += '</div>';
  }

  trashList.innerHTML = html;
}

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
  editorContent.innerHTML = currentNote.text || '';

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
    trashText.innerHTML = currentNote.text || '<em>Нет текста</em>';
  }

  renderTrashList();
}

function handleEditorChange() {
  if (!currentNote) return;

  updateStatus('saving');

  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(function() {
    currentNote.headline = editorTitle.value;
    currentNote.text = editorContent.innerHTML;
    currentNote.change_date = new Date().toISOString();

    saveCurrentNote();
    updateStatus('saved');
  }, 500);
}

function saveCurrentNote() {
  if (!currentNote) return;

  for (var i = 0; i < notes.length; i++) {
    if (notes[i].id === currentNote.id) {
      notes[i] = {
        id: currentNote.id,
        headline: currentNote.headline,
        text: currentNote.text,
        improtance: currentNote.improtance,
        created_date: currentNote.created_date,
        change_date: currentNote.change_date
      };
      break;
    }
  }

  saveNotes();
  var searchValue = searchInput ? searchInput.value : '';
  renderNotesList(searchValue);
}

function deleteCurrentNote() {
  if (!currentNote) return;

  if (trashList) {
    var newTrashedNotes = [];
    for (var i = 0; i < trashedNotes.length; i++) {
      if (trashedNotes[i].id !== currentNote.id) {
        newTrashedNotes.push(trashedNotes[i]);
      }
    }
    trashedNotes = newTrashedNotes;
    saveNotes();
    currentNote = null;

    if (noSelection) noSelection.style.display = 'flex';
    if (editor) editor.style.display = 'none';

    renderTrashList();
    showToast('Заметка удалена навсегда', 'success');
  } else {
    currentNote.deleted_date = new Date().toISOString();
    trashedNotes.unshift(currentNote);

    var newNotes = [];
    for (var i = 0; i < notes.length; i++) {
      if (notes[i].id !== currentNote.id) {
        newNotes.push(notes[i]);
      }
    }
    notes = newNotes;

    saveNotes();
    currentNote = null;

    if (noSelection) noSelection.style.display = 'flex';
    if (editor) editor.style.display = 'none';

    renderNotesList();
    showToast('Заметка перемещена в корзину', 'success');
  }

  modalDelete.classList.remove('active');
}

function restoreNote() {
  if (!currentNote) return;

  delete currentNote.deleted_date;
  notes.unshift(currentNote);

  var newTrashedNotes = [];
  for (var i = 0; i < trashedNotes.length; i++) {
    if (trashedNotes[i].id !== currentNote.id) {
      newTrashedNotes.push(trashedNotes[i]);
    }
  }
  trashedNotes = newTrashedNotes;

  saveNotes();
  currentNote = null;

  if (noSelection) noSelection.style.display = 'flex';
  if (editor) editor.style.display = 'none';

  renderTrashList();
  showToast('Заметка восстановлена', 'success');
}

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

  if (!type) {
    type = 'success';
  }

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
    setTimeout(function() {
      toast.remove();
    }, 300);
  }, 3000);
}

function escapeHtml(text) {
  if (!text) return '';
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getPreview(html) {
  if (!html) return 'Нет текста';
  var div = document.createElement('div');
  div.innerHTML = html;
  var text = div.textContent || div.innerText;
  if (text.length > 50) {
    return text.substring(0, 50) + '...';
  }
  if (!text) {
    return 'Нет текста';
  }
  return text;
}

function formatDate(dateString) {
  if (!dateString) return '—';

  var date = new Date(dateString);
  var now = new Date();
  var diff = now - date;

  if (diff < 60000) {
    return 'Только что';
  }

  if (diff < 3600000) {
    var mins = Math.floor(diff / 60000);
    return mins + ' мин. назад';
  }

  if (diff < 86400000) {
    var hours = Math.floor(diff / 3600000);
    return hours + ' ч. назад';
  }

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

window.selectNote = selectNote;
window.selectTrashNote = selectTrashNote;
