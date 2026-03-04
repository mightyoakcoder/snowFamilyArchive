import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api.js";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Barlow:wght@300;400;500;600&display=swap');

  :root {
    --bg:       #18191d;
    --surface:  #1f2128;
    --surface2: #272a33;
    --border:   #2e3140;
    --border2:  #353849;
    --accent:   #7b8cff;
    --accent2:  #a5b0ff;
    --dim:      #565c78;
    --text:     #d4d8e8;
    --text2:    #8d93ad;
    --success:  #4ade98;
    --error:    #f07070;
    --warn:     #fbbf24;
  }

  /* ── Layout ── */
  .gal-root {
    font-family: 'Barlow', sans-serif;
    width: 100%;
    display: flex;
    justify-content: center;
    padding: 2rem 1.25rem 3rem;
    box-sizing: border-box;
  }

  .gal-inner {
    width: 100%;
    max-width: 1100px;
    opacity: 0;
    transform: translateY(14px);
    animation: galFadeIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    box-sizing: border-box;
  }

  @keyframes galFadeIn  { to { opacity: 1; transform: translateY(0); } }
  @keyframes galSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes galSpin    { to { transform: rotate(360deg); } }
  @keyframes galPop     { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }

  /* ── Header ── */
  .gal-header { margin-bottom: 2rem; }
  .gal-eyebrow {
    font-family: 'DM Mono', monospace;
    font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--accent); opacity: 0.8; margin-bottom: 0.6rem;
  }
  .gal-title {
    font-size: clamp(1.7rem, 5vw, 2.1rem); font-weight: 600;
    letter-spacing: -0.01em; color: var(--text); line-height: 1.1; margin: 0;
  }
  .gal-subtitle { font-size: 0.875rem; color: var(--text2); margin-top: 0.4rem; font-weight: 300; }

  /* ── Toolbar ── */
  .gal-toolbar {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    align-items: center;
  }

  .gal-search-wrap { position: relative; flex: 1; min-width: 200px; }
  .gal-search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--dim); pointer-events: none; }
  .gal-search {
    width: 100%; background: var(--surface); border: 1px solid var(--border2); border-radius: 10px;
    padding: 0.6rem 0.75rem 0.6rem 2.25rem; font-family: 'Barlow', sans-serif;
    font-size: 0.875rem; color: var(--text); outline: none;
    transition: border-color 0.15s, box-shadow 0.15s; box-sizing: border-box;
  }
  .gal-search:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(123,140,255,0.12); }
  .gal-search::placeholder { color: var(--dim); }

  .gal-filter-btn {
    display: flex; align-items: center; gap: 0.4rem;
    background: var(--surface); border: 1px solid var(--border2); border-radius: 10px;
    padding: 0.6rem 0.875rem; font-family: 'Barlow', sans-serif;
    font-size: 0.8rem; color: var(--text2); cursor: pointer;
    transition: border-color 0.15s, color 0.15s; white-space: nowrap;
  }
  .gal-filter-btn:hover, .gal-filter-btn.active { border-color: var(--accent); color: var(--text); }
  .gal-filter-btn.active { background: rgba(123,140,255,0.08); color: var(--accent2); }

  .gal-view-btns { display: flex; gap: 0.25rem; }
  .gal-view-btn {
    background: var(--surface); border: 1px solid var(--border2); border-radius: 8px;
    padding: 0.5rem; color: var(--dim); cursor: pointer; display: flex; align-items: center;
    transition: color 0.15s, border-color 0.15s;
  }
  .gal-view-btn.active { border-color: var(--accent); color: var(--accent); background: rgba(123,140,255,0.08); }
  .gal-view-btn:hover:not(.active) { color: var(--text2); }

  /* ── Filter panel ── */
  .gal-filters {
    background: var(--surface); border: 1px solid var(--border2); border-radius: 12px;
    padding: 1rem 1.25rem; margin-bottom: 1.25rem;
    display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.875rem;
    animation: galSlideIn 0.2s ease;
  }
  .gal-filter-field { display: flex; flex-direction: column; gap: 0.3rem; }
  .gal-filter-label {
    font-family: 'DM Mono', monospace; font-size: 10px;
    letter-spacing: 0.1em; text-transform: uppercase; color: var(--dim);
  }
  .gal-filter-input {
    background: var(--bg); border: 1px solid var(--border2); border-radius: 8px;
    padding: 0.5rem 0.65rem; font-family: 'Barlow', sans-serif; font-size: 0.825rem;
    color: var(--text); outline: none; transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box; width: 100%;
  }
  .gal-filter-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(123,140,255,0.12); }
  .gal-filter-input::placeholder { color: var(--dim); }
  .gal-filter-input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }

  /* ── Count bar ── */
  .gal-count-bar {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 1rem;
  }
  .gal-count {
    font-family: 'DM Mono', monospace; font-size: 10px;
    letter-spacing: 0.12em; text-transform: uppercase; color: var(--dim);
  }
  .gal-clear-btn {
    background: none; border: none; cursor: pointer; font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--accent); opacity: 0.7; transition: opacity 0.15s;
  }
  .gal-clear-btn:hover { opacity: 1; }

  /* ── Grid ── */
  .gal-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1rem;
  }

  .gal-grid.list {
    grid-template-columns: 1fr;
    gap: 0.625rem;
  }

  /* ── Grid card ── */
  .gal-card {
    background: var(--surface); border: 1px solid var(--border2); border-radius: 12px;
    overflow: hidden; cursor: pointer; position: relative;
    transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
    animation: galSlideIn 0.25s ease both;
  }
  .gal-card:hover {
    border-color: var(--accent);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.35);
  }

  .gal-card-thumb {
    width: 100%; aspect-ratio: 4/3; object-fit: cover; display: block;
    background: var(--surface2);
  }

  .gal-card-thumb-placeholder {
    width: 100%; aspect-ratio: 4/3; background: var(--surface2);
    display: flex; align-items: center; justify-content: center; color: var(--dim);
  }

  .gal-card-body { padding: 0.75rem; }
  .gal-card-desc {
    font-size: 0.8rem;
    color: var(--text2);
    margin-bottom: 0.3rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.4;
  }
  .gal-card-meta { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
  .gal-card-date {
    font-family: 'DM Mono', monospace; font-size: 0.68rem;
    color: var(--dim);
  }
  .gal-card-date.unknown { color: var(--warn); opacity: 0.7; }
  .gal-card-people {
    font-family: 'DM Mono', monospace; font-size: 0.68rem; color: var(--dim);
  }

  /* ── List row ── */
  .gal-list-row {
    background: var(--surface); border: 1px solid var(--border2); border-radius: 10px;
    display: flex; align-items: center; gap: 0.875rem; padding: 0.75rem 1rem;
    cursor: pointer; transition: border-color 0.15s, background 0.15s;
    animation: galSlideIn 0.2s ease both;
  }
  .gal-list-row:hover { border-color: var(--accent); background: rgba(123,140,255,0.03); }
  .gal-list-thumb {
    width: 56px; height: 42px; object-fit: cover; border-radius: 6px;
    flex-shrink: 0; background: var(--surface2);
  }
  .gal-list-thumb-placeholder {
    width: 56px; height: 42px; border-radius: 6px; flex-shrink: 0;
    background: var(--surface2); display: flex; align-items: center; justify-content: center; color: var(--dim);
  }
  .gal-list-info { flex: 1; min-width: 0; }
  .gal-list-name { font-size: 0.875rem; font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .gal-list-meta { display: flex; gap: 0.75rem; margin-top: 0.15rem; }
  .gal-list-date { font-family: 'DM Mono', monospace; font-size: 0.7rem; color: var(--dim); }
  .gal-list-date.unknown { color: var(--warn); opacity: 0.7; }
  .gal-list-people { font-family: 'DM Mono', monospace; font-size: 0.7rem; color: var(--dim); }
  .gal-list-desc { font-size: 0.78rem; color: var(--text2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; max-width: 200px; }

  /* ── Loading / empty ── */
  .gal-spinner {
    width: 28px; height: 28px; border: 2px solid var(--border2);
    border-top-color: var(--accent); border-radius: 50%;
    animation: galSpin 0.7s linear infinite; margin: 3rem auto;
  }
  .gal-empty {
    font-family: 'DM Mono', monospace; font-size: 0.73rem; color: var(--dim);
    padding: 3rem 0; text-align: center; letter-spacing: 0.06em;
  }

  /* ── Lightbox overlay ── */
  .gal-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,0.88);
    display: flex; align-items: center; justify-content: center;
    padding: 1rem;
    animation: galFadeIn 0.15s ease;
  }

  .gal-lightbox {
    position: relative;
    display: flex;
    gap: 0;
    max-width: 1000px;
    width: 100%;
    max-height: 90vh;
    border-radius: 16px;
    overflow: hidden;
    background: var(--surface);
    border: 1px solid var(--border2);
    box-shadow: 0 24px 64px rgba(0,0,0,0.7);
    animation: galPop 0.2s cubic-bezier(0.22,1,0.36,1);
  }

  /* image side */
  .gal-lb-image-wrap {
    flex: 1;
    min-width: 0;
    background: #0a0a0c;
    display: flex; align-items: center; justify-content: center;
    position: relative;
    min-height: 300px;
  }

  .gal-lb-img {
    max-width: 100%; max-height: 90vh;
    object-fit: contain; display: block;
  }

  .gal-lb-placeholder {
    display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
    color: var(--dim); padding: 3rem;
  }

  /* nav arrows */
  .gal-lb-arrow {
    position: absolute; top: 50%; transform: translateY(-50%);
    background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px; color: var(--text2); cursor: pointer;
    padding: 0.5rem; display: flex; align-items: center;
    transition: background 0.15s, color 0.15s;
    z-index: 10;
  }
  .gal-lb-arrow:hover { background: rgba(123,140,255,0.2); color: var(--text); }
  .gal-lb-arrow.prev { left: 0.75rem; }
  .gal-lb-arrow.next { right: 0.75rem; }
  .gal-lb-arrow:disabled { opacity: 0.2; cursor: default; }

  /* info panel */
  .gal-lb-info {
    width: 260px; flex-shrink: 0;
    display: flex; flex-direction: column;
    border-left: 1px solid var(--border2);
    overflow-y: auto;
  }

  .gal-lb-info-head {
    padding: 1.25rem 1.25rem 0;
    display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem;
  }

  .gal-lb-filename {
    font-size: 0.875rem; font-weight: 600; color: var(--text);
    word-break: break-word; line-height: 1.4;
  }

  .gal-lb-close {
    background: none; border: none; cursor: pointer; color: var(--dim);
    padding: 0.1rem; flex-shrink: 0; display: flex; align-items: center;
    transition: color 0.15s;
  }
  .gal-lb-close:hover { color: var(--error); }

  .gal-lb-meta { padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 0.875rem; flex: 1; }

  .gal-lb-field { display: flex; flex-direction: column; gap: 0.3rem; }
  .gal-lb-key {
    font-family: 'DM Mono', monospace; font-size: 9px;
    letter-spacing: 0.12em; text-transform: uppercase; color: var(--dim);
  }
  .gal-lb-val { font-size: 0.825rem; color: var(--text2); line-height: 1.5; }
  .gal-lb-val.unknown { color: var(--warn); opacity: 0.7; font-style: italic; }
  .gal-lb-pill {
    display: inline-flex; align-items: center;
    background: rgba(123,140,255,0.1); border: 1px solid rgba(123,140,255,0.2);
    color: var(--accent2); font-size: 0.72rem; padding: 1px 8px;
    border-radius: 99px; margin: 1px 2px;
  }

  .gal-lb-counter {
    font-family: 'DM Mono', monospace; font-size: 10px;
    color: var(--dim); letter-spacing: 0.08em;
    padding: 0.875rem 1.25rem;
    border-top: 1px solid var(--border);
    margin-top: auto;
    display: flex; align-items: center; justify-content: space-between;
  }

  .gal-lb-edit-btn {
    display: flex; align-items: center; gap: 0.35rem;
    background: none; border: 1px solid var(--border2); border-radius: 7px;
    padding: 0.3rem 0.65rem; color: var(--text2); cursor: pointer;
    font-family: 'Barlow', sans-serif; font-size: 0.775rem; font-weight: 500;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }
  .gal-lb-edit-btn:hover { border-color: var(--accent); color: var(--accent2); background: rgba(123,140,255,0.08); }

  .gal-lb-delete-btn {
    display: flex; align-items: center; gap: 0.35rem;
    background: none; border: 1px solid var(--border2); border-radius: 7px;
    padding: 0.3rem 0.65rem; color: var(--text2); cursor: pointer;
    font-family: 'Barlow', sans-serif; font-size: 0.775rem; font-weight: 500;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }
  .gal-lb-delete-btn:hover { border-color: var(--error); color: var(--error); background: rgba(240,112,112,0.08); }

  .gal-lb-confirm {
    display: flex; align-items: center; gap: 0.5rem;
    animation: galSlideIn 0.15s ease;
  }
  .gal-lb-confirm-text {
    font-family: 'DM Mono', monospace; font-size: 10px;
    color: var(--text2); letter-spacing: 0.04em;
  }
  .gal-lb-confirm-yes {
    padding: 0.28rem 0.65rem; border: none; border-radius: 6px;
    background: var(--error); color: #fff; font-family: 'Barlow', sans-serif;
    font-size: 0.75rem; font-weight: 600; cursor: pointer;
    transition: opacity 0.15s;
  }
  .gal-lb-confirm-yes:hover { opacity: 0.85; }
  .gal-lb-confirm-yes:disabled { opacity: 0.5; cursor: not-allowed; }
  .gal-lb-confirm-no {
    padding: 0.28rem 0.55rem; border: 1px solid var(--border2); border-radius: 6px;
    background: none; color: var(--text2); font-family: 'Barlow', sans-serif;
    font-size: 0.75rem; cursor: pointer; transition: border-color 0.15s, color 0.15s;
  }
  .gal-lb-confirm-no:hover { border-color: var(--text2); color: var(--text); }

  /* ── Edit modal (reuses design-system tokens) ── */
  .gal-overlay-modal {
    position: fixed; inset: 0; background: rgba(0,0,0,0.75);
    display: flex; align-items: center; justify-content: center;
    z-index: 300; padding: 1rem;
    animation: galFadeIn 0.15s ease;
  }
  .gal-modal {
    background: var(--surface); border: 1px solid var(--border2); border-radius: 16px;
    padding: 1.75rem; width: 100%; max-width: 480px;
    box-shadow: 0 16px 48px rgba(0,0,0,0.6);
    animation: galPop 0.2s cubic-bezier(0.22,1,0.36,1);
  }
  .gal-modal-title { font-size: 1.05rem; font-weight: 600; color: var(--text); margin: 0 0 1.25rem; }
  .gal-modal-fields { display: flex; flex-direction: column; gap: 0.875rem; }
  .gal-modal-field  { display: flex; flex-direction: column; gap: 0.35rem; }
  .gal-modal-label  {
    font-family: 'DM Mono', monospace; font-size: 10px;
    letter-spacing: 0.1em; text-transform: uppercase; color: var(--dim);
  }
  .gal-modal-input, .gal-modal-textarea {
    background: var(--bg); border: 1px solid var(--border2); border-radius: 8px;
    padding: 0.6rem 0.75rem; font-family: 'Barlow', sans-serif; font-size: 0.875rem;
    color: var(--text); outline: none; transition: border-color 0.15s, box-shadow 0.15s;
    width: 100%; box-sizing: border-box;
  }
  .gal-modal-input:focus, .gal-modal-textarea:focus {
    border-color: var(--accent); box-shadow: 0 0 0 3px rgba(123,140,255,0.12);
  }
  .gal-modal-input::placeholder, .gal-modal-textarea::placeholder { color: var(--dim); }
  .gal-modal-textarea { resize: vertical; min-height: 80px; line-height: 1.5; }
  .gal-modal-input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }
  .gal-modal-actions { display: flex; gap: 0.75rem; margin-top: 1.5rem; }
  .gal-modal-cancel {
    flex: 1; padding: 0.75rem; border: 1px solid var(--border2); border-radius: 10px;
    background: none; color: var(--text2); font-family: 'Barlow', sans-serif;
    font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: border-color 0.15s, color 0.15s;
  }
  .gal-modal-cancel:hover { border-color: var(--accent); color: var(--text); }
  .gal-modal-save {
    flex: 1; padding: 0.75rem; border: none; border-radius: 10px;
    background: var(--accent); color: #fff; font-family: 'Barlow', sans-serif;
    font-size: 0.875rem; font-weight: 600; cursor: pointer;
    transition: opacity 0.15s; box-shadow: 0 2px 12px rgba(123,140,255,0.25);
  }
  .gal-modal-save:hover { opacity: 0.88; }
  .gal-modal-save:disabled { opacity: 0.5; cursor: not-allowed; }

  /* People tag input (scoped to gal-) */
  .gal-people-wrap { position: relative; }
  .gal-people-box {
    background: var(--bg); border: 1px solid var(--border2); border-radius: 8px;
    padding: 0.5rem 0.75rem; display: flex; flex-wrap: wrap; gap: 0.4rem;
    align-items: center; transition: border-color 0.15s, box-shadow 0.15s; cursor: text; min-height: 42px;
  }
  .gal-people-box:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(123,140,255,0.12); }
  .gal-tag {
    display: flex; align-items: center; gap: 0.3rem;
    background: rgba(123,140,255,0.15); border: 1px solid rgba(123,140,255,0.25);
    color: var(--accent2); font-size: 0.78rem; padding: 2px 8px 2px 10px; border-radius: 99px;
  }
  .gal-tag-remove {
    background: none; border: none; cursor: pointer; color: var(--accent2);
    padding: 0; line-height: 1; display: flex; opacity: 0.6; transition: opacity 0.15s;
  }
  .gal-tag-remove:hover { opacity: 1; }
  .gal-people-input {
    background: none; border: none; outline: none; color: var(--text);
    font-family: 'Barlow', sans-serif; font-size: 0.875rem;
    flex: 1; min-width: 100px; padding: 0.15rem 0;
  }
  .gal-people-input::placeholder { color: var(--dim); }
  .gal-suggestions {
    position: absolute; top: calc(100% + 4px); left: 0; right: 0;
    background: var(--surface2); border: 1px solid var(--border2); border-radius: 8px;
    overflow: hidden; z-index: 400; box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    animation: galSlideIn 0.15s ease;
  }
  .gal-suggestion { padding: 0.6rem 0.875rem; font-size: 0.875rem; color: var(--text2); cursor: pointer; transition: background 0.1s; }
  .gal-suggestion:hover, .gal-suggestion.focused { background: rgba(123,140,255,0.1); color: var(--text); }
  .gal-suggestion mark { background: none; color: var(--accent2); font-weight: 600; }

  /* responsive */
  @media (max-width: 680px) {
    .gal-root { padding: 1.25rem 1rem 2rem; }
    .gal-filters { grid-template-columns: 1fr; }
    .gal-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.625rem; }
    .gal-lightbox { flex-direction: column; max-height: 95vh; }
    .gal-lb-info { width: 100%; border-left: none; border-top: 1px solid var(--border2); max-height: 220px; }
    .gal-lb-image-wrap { min-height: 200px; }
    .gal-list-desc { display: none; }
  }

  /* ── Privacy lock badge on cards ── */
  .gal-lock {
    position: absolute; top: 0.5rem; right: 0.5rem;
    width: 26px; height: 26px; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(6px);
  }
  .gal-lock.private  { background: rgba(251,191,36,0.18); color: var(--warn); border: 1px solid rgba(251,191,36,0.3); }
  .gal-lock.public   { background: rgba(74,222,152,0.12); color: var(--success); border: 1px solid rgba(74,222,152,0.25); }
  .gal-list-lock { display: flex; align-items: center; flex-shrink: 0; }
  .gal-list-lock.private { color: var(--warn); }
  .gal-list-lock.public  { color: var(--success); opacity: 0.7; }

  /* ── Privacy toggle in modal ── */
  .gal-privacy-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.65rem 0.875rem; background: var(--bg);
    border: 1px solid var(--border2); border-radius: 8px; cursor: pointer;
    transition: border-color 0.15s;
  }
  .gal-privacy-row:hover { border-color: var(--accent); }
  .gal-privacy-row.private { border-color: rgba(251,191,36,0.4); background: rgba(251,191,36,0.04); }
  .gal-privacy-left { display: flex; align-items: center; gap: 0.6rem; }
  .gal-privacy-icon { color: var(--dim); flex-shrink: 0; }
  .gal-privacy-row.private .gal-privacy-icon { color: var(--warn); }
  .gal-privacy-text { font-size: 0.85rem; font-weight: 500; color: var(--text2); }
  .gal-privacy-row.private .gal-privacy-text { color: var(--warn); }
  .gal-privacy-sub { font-family: 'DM Mono', monospace; font-size: 0.68rem; color: var(--dim); margin-top: 1px; }
  .gal-toggle { position: relative; width: 36px; height: 20px; flex-shrink: 0; }
  .gal-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
  .gal-toggle-track { position: absolute; inset: 0; background: var(--border2); border-radius: 99px; transition: background 0.2s; }
  .gal-toggle input:checked + .gal-toggle-track { background: var(--warn); }
  .gal-toggle-thumb { position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; background: #fff; border-radius: 50%; transition: transform 0.2s; pointer-events: none; }
  .gal-toggle input:checked ~ .gal-toggle-thumb { transform: translateX(16px); }

  /* ── Privacy field in lightbox info panel ── */
  .gal-lb-privacy {
    display: flex; align-items: center; gap: 0.5rem;
    font-size: 0.78rem; font-family: 'DM Mono', monospace;
  }
  .gal-lb-privacy.private { color: var(--warn); }
  .gal-lb-privacy.public  { color: var(--success); opacity: 0.8; }
`;

const IMAGE_TYPES = new Set(["image/jpeg","image/jpg","image/png","image/gif","image/webp"]);

function isImage(file) {
  return IMAGE_TYPES.has(file.content_type) ||
    /\.(jpg|jpeg|png|gif|webp)$/i.test(file.original_filename || "");
}

function FileIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────
function peopleArrayToString(arr) {
  return (arr || []).join(", ");
}

function buildCorpus(files) {
  const set = new Set();
  files.forEach(f => (f.people || []).forEach(p => set.add(p)));
  return [...set];
}

// ── People tag input ───────────────────────────────────────────────────────
function PeopleInput({ value, onChange, corpus }) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const inputRef = useRef();

  const suggestions = input.trim()
    ? corpus.filter(p => p.toLowerCase().includes(input.toLowerCase()) && !value.includes(p))
    : [];

  function addPerson(name) {
    const t = name.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setInput(""); setShowSuggestions(false); setFocusedIdx(-1);
    inputRef.current?.focus();
  }

  function removePerson(name) { onChange(value.filter(p => p !== name)); }

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (focusedIdx >= 0 && suggestions[focusedIdx]) addPerson(suggestions[focusedIdx]);
      else if (input.trim()) addPerson(input);
    } else if (e.key === "Backspace" && !input && value.length) {
      onChange(value.slice(0, -1));
    } else if (e.key === "ArrowDown") {
      e.preventDefault(); setFocusedIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault(); setFocusedIdx(i => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  return (
    <div className="gal-people-wrap">
      <div className="gal-people-box" onClick={() => inputRef.current?.focus()}>
        {value.map(p => (
          <span key={p} className="gal-tag">
            {p}
            <button className="gal-tag-remove" onClick={e => { e.stopPropagation(); removePerson(p); }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="gal-people-input"
          placeholder={value.length === 0 ? "Add a person, press Enter…" : ""}
          value={input}
          onChange={e => { setInput(e.target.value); setShowSuggestions(true); setFocusedIdx(-1); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        />
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="gal-suggestions">
          {suggestions.map((s, i) => {
            const idx = s.toLowerCase().indexOf(input.toLowerCase());
            return (
              <div
                key={s}
                className={`gal-suggestion${i === focusedIdx ? " focused" : ""}`}
                onMouseDown={() => addPerson(s)}
              >
                {s.slice(0, idx)}<mark>{s.slice(idx, idx + input.length)}</mark>{s.slice(idx + input.length)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { Lock, LockOpen } from "lucide-react";

// ── Lock icon helper ────────────────────────────────────────────────────────
function LockIcon({ open = false, size = 13 }) {
  return open
    ? <LockOpen size={size} strokeWidth={3.5} />
    : <Lock     size={size} strokeWidth={3} />;
}

// ── Privacy toggle ─────────────────────────────────────────────────────────
function PrivacyToggle({ value, onChange }) {
  return (
    <div
      className={`gal-privacy-row${value ? " private" : ""}`}
      onClick={() => onChange(!value)}
    >
      <div className="gal-privacy-left">
        <span className="gal-privacy-icon">
          <LockIcon open={!value} size={15} />
        </span>
        <div>
          <div className="gal-privacy-text">{value ? "Private — family only" : "Public — visible to everyone"}</div>
          <div className="gal-privacy-sub">{value ? "Only logged-in users can see this" : "Anyone visiting the site can see this"}</div>
        </div>
      </div>
      <label className="gal-toggle" onClick={e => e.stopPropagation()}>
        <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} />
        <span className="gal-toggle-track" />
        <span className="gal-toggle-thumb" />
      </label>
    </div>
  );
}

// ── Edit Modal ─────────────────────────────────────────────────────────────
function EditModal({ file, corpus, onSave, onClose }) {
  const [date,      setDate]      = useState(file.image_date  || "");
  const [desc,      setDesc]      = useState(file.description || "");
  const [people,    setPeople]    = useState(file.people      || []);
  const [isPrivate, setIsPrivate] = useState(file.is_private  ?? false);
  const [saving,    setSaving]    = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave({ image_date: date, description: desc, people, is_private: isPrivate });
    setSaving(false);
  }

  return (
    <div className="gal-overlay-modal" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="gal-modal">
        <p className="gal-modal-title">Edit details</p>
        <div className="gal-modal-fields">
          <div className="gal-modal-field">
            <label className="gal-modal-label">Date</label>
            <input
              className="gal-modal-input"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div className="gal-modal-field">
            <label className="gal-modal-label">People</label>
            <PeopleInput value={people} onChange={setPeople} corpus={corpus} />
          </div>
          <div className="gal-modal-field">
            <label className="gal-modal-label">Description</label>
            <textarea
              className="gal-modal-textarea"
              placeholder="Add a description…"
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
          </div>
          <div className="gal-modal-field">
            <label className="gal-modal-label">Visibility</label>
            <PrivacyToggle value={isPrivate} onChange={setIsPrivate} />
          </div>
        </div>
        <div className="gal-modal-actions">
          <button className="gal-modal-cancel" onClick={onClose}>Cancel</button>
          <button className="gal-modal-save" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────
function Lightbox({ files, index, onClose, onNav, onEdit, onDelete }) {
  const file = files[index];
  const [confirming, setConfirming] = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [dragX,      setDragX]      = useState(0);   // live swipe offset px
  const touchStart   = useRef(null);
  const SWIPE_THRESHOLD = 50; // px needed to trigger nav

  // Reset confirm + drag state when navigating
  useEffect(() => { setConfirming(false); setDragX(0); }, [index]);

  async function handleDelete() {
    setDeleting(true);
    await onDelete(file.id);
    setDeleting(false);
  }

  // Keyboard nav
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape")     onClose();
      if (e.key === "ArrowRight") onNav(1);
      if (e.key === "ArrowLeft")  onNav(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNav]);

  function onTouchStart(e) {
    touchStart.current = e.touches[0].clientX;
  }

  function onTouchMove(e) {
    if (touchStart.current === null) return;
    const delta = e.touches[0].clientX - touchStart.current;
    // Clamp drag so it doesn't slide too far
    setDragX(Math.max(-120, Math.min(120, delta)));
  }

  function onTouchEnd() {
    if (touchStart.current === null) return;
    if (dragX < -SWIPE_THRESHOLD) onNav(1);
    else if (dragX > SWIPE_THRESHOLD) onNav(-1);
    touchStart.current = null;
    setDragX(0);
  }

  return (
    <div className="gal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="gal-lightbox">

        {/* Image side — swipeable */}
        <div
          className="gal-lb-image-wrap"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {isImage(file) ? (
            <img
              key={file.id}
              className="gal-lb-img"
              src={`/proxy/${file.id}`}
              alt={file.original_filename}
              style={{
                transform: `translateX(${dragX}px)`,
                transition: dragX === 0 ? "transform 0.25s cubic-bezier(0.22,1,0.36,1)" : "none",
                opacity: 1 - Math.abs(dragX) / 300,
              }}
            />
          ) : (
            <div className="gal-lb-placeholder">
              <FileIcon size={48} />
              <span style={{fontFamily:"'DM Mono',monospace", fontSize:"0.75rem", color:"var(--dim)"}}>
                No preview available
              </span>
            </div>
          )}

          <button
            className="gal-lb-arrow prev"
            onClick={() => onNav(-1)}
            disabled={index === 0}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 4l-5 5 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            className="gal-lb-arrow next"
            onClick={() => onNav(1)}
            disabled={index === files.length - 1}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M7 4l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Info panel */}
        <div className="gal-lb-info">
          <div className="gal-lb-info-head">
            <span className="gal-lb-filename">{file.original_filename}</span>
            <button className="gal-lb-close" onClick={onClose} title="Close (Esc)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div className="gal-lb-meta">
            <div className="gal-lb-field">
              <span className="gal-lb-key">Date</span>
              <span className={`gal-lb-val${!file.image_date ? " unknown" : ""}`}>
                {file.image_date || "Unknown"}
              </span>
            </div>

            {(file.people || []).length > 0 && (
              <div className="gal-lb-field">
                <span className="gal-lb-key">People</span>
                <span className="gal-lb-val">
                  {file.people.map(p => (
                    <span key={p} className="gal-lb-pill">{p}</span>
                  ))}
                </span>
              </div>
            )}

            {file.description && (
              <div className="gal-lb-field">
                <span className="gal-lb-key">Description</span>
                <span className="gal-lb-val">{file.description}</span>
              </div>
            )}

            <div className="gal-lb-field">
              <span className="gal-lb-key">Type</span>
              <span className="gal-lb-val">{file.content_type || "—"}</span>
            </div>

            <div className="gal-lb-field">
              <span className="gal-lb-key">Visibility</span>
              <span className={`gal-lb-privacy ${file.is_private ? "private" : "public"}`}>
                <LockIcon open={!file.is_private} size={11} />
                &nbsp;{file.is_private ? "Private" : "Public"}
              </span>
            </div>
          </div>

          <div className="gal-lb-counter">
            {confirming ? (
              <div className="gal-lb-confirm">
                <span className="gal-lb-confirm-text">Delete permanently?</span>
                <button
                  className="gal-lb-confirm-yes"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
                <button className="gal-lb-confirm-no" onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <span>{index + 1} / {files.length}</span>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <button className="gal-lb-edit-btn" onClick={() => onEdit(file)}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M8.5 1.5l2 2L3.5 11H1.5V9L8.5 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                    </svg>
                    Edit
                  </button>
                  <button className="gal-lb-delete-btn" onClick={() => setConfirming(true)}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 3.5h8M4.5 3.5V2.5h3v1M5 5.5v3.5M7 5.5v3.5M2.5 3.5l.75 6.5h5.5l.75-6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function ImageGallery() {
  const [view,        setView]        = useState("grid");
  const [search,      setSearch]      = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterPerson,   setFilterPerson]   = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo,   setFilterDateTo]   = useState("");
  const [lightboxIdx,    setLightboxIdx]     = useState(null);
  const [editingFile,    setEditingFile]     = useState(null);
  const [currentUser,    setCurrentUser]     = useState(undefined);

  const queryClient = useQueryClient();
  const queryKey = ["files", currentUser ? "authed" : "public"];

  useEffect(() => {
    import("firebase/auth").then(({ getAuth, onAuthStateChanged }) => {
      const auth = getAuth();
      const unsub = onAuthStateChanged(auth, user => setCurrentUser(user ?? null));
      return unsub;
    }).catch(() => setCurrentUser(null));
  }, []);

  const { data: files = [], isLoading: loading } = useQuery({
    queryKey,
    queryFn: async () => {
      const endpoint = currentUser ? "/api/files" : "/api/public/files";
      const res = await api.get(endpoint);
      return (res.data.files || []).sort((a, b) => {
        const ta = a.uploaded_at?._seconds || 0;
        const tb = b.uploaded_at?._seconds || 0;
        return tb - ta;
      });
    },
    enabled: currentUser !== undefined,
    staleTime: 5 * 60 * 1000,
  });

  const hasFilters = filterPerson || filterDateFrom || filterDateTo;
  const corpus = buildCorpus(files);

  // PATCH /api/files/:id — one request per field including is_private
  async function saveEdit(fileId, patch) {
    const updates = [
      { field: "image_date",  value: patch.image_date  || "" },
      { field: "people",      value: peopleArrayToString(patch.people) },
      { field: "description", value: patch.description || "" },
      { field: "is_private",  value: String(patch.is_private ?? false) },
    ];
    await Promise.all(updates.map(u =>
      api.patch(`/api/files/${fileId}`, u).catch(() => {})
    ));
    queryClient.setQueryData(queryKey, prev =>
      (prev || []).map(f => f.id === fileId ? { ...f, ...patch } : f)
    );
    setEditingFile(null);
  }

  // DELETE /api/files/:id — removes from GCS + Firestore, then local state
  async function deleteFile(fileId) {
    try {
      await api.delete(`/api/files/${fileId}`);
    } catch (err) {
      console.error("Delete failed:", err);
    }
    const remaining = files.filter(f => f.id !== fileId);
    queryClient.setQueryData(queryKey, remaining);
    // If we just deleted the last item close the lightbox,
    // otherwise clamp the index so we don't go out of bounds
    setLightboxIdx(prev => {
      if (prev === null) return null;
      if (remaining.length === 0) return null;
      return Math.min(prev, remaining.length - 1);
    });
  }
  const filtered = files.filter(f => {
    const q = search.toLowerCase();
    if (q) {
      const hay = `${f.original_filename || ""} ${f.description || ""} ${(f.people || []).join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filterPerson) {
      const match = (f.people || []).some(p => p.toLowerCase().includes(filterPerson.toLowerCase()));
      if (!match) return false;
    }
    if (filterDateFrom && f.image_date && f.image_date < filterDateFrom) return false;
    if (filterDateTo   && f.image_date && f.image_date > filterDateTo)   return false;
    return true;
  });

  function clearFilters() {
    setSearch(""); setFilterPerson(""); setFilterDateFrom(""); setFilterDateTo("");
  }

  const openLightbox = useCallback((idx) => setLightboxIdx(idx), []);

  const navigate = useCallback((delta) => {
    setLightboxIdx(i => {
      const next = i + delta;
      if (next < 0 || next >= filtered.length) return i;
      return next;
    });
  }, [filtered.length]);

  const closeLightbox = useCallback(() => setLightboxIdx(null), []);

  return (
    <>
      <style>{STYLES}</style>

      {lightboxIdx !== null && filtered.length > 0 && (
        <Lightbox
          files={filtered}
          index={lightboxIdx}
          onClose={closeLightbox}
          onNav={navigate}
          onEdit={file => setEditingFile(file)}
          onDelete={deleteFile}
        />
      )}

      {editingFile && (
        <EditModal
          file={editingFile}
          corpus={corpus}
          onSave={patch => saveEdit(editingFile.id, patch)}
          onClose={() => setEditingFile(null)}
        />
      )}

      <section className="gal-root">
        <div className="gal-inner">

          {/* Header */}
          <div className="gal-header">
            <div className="gal-eyebrow">Archive</div>
            <h1 className="gal-title">Photo Gallery</h1>
            <p className="gal-subtitle">Browse and explore your uploaded files</p>
          </div>

          {/* Toolbar */}
          <div className="gal-toolbar">
            <div className="gal-search-wrap">
              <svg className="gal-search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M9.5 9.5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <input
                className="gal-search"
                placeholder="Search name, person, description…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <button
              className={`gal-filter-btn${showFilters || hasFilters ? " active" : ""}`}
              onClick={() => setShowFilters(v => !v)}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M1 2.5h11M3 6.5h7M5 10.5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Filters{hasFilters ? " ·" : ""}
            </button>

            <div className="gal-view-btns">
              <button className={`gal-view-btn${view === "grid" ? " active" : ""}`} onClick={() => setView("grid")} title="Grid view">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="1" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                  <rect x="8" y="1" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                  <rect x="1" y="8" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                  <rect x="8" y="8" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                </svg>
              </button>
              <button className={`gal-view-btn${view === "list" ? " active" : ""}`} onClick={() => setView("list")} title="List view">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M5 3h8M5 7h8M5 11h8M1.5 3h.5M1.5 7h.5M1.5 11h.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="gal-filters">
              <div className="gal-filter-field">
                <label className="gal-filter-label">Person</label>
                <input
                  className="gal-filter-input"
                  placeholder="e.g. Jane"
                  value={filterPerson}
                  onChange={e => setFilterPerson(e.target.value)}
                />
              </div>
              <div className="gal-filter-field">
                <label className="gal-filter-label">Date from</label>
                <input
                  className="gal-filter-input"
                  type="date"
                  value={filterDateFrom}
                  onChange={e => setFilterDateFrom(e.target.value)}
                />
              </div>
              <div className="gal-filter-field">
                <label className="gal-filter-label">Date to</label>
                <input
                  className="gal-filter-input"
                  type="date"
                  value={filterDateTo}
                  onChange={e => setFilterDateTo(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Count + clear */}
          <div className="gal-count-bar">
            <span className="gal-count">
              {loading ? "Loading…" : `${filtered.length} of ${files.length} file${files.length !== 1 ? "s" : ""}`}
            </span>
            {(search || hasFilters) && (
              <button className="gal-clear-btn" onClick={clearFilters}>Clear filters</button>
            )}
          </div>

          {/* Content */}
          {loading ? (
            <div className="gal-spinner" />
          ) : filtered.length === 0 ? (
            <div className="gal-empty">
              {search || hasFilters ? "no results" : "no files yet"}
            </div>
          ) : view === "grid" ? (
            <div className="gal-grid">
              {filtered.map((file, idx) => (
                <div
                  key={file.id}
                  className="gal-card"
                  style={{ animationDelay: `${Math.min(idx * 40, 400)}ms` }}
                  onClick={() => openLightbox(idx)}
                >
                  {isImage(file) ? (
                    <img
                      className="gal-card-thumb"
                      src={`/proxy/${file.id}`}
                      alt={file.original_filename}
                      loading="lazy"
                    />
                  ) : (
                    <div className="gal-card-thumb-placeholder">
                      <FileIcon size={28} />
                    </div>
                  )}
                  {/* Lock badge — shown on all cards, locked=private, unlocked=public */}
                  <div className={`gal-lock ${file.is_private ? "private" : "public"}`} title={file.is_private ? "Private" : "Public"}>
                    <LockIcon open={!file.is_private} size={12} />
                  </div>
                  <div className="gal-card-body">
                    {file.description && (
                      <div className="gal-card-desc">{file.description}</div>
                    )}
                    <div className="gal-card-meta">
                      <span className={`gal-card-date${!file.image_date ? " unknown" : ""}`}>
                        {file.image_date || "unknown"}
                      </span>
                      {(file.people || []).length > 0 && (
                        <span className="gal-card-people">
                          {file.people.length} person{file.people.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="gal-grid list">
              {filtered.map((file, idx) => (
                <div
                  key={file.id}
                  className="gal-list-row"
                  style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                  onClick={() => openLightbox(idx)}
                >
                  {isImage(file) ? (
                    <img
                      className="gal-list-thumb"
                      src={`/proxy/${file.id}`}
                      alt={file.original_filename}
                      loading="lazy"
                    />
                  ) : (
                    <div className="gal-list-thumb-placeholder">
                      <FileIcon size={18} />
                    </div>
                  )}
                  <div className="gal-list-info">
                    {file.description && (
                      <div className="gal-list-name">{file.description}</div>
                    )}
                    <div className="gal-list-meta">
                      <span className={`gal-list-date${!file.image_date ? " unknown" : ""}`}>
                        {file.image_date || "unknown"}
                      </span>
                      {(file.people || []).length > 0 && (
                        <span className="gal-list-people">
                          {file.people.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`gal-list-lock ${file.is_private ? "private" : "public"}`} title={file.is_private ? "Private" : "Public"}>
                    <LockIcon open={!file.is_private} size={14} />
                  </span>
                </div>
              ))}
            </div>
          )}

        </div>
      </section>
    </>
  );
}
