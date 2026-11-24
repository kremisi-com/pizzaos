"use client";

import type { WeeklyOrderDay, WeeklyOrderSchedule, WeeklyOrderWindow } from "@pizzaos/domain";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAdminToast } from "../../../composition/admin-toast";
import styles from "./weekly-order-calendar.module.css";

const dayNames = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
const maximumCapacity = 10000;

function time(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function minuteFromTime(value: string) {
  const trimmed = value.trim();
  if (!/^(?:[01]?\d|2[0-3]):[0-5]\d$|^24:00$/.test(trimmed)) return NaN;
  const [hours, minutes] = trimmed.split(":").map(Number);
  return hours! * 60 + minutes!;
}

type Edit = { weekday: number } & (
  { kind: "boundary"; minute: number } |
  { kind: "split"; index: number } |
  { kind: "add" }
);

function sortWindows(windows: WeeklyOrderWindow[]) {
  return [...windows].sort((a, b) => a.startMinute - b.startMinute);
}

function firstGap(windows: WeeklyOrderWindow[]) {
  const preferredStart = windows.at(-1)?.endMinute ?? 660;
  if (preferredStart < 1440) return preferredStart;
  let end = 0;
  for (const window of windows) {
    if (window.startMinute > end) return end;
    end = window.endMinute;
  }
  return 1440;
}

function CalendarEdit({ edit, day, onUpdate, onClose }: {
  edit: Edit;
  day: WeeklyOrderDay;
  onUpdate: (windows: WeeklyOrderWindow[]) => void;
  onClose: () => void;
}) {
  const windows = day.windows;
  const left = edit.kind === "boundary" ? windows.find(window => window.endMinute === edit.minute) : undefined;
  const right = edit.kind === "boundary" ? windows.find(window => window.startMinute === edit.minute) : undefined;
  const split = edit.kind === "split" ? windows[edit.index] : undefined;
  const gap = firstGap(windows);
  const nextStart = windows.find(window => window.startMinute >= gap)?.startMinute ?? 1440;
  const initial = edit.kind === "boundary" ? edit.minute : split ? Math.ceil((split.startMinute + split.endMinute) / 2) : gap;
  const [start, setStart] = useState(time(initial));
  const [end, setEnd] = useState(time(Math.min(gap + 60, nextStart)));
  const showToast = useAdminToast();
  const firstInput = useRef<HTMLInputElement>(null);
  useEffect(() => { firstInput.current?.focus(); }, []);

  function save() {
    const startMinute = minuteFromTime(start);
    const endMinute = minuteFromTime(end);
    let changed: WeeklyOrderWindow[];
    if (edit.kind === "add") {
      if (!(startMinute < endMinute)) { showToast("Inserisci inizio e fine nel formato HH:MM.", "error"); return; }
      changed = [...windows, { startMinute, endMinute, capacity: 5 }];
    } else if (split) {
      if (!(startMinute > split.startMinute && startMinute < split.endMinute)) {
        showToast("Il separatore deve essere all’interno della fascia.", "error"); return;
      }
      const firstCapacity = Math.ceil(split.capacity * (startMinute - split.startMinute) / (split.endMinute - split.startMinute));
      changed = windows.flatMap(window => window === split ? [
        { ...split, endMinute: startMinute, capacity: firstCapacity },
        { ...split, startMinute, capacity: split.capacity - firstCapacity }
      ] : [window]);
    } else {
      if (!Number.isFinite(startMinute)) { showToast("Inserisci un orario nel formato HH:MM.", "error"); return; }
      changed = windows.map(window => window === left ? { ...window, endMinute: startMinute }
        : window === right ? { ...window, startMinute } : window);
    }
    const sorted = sortWindows(changed);
    if (sorted.some((window, index) => window.endMinute <= window.startMinute ||
      window.startMinute < (sorted[index - 1]?.endMinute ?? 0))) {
      showToast("Le fasce devono avere una durata positiva e non possono sovrapporsi.", "error"); return;
    }
    onUpdate(sorted);
  }

  function merge() {
    if (!left || !right) return;
    if (left.capacity + right.capacity > maximumCapacity) {
      showToast("Una fascia può accettare al massimo 10.000 ordini.", "error"); return;
    }
    onUpdate(windows.flatMap(window => window === left
      ? [{ ...left, endMinute: right.endMinute, capacity: left.capacity + right.capacity }]
      : window === right ? [] : [window]));
  }

  const heading = edit.kind === "add" ? "Aggiungi fascia" : edit.kind === "split" ? "Dividi fascia" : "Modifica separatore";
  return <section className={styles.editor} aria-label={`${heading}, ${dayNames[day.weekday - 1]}`}>
    <strong>{heading} · {dayNames[day.weekday - 1]}</strong>
    <div className={styles.editorFields}>
      <label>{edit.kind === "add" ? "Inizio" : "Orario del separatore"}
        <input ref={firstInput} type="text" placeholder="HH:MM" value={start} onChange={event => setStart(event.target.value)}
          onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); save(); } }} />
      </label>
      {edit.kind === "add" && <label>Fine<input type="text" placeholder="HH:MM" value={end} onChange={event => setEnd(event.target.value)}
        onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); save(); } }} /></label>}
    </div>
    <div className={styles.controls}>
      <button type="button" onClick={save}>Applica</button>
      {left && right && <button type="button" onClick={merge}>Elimina separatore e unisci</button>}
      <button type="button" onClick={onClose}>Annulla</button>
    </div>
  </section>;
}

