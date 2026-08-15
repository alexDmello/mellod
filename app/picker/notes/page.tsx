"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save, FileText, Search, ChevronLeft, StickyNote } from "lucide-react";
import PickerHeader from "@/components/PickerHeader";

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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Header */}
      <PickerHeader subtitle="PWA Notes Integration" showBack={true}>
        <div className="space-y-0.5">
          <h1 className="text-white font-black text-lg leading-none drop-shadow-sm">Field Note Taking</h1>
          <p className="text-emerald-100 text-xs mt-1 font-medium">Record gate codes & store contacts on-device</p>
        </div>
      </PickerHeader>

      {/* Editor & Notes Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">
        {/* Sidebar List */}
        <div className={`flex-1 flex flex-col p-4 space-y-4 ${selectedNoteId ? "hidden md:flex" : "flex"}`}>
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search notes..."
              className="w-full pl-10 pr-3 py-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreateNote}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            Create New Note
          </button>

          {/* Notes list */}
          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[60vh] md:max-h-none">
            {filteredNotes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center py-12 text-slate-400 font-medium text-xs shadow-sm">
                No notes found. Create a new one above.
              </div>
            ) : (
              filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                    selectedNoteId === note.id
                      ? "border-emerald-600 bg-emerald-50/50 shadow-md shadow-emerald-600/10"
                      : "bg-white border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-slate-900 text-sm truncate flex-1">{note.title}</h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(note.id);
                      }}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                      aria-label="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-1 leading-relaxed">
                    {note.content || "Empty note content..."}
                  </p>
                  <span className="text-[9px] text-slate-400 font-semibold block mt-2">
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
        <div className={`flex-1 flex flex-col p-4 m-4 md:m-0 bg-white rounded-2xl md:rounded-none border border-slate-100 md:border-y-0 md:border-r-0 md:border-l shadow-sm ${selectedNoteId ? "flex" : "hidden md:flex"}`}>
          {selectedNoteId ? (
            <div className="flex flex-col h-full space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <button
                  onClick={() => {
                    handleSave();
                    setSelectedNoteId(null);
                  }}
                  className="flex items-center gap-1 text-xs text-slate-600 hover:text-emerald-700 font-bold md:hidden cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Back to list
                </button>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={handleSave}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-white" />
                    Save Note
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Note Title</label>
                <input
                  type="text"
                  className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  placeholder="Title of note..."
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                  }}
                  onBlur={handleSave}
                />
              </div>

              <div className="flex-1 flex flex-col space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Content</label>
                <textarea
                  className="w-full flex-1 min-h-[250px] resize-none text-xs leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
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
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <FileText className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="font-bold text-slate-700 text-sm">No Note Selected</h3>
              <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed font-medium">
                Choose a note from the list on the left to start editing, or create a new one.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
