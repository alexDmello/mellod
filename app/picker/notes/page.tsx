"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save, FileText, Search, ChevronLeft, StickyNote, CornerDownLeft } from "lucide-react";
import Link from "next/link";

interface PickerNote {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

const DEFAULT_NOTES: PickerNote[] = [
  {
    id: "note-1",
    title: "Burger Joint Key Code",
    content: "Lockbox key code is 2849. The box is located behind the green recycling dumpster next to the back door.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "note-2",
    title: "Ocean View Diner Access",
    content: "Store supervisor prefers collections before 9:00 AM. Enter via the service alleyway. The oil drums are stored on wheels in the pantry area.",
    updatedAt: new Date().toISOString(),
  },
];

export default function NotesPage() {
  const [notes, setNotes] = useState<PickerNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("mellod_picker_notes");
    if (saved) {
      try {
        setNotes(JSON.parse(saved));
      } catch (e) {
        setNotes(DEFAULT_NOTES);
      }
    } else {
      setNotes(DEFAULT_NOTES);
      localStorage.setItem("mellod_picker_notes", JSON.stringify(DEFAULT_NOTES));
    }
  }, []);

  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem("mellod_picker_notes", JSON.stringify(notes));
    }
  }, [notes]);

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
  );

  const selectedNote = notes.find((n) => n.id === selectedNoteId);

  function handleSelectNote(note: PickerNote) {
    setSelectedNoteId(note.id);
    setTitle(note.title);
    setContent(note.content);
  }

  function handleCreateNote() {
    const newNote: PickerNote = {
      id: `note-${Date.now()}`,
      title: "New Note",
      content: "",
      updatedAt: new Date().toISOString(),
    };
    const updated = [newNote, ...notes];
    setNotes(updated);
    handleSelectNote(newNote);
  }

  function handleSave() {
    if (!selectedNoteId) return;
    const updated = notes.map((n) => {
      if (n.id === selectedNoteId) {
        return {
          ...n,
          title: title || "Untitled Note",
          content,
          updatedAt: new Date().toISOString(),
        };
      }
      return n;
    });
    setNotes(updated);
  }

  function handleDelete(id: string) {
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    if (selectedNoteId === id) {
      setSelectedNoteId(null);
      setTitle("");
      setContent("");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-green-700 px-4 pb-3.5 sticky top-0 z-30 flex items-center gap-3" style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}>
        <Link href="/picker" className="text-white hover:text-green-200 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
            <StickyNote className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-none">Note Taking</h1>
            <p className="text-green-200 text-[10px] mt-0.5">PWA Notes Integration</p>
          </div>
        </div>
      </header>

      {/* Editor & Notes Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar List */}
        <div className={`flex-1 flex flex-col p-4 space-y-4 ${selectedNoteId ? "hidden md:flex" : "flex"}`}>
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search notes..."
              className="form-input !pl-9 text-xs py-2.5"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreateNote}
            className="btn btn-secondary text-xs font-bold py-2.5 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create New Note
          </button>

          {/* Notes list */}
          <div className="space-y-2 flex-1 overflow-y-auto max-h-[60vh] md:max-h-none">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 p-6 text-gray-400 text-xs">
                No notes found. Create a new one above.
              </div>
            ) : (
              filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  className={`card p-4 cursor-pointer transition-all border ${
                    selectedNoteId === note.id
                      ? "border-green-600 bg-green-50/20"
                      : "border-gray-100 hover:bg-gray-50/50"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-gray-800 text-sm truncate flex-1">{note.title}</h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(note.id);
                      }}
                      className="text-gray-400 hover:text-red-600 transition-colors p-1"
                      aria-label="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">
                    {note.content || "Empty note content..."}
                  </p>
                  <span className="text-[9px] text-gray-400 block mt-2">
                    Updated: {new Date(note.updatedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Editor Screen */}
        <div className={`flex-1 flex flex-col p-4 bg-white border-t md:border-t-0 md:border-l border-gray-100 ${selectedNoteId ? "flex" : "hidden md:flex"}`}>
          {selectedNoteId ? (
            <div className="flex flex-col h-full space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <button
                  onClick={() => {
                    handleSave();
                    setSelectedNoteId(null);
                  }}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-700 font-semibold md:hidden"
                >
                  <ChevronLeft className="w-4 h-4" /> Back to list
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSave}
                    className="btn btn-primary btn-sm text-xs font-bold flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Note
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Note Title</label>
                <input
                  type="text"
                  className="form-input text-sm font-bold border-gray-200"
                  placeholder="Title of note..."
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                  }}
                  onBlur={handleSave}
                />
              </div>

              <div className="flex-1 flex flex-col space-y-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Content</label>
                <textarea
                  className="form-input flex-1 min-h-[250px] resize-none text-xs leading-relaxed border-gray-200 font-medium"
                  placeholder="Start writing note details here (e.g. gate codes, key contacts, oil container location)..."
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                  }}
                  onBlur={handleSave}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
              <FileText className="w-12 h-12 text-gray-200 mb-3" />
              <h3 className="font-bold text-gray-600 text-sm">No Note Selected</h3>
              <p className="text-xs text-gray-400 max-w-xs mt-1 leading-relaxed">
                Choose a note from the list on the left to start editing, or create a new one.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