function calendarBoundaries(days: WeeklyOrderDay[]) {
  const boundaries = [...new Set(days.flatMap(day => day.windows.flatMap(window => [window.startMinute, window.endMinute])))];
  const firstHour = Math.floor(Math.min(660, ...boundaries) / 60) * 60;
  const lastHour = Math.ceil(Math.max(1320, ...boundaries) / 60) * 60;
  for (let hour = firstHour; hour <= lastHour; hour += 60) boundaries.push(hour);
  return [...new Set(boundaries)].sort((a, b) => a - b);
}

export function WeeklyOrderCalendar({ schedule, protectedDates, timeZone, onChange }: {
  schedule: WeeklyOrderSchedule;
  protectedDates: string[];
  timeZone: string;
  onChange: (schedule: WeeklyOrderSchedule) => void;
}) {
  const showToast = useAdminToast();
  const [edit, setEdit] = useState<Edit | null>(null);
  const [source, setSource] = useState(1);
  const opener = useRef<HTMLButtonElement | null>(null);
  const addButtons = useRef(new Map<number, HTMLButtonElement>());
  const activeDay = schedule.days.find(day => day.weekday === edit?.weekday);
  const boundaries = useMemo(() => calendarBoundaries(schedule.days), [schedule.days]);
  const rows = new Map(boundaries.map((minute, index) => [minute, index + 2]));
  const occupiedMinutes = new Uint8Array(1440);
  for (const day of schedule.days) {
    for (const window of day.windows) occupiedMinutes.fill(1, window.startMinute, window.endMinute);
  }
  const tracks = boundaries.slice(1).map((minute, index) => {
    const start = boundaries[index]!;
    return `minmax(${occupiedMinutes[start] ? Math.max(46, (minute - start) * 0.8) : 24}px, auto)`;
  });

  function setWindows(weekday: number, windows: WeeklyOrderWindow[]) {
    onChange({ ...schedule, days: schedule.days.map(day => day.weekday === weekday ? { weekday, windows } : day) });
  }

  function open(nextEdit: Edit, button: HTMLButtonElement) {
    opener.current = button;
    setEdit(nextEdit);
  }

  function close() {
    const weekday = edit?.weekday;
    const button = opener.current;
    setEdit(null);
    requestAnimationFrame(() => {
      if (button?.isConnected) button.focus();
      else if (weekday) addButtons.current.get(weekday)?.focus();
    });
  }

  function copyWeek() {
    const windows = schedule.days.find(day => day.weekday === source)?.windows ?? [];
    onChange({ ...schedule, days: schedule.days.map(day => ({ weekday: day.weekday, windows: windows.map(window => ({ ...window })) })) });
    setEdit(null);
    showToast(`Orari di ${dayNames[source - 1]} copiati su tutta la settimana.`, "info");
  }

  return <>
    <p>Settimana tipo · {timeZone}. Ogni ordine occupa un posto.</p>
    {protectedDates.length > 0 && <span className={styles.visuallyHidden}>
      Orari precedenti mantenuti per le date già prenotate: {protectedDates.map(date =>
        new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeZone: "UTC" }).format(new Date(date))).join(", ")}.
    </span>}
    <div className={styles.controls}>
      <label>Copia orari di <select value={source} onChange={event => setSource(Number(event.target.value))}>
        {dayNames.map((day, index) => <option key={day} value={index + 1}>{day}</option>)}
      </select></label>
      <button type="button" onClick={copyWeek}>Applica a tutta la settimana</button>
    </div>
    {edit && activeDay && <CalendarEdit key={JSON.stringify(edit)} edit={edit} day={activeDay}
      onUpdate={windows => { setWindows(activeDay.weekday, windows); close(); }} onClose={close} />}
    <div className={styles.scroll} role="region" aria-label="Griglia della settimana tipo" tabIndex={0}>
      <div className={styles.grid} style={{ gridTemplateRows: `auto ${tracks.join(" ")} 1rem` }}>
        <span className={styles.heading}>Ora</span>
        {boundaries.filter(minute => minute % 60 === 0).map(minute => <span key={minute} className={styles.hour}
          style={{ gridColumn: 1, gridRow: rows.get(minute) }}>{time(minute)}</span>)}
        {schedule.days.map(day => {
          const name = dayNames[day.weekday - 1];
          const column = day.weekday + 1;
          const separators = [...new Set(day.windows.flatMap(window => [window.startMinute, window.endMinute]))];
          return <div className={styles.day} key={day.weekday}>
            <div className={styles.heading} style={{ gridColumn: column, gridRow: 1 }}>
              <strong>{name}</strong>
              <button type="button" aria-label={`Aggiungi fascia, ${name}`} ref={button => {
                if (button) addButtons.current.set(day.weekday, button);
                else addButtons.current.delete(day.weekday);
              }} onClick={event =>
                open({ kind: "add", weekday: day.weekday }, event.currentTarget)}>Aggiungi fascia</button>
            </div>
            {day.windows.map((window, index) => {
              const range = `${time(window.startMinute)}–${time(window.endMinute)}`;
              return <div className={styles.window} key={window.startMinute} style={{
                gridColumn: column, gridRow: `${rows.get(window.startMinute)} / ${rows.get(window.endMinute)}`
              }}>
                <label><span>{range}</span>
                  <input type="number" min={0} max={maximumCapacity} step={1} required value={window.capacity}
                    aria-label={`Massimo ordini, ${name} ${range}`}
                    onChange={event => setWindows(day.weekday, day.windows.map(item =>
                      item === window ? { ...item, capacity: Number(event.target.value) } : item))} />
                </label>
                <div className={styles.windowActions}>
                  <button type="button" aria-label={`Dividi fascia, ${name} ${range}`} title="Dividi fascia" disabled={window.endMinute - window.startMinute < 2}
                    onClick={event => open({ kind: "split", weekday: day.weekday, index }, event.currentTarget)}>÷</button>
                  <button type="button" aria-label={`Rimuovi fascia, ${name} ${range}`} title="Rimuovi fascia"
                    onClick={() => { setEdit(null); setWindows(day.weekday, day.windows.filter(item => item !== window)); }}>×</button>
                </div>
              </div>;
            })}
            {separators.map(minute => <button type="button" key={minute} className={styles.separator}
              aria-label={`Modifica separatore, ${name} ${time(minute)}`} title={`Modifica separatore delle ${time(minute)}`}
              style={{ gridColumn: column, gridRow: rows.get(minute) }}
              onClick={event => open({ kind: "boundary", weekday: day.weekday, minute }, event.currentTarget)} />)}
          </div>;
        })}
      </div>
    </div>
  </>;
}
